'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'

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
  const { data: session, status } = useSession()

  useEffect(() => {
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

    initiateDeviceFlow()
  }, [])

  useEffect(() => {
    console.log('Session status:', status)
    console.log('Session data:', session)
    
    if (status === 'authenticated' && session) {
      setAuthStatus(`Authenticated as ${session.user?.name || session.user?.email}`)
    } else if (status === 'loading') {
      setAuthStatus('Checking authentication status...')
    } else {
      setAuthStatus('Not authenticated')
    }
  }, [session, status])

  const checkAuthStatus = async () => {
    setAuthStatus('Checking authentication...')
    const result = await signIn('github', { redirect: false })
    console.log('Sign in result:', result)
    
    if (result?.error) {
      console.error('Authentication failed:', result.error)
      setError(`Authentication failed: ${result.error}`)
      setAuthStatus('Authentication failed')
    } else if (result?.ok) {
      console.log('Authentication successful')
      setAuthStatus('Authentication successful, refreshing session...')
    }
  }

  if (error) {
    return <p>Error: {error}</p>
  }

  return (
    <div>
      {deviceCode && (
        <>
          <p>Enter this code at {deviceCode.verification_uri}</p>
          <p>{deviceCode.user_code}</p>
        </>
      )}
      <button onClick={checkAuthStatus}>Check Authentication Status</button>
      <p>Current status: {authStatus}</p>
      {session && (
        <div>
          <h2>Session Info:</h2>
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}