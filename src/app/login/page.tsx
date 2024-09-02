"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from "next-auth/react";
import { providerMap } from "@/auth";

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export default function SignInPage() {
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>("Not authenticated");
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      setAuthStatus(`Authenticated as ${session.user?.name}`);
    } else if (status === "loading") {
      setAuthStatus("Checking authentication status...");
    } else {
      setAuthStatus("Not authenticated");
      initiateDeviceFlow();
    }
  }, [session, status]);

  const initiateDeviceFlow = async () => {
    try {
      const res = await fetch("/api/auth/github/device-code", { method: "POST" });
      if (!res.ok) throw new Error(`API responded with status: ${res.status}`);
      const data: DeviceCode = await res.json();
      setDeviceCode(data);
    } catch (err) {
      console.error("Error initiating device flow:", err);
      setError("Failed to initiate device flow. Please try again.");
    }
  };

  const handleSignIn = async (providerId: string) => {
    setAuthStatus("Authenticating...");
    try {
      if (providerId === "credentials" && deviceCode) {
        const result = await signIn("credentials", {
          redirect: false,
          device_code: deviceCode.device_code,
        });
        if (result?.error) throw new Error(result.error);
      } else {
        await signIn(providerId);
      }
      await update();
    } catch (error) {
      console.error("Error during authentication:", error);
      setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAuthStatus("Authentication failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Sign In</h1>
        
        {!session && deviceCode && (
          <div className="mb-6 text-center">
            <p className="mb-2">To sign in with GitHub Device Flow:</p>
            <a
              href={deviceCode.verification_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Enter this code at {deviceCode.verification_uri}
            </a>
            <p className="mt-2 text-xl font-bold">{deviceCode.user_code}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={() => handleSignIn("credentials")}
            className="px-4 py-2 text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Sign in with GitHub Device Flow
          </button>

          {Object.values(providerMap).map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSignIn(provider.id)}
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-400"
            >
              Sign in with {provider.name}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-red-500">{error}</p>}
        <p className="mt-4 text-center text-gray-600">{authStatus}</p>

        {session && (
          <div className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Session Info:</h2>
            <pre className="p-2 bg-gray-100 rounded">{JSON.stringify(session, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}