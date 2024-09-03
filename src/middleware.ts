// import { auth } from "@/auth"
// import { NextResponse } from "next/server"
// import { Ratelimit } from "@upstash/ratelimit"
// import { kv } from "@vercel/kv"

// const ratelimit = new Ratelimit({
//   redis: kv,
//   limiter: Ratelimit.slidingWindow(20, "1 m"),
// })

// const publicPaths = ['/signin', '/widget', '/api/chat', '/api/search', '/api/auth/:path*'];
// const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET
// const allowedOrigins = [
//   /^http:\/\/localhost:\d+$/,
//   'https://your-production-domain.com',
// ]
// // TODO: add production domain

// function setCORSHeaders(request: Request, response: NextResponse) {
//   const origin = request.headers.get('origin')
//   if (origin && allowedOrigins.includes(origin)) {
//     response.headers.set('Access-Control-Allow-Origin', origin)
//   }
//   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
//   response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
//   response.headers.set('Access-Control-Max-Age', '86400')
// }

// export default auth(async (req) => {
//   const { nextUrl } = req
//   const isLoggedIn = !!req.auth

//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     const response = new NextResponse(null, { status: 204 })
//     setCORSHeaders(req, response)
//     return response
//   }

//   // Allow access to public files
//   if (nextUrl.pathname.startsWith('/_next') || nextUrl.pathname.startsWith('/public')) {
//     return NextResponse.next()
//   }

//   // Check if the path is public
//   const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path))

//   // Apply rate limiting for public API routes
//   if (publicPaths.includes(nextUrl.pathname)) {
//       const ip = req.ip ?? '127.0.0.1'
//       const { success } = await ratelimit.limit(ip)
      
//       if (!success) {
//         return new NextResponse('Too Many Requests', { status: 429 })
//       }
//     }

//   // // TODO: make /api/search only internally accessible
// //   if (nextUrl.pathname.startsWith('/api/search')) {
// //     const apiSecret = req.headers.get('x-internal-api-secret')
// //     if (apiSecret === INTERNAL_API_SECRET) {
// //       const response = NextResponse.next()
// //       setCORSHeaders(req, response)
// //       return response
// //     }
// //     // If not internal request, require authentication
// //     if (!isLoggedIn) {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// //     }
// //   }

//   if (isPublicPath) {
//     const response = NextResponse.next()
//     setCORSHeaders(req, response)
//     return response
//   }

//   // Redirect to login if not authenticated and trying to access a protected route
//   if (!isLoggedIn && !nextUrl.pathname.startsWith('/signin')) {
//     return NextResponse.redirect(new URL('/signin', nextUrl))
//   }

//   // Redirect to home if authenticated and trying to access signin page
//   if (isLoggedIn && nextUrl.pathname.startsWith('/signin')) {
//     return NextResponse.redirect(new URL('/', nextUrl))
//   }

//   // Allow access to protected routes for authenticated users
//   const response = NextResponse.next()
//   setCORSHeaders(req, response)
//   return response
// })

// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
// }



import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/signin')

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (!isAuthenticated && !isAuthPage) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}




// // // temp version handled by nextauth
// export { auth as middleware } from "@/auth"
// // // ToDo: combine with middleware that handles CORS and rate limiting

// // // working prior version with CORS and rate limiting

// import { NextRequest, NextResponse } from "next/server"
// import { Ratelimit } from "@upstash/ratelimit"
// import { kv } from "@vercel/kv"

// const ratelimit = new Ratelimit({
//   redis: kv,
//   limiter: Ratelimit.slidingWindow(20, "1 m"),
// })

// const allowedOrigins = ['http://localhost:3000', 'http://localhost:1313']

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

// export async function middleware(request: NextRequest) {
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
