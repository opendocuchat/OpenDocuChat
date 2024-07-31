'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export default function SignIn() {
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<string>('Not authenticated')
  const { data: session, status, update } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      setAuthStatus(`Authenticated as ${session.user?.name || session.user?.email}`)
    } else if (status === 'loading') {
      setAuthStatus('Checking authentication status...')
    } else {
      setAuthStatus('Not authenticated')
      initiateDeviceFlow()
    }
  }, [session, status])

  const initiateDeviceFlow = async () => {
    try {
      const res = await fetch('/api/auth/device-code', {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error(`API responded with status: ${res.status}`)
      }
      const data: DeviceCode = await res.json()
      setDeviceCode(data)
    } catch (err) {
      console.error('Error initiating device flow:', err)
      setError('Failed to initiate device flow. Please try again.')
    }
  }

  const checkAuthStatus = async () => {
    if (status === 'authenticated') {
      setAuthStatus(`Already authenticated as ${session?.user?.name || session?.user?.email}`)
      return
    }

    setAuthStatus('Checking authentication...')
    if (deviceCode) {
      try {
        const result = await fetch('/api/auth/callback/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_code: deviceCode.device_code }),
        })
        const data = await result.json()
        if (data.error) {
          if (data.error === 'authorization_pending') {
            setAuthStatus('Waiting for user authorization...')
          } else {
            setError(`Authentication failed: ${data.error}`)
            setAuthStatus('Authentication failed')
          }
        } else {
          setAuthStatus('Authentication successful, updating session...')
          await update()
        }
      } catch (error) {
        console.error('Error during authentication:', error)
        setError('Authentication failed. Please try again.')
        setAuthStatus('Authentication failed')
      }
    } else {
      setError('No device code available. Please refresh the page.')
    }
  }

  return (
    <div>
      {!session && deviceCode && (
        <>
          <p>Enter this code at {deviceCode.verification_uri}</p>
          <p>{deviceCode.user_code}</p>
        </>
      )}
      <button onClick={checkAuthStatus}>Check Authentication Status</button>
      <p>Current status: {authStatus}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {session && (
        <div>
          <h2>Session Info:</h2>
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}