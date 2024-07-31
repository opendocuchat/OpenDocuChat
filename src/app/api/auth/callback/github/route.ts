import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_code } = body

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.AUTH_GITHUB_ID,
        device_code: device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    })

    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ error: data.error_description || data.error }, { status: 400 })
    } else {
      // ToDo: Create a session or JWT
      // For simplicity, we're just returning the access token
      return NextResponse.json({ access_token: data.access_token }, { status: 200 })
    }
  } catch (error) {
    console.error('Error in GitHub callback:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}