// import { NextRequest, NextResponse } from "next/server"
// import { Ratelimit } from "@upstash/ratelimit"
// import { kv } from "@vercel/kv"

// const ratelimit = new Ratelimit({
//   redis: kv,
//   limiter: Ratelimit.slidingWindow(20, "1 m"),
// })

// const allowedOrigins = ['http://localhost:3000', 'http://localhost:1313', 'https://tools.quicksave.fi']

// function setCORSHeaders(request: NextRequest, response: NextResponse) {
//   const origin = request.headers.get('origin')
//   if (origin && allowedOrigins.includes(origin)) {
//     response.headers.set('Access-Control-Allow-Origin', origin)
//   }
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
//   response.headers.set('Access-Control-Max-Age', '86400')
// }

// export const config = {
//   matcher: ['/api/:path*'],
// }

// export default async function middleware(request: NextRequest) {
//   const response = NextResponse.next()

//   // TODO: Extract parts to functions to avoid code comments

//   // Handle CORS preflight requests
//   if (request.method === 'OPTIONS') {
//     const preflightResponse = new NextResponse(null, { status: 204 })
//     setCORSHeaders(request, preflightResponse)
//     return preflightResponse
//   }

//   setCORSHeaders(request, response)

//   // Rate limiting logic
//   const ip = request.ip ?? '127.0.0.1'
//   const { success } = await ratelimit.limit(ip)
  
//   if (!success) {
//     return new NextResponse('Too Many Requests', { status: 429 })
//   }

//   return response
// }