// app/api/auth/github/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_code } = body

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      if (tokenData.error === 'authorization_pending') {
        return NextResponse.json({ error: tokenData.error }, { status: 202 })
      }
      return NextResponse.json({ error: tokenData.error_description || tokenData.error }, { status: 400 })
    }

    // Fetch user information using the access token
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const userData = await userResponse.json()

    // Check if the user is the repo creator
    if (userData.login === process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN) {
      console.log('Authorized user:', userData.login)
      return NextResponse.json({ 
        access_token: tokenData.access_token,
        user: {
          name: userData.login,
          image: userData.avatar_url
        }
      }, { status: 200 })
    } else {
      return NextResponse.json({ error: 'Unauthorized user' }, { status: 403 })
    }
  } catch (error) {
    console.error('Error in GitHub callback:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}