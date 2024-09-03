// app/login/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export default function SignInPage() {
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status, update } = useSession();

  const initiateDeviceFlow = async () => {
    try {
      const res = await fetch("/api/auth/github/device-code", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`API responded with status: ${res.status}`);
      const data: DeviceCode = await res.json();
      setDeviceCode(data);
      setIsPolling(true);
      setError(null);
    } catch (err) {
      console.error("Error initiating device flow:", err);
      setError("Failed to initiate device flow. Please try again.");
    }
  };

  const pollForAuthentication = useCallback(
    async (attempt: number) => {
      if (!deviceCode) return;

      try {
        const result = await signIn("credentials", {
          redirect: false,
          device_code: deviceCode.device_code,
        });

        if (result?.error) {
          if (
            result.error === "CredentialsSignin" ||
            result.error.includes("authorization_pending")
          ) {
            return false;
          }
          throw new Error(result.error);
        }

        if (!result?.error) {
          await update();
          setDeviceCode(null);
          window.location.href = "/";
          return true;
        }
      } catch (error) {
        console.error("Error during authentication:", error);
        setError(
          `Authentication failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return true;
      }
    },
    [deviceCode, update]
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isPolling && deviceCode) {
      const pollWithBackoff = async (attempt: number) => {
        if (!isPolling) return;

        const shouldStopPolling = await pollForAuthentication(attempt);
        if (shouldStopPolling) {
          setIsPolling(false);
          setDeviceCode(null);
        } else {
          const nextInterval = 6000;
          timeoutId = setTimeout(
            () => pollWithBackoff(attempt + 1),
            nextInterval
          );
        }
      };

      pollWithBackoff(1);

      const expirationTimeout = setTimeout(() => {
        setIsPolling(false);
        setDeviceCode(null);
        setError("Device code expired. Please try again.");
      }, deviceCode.expires_in * 1000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(expirationTimeout);
      };
    }
  }, [isPolling, deviceCode, pollForAuthentication]);

  const handleSignIn = () => {
    initiateDeviceFlow();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        alert("Code copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Sign In</h1>

        {status === "authenticated" ? (
          <div className="text-center">
            <p>Signed in as {session?.user?.name}</p>
            <p className="mb-4">
              Session expires at {new Date(session.expires).toLocaleString()}
            </p>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full px-4 py-2 text-white bg-gray-800 rounded hover:bg-gray-700"
            disabled={isPolling}
          >
            {isPolling ? "Signing in..." : "Sign in with GitHub"}
          </button>
        )}

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {deviceCode && (
          <div className="mt-4 p-4 border border-gray-300 rounded">
            <h2 className="mb-2 text-lg font-semibold">
              Enter this code on GitHub
            </h2>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xl font-bold">{deviceCode.user_code}</p>
              <button
                onClick={() => copyToClipboard(deviceCode.user_code)}
                className="px-2 py-1 ml-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Copy Code
              </button>
            </div>
            <a
              href={deviceCode.verification_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-2 text-blue-500 hover:underline"
            >
              Click here to open GitHub
            </a>
            <p className="text-sm text-gray-600">
              Waiting for authentication... This page will update
              automatically once you&apos;re signed in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}