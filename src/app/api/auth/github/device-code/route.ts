// app/api/auth/github/device-code/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.AUTH_GITHUB_ID,
      })
    })
    
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in device code API:', error)
    return NextResponse.json({ error: 'Failed to obtain device code' }, { status: 500 })
  }
}