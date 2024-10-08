// app/middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const publicPaths = [
  "/signin",
  "/widget",
  "/api/chat",
  "/api/search",
  "/api/auth/",
  "/chat-widget-loader.js",
];

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:1313",
  `https://${process.env.VERCEL_URL}`,
  `https://${process.env.VERCEL_BRANCH_URL}`,
  `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
];
// TODO add external production domains

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});

function setCORSHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
}

async function handleRateLimit(request: NextRequest): Promise<boolean> {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  return success;
}

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export default auth(async (req) => {
  
  const isPublicPage = isPublicPath(req.nextUrl.pathname);
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");

  if (!isPublicPage && req.nextUrl.pathname !== "/signin") {
    if (!req.auth) {
      if (isApiRoute) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      return NextResponse.redirect(new URL("/signin", req.url));
    } else if (isApiRoute) {
      return NextResponse.next();
    }
  }

  let response = NextResponse.next();

  if (req.method === "OPTIONS") {
    response = new NextResponse(null, { status: 204 });
    setCORSHeaders(req, response);
    return response;
  }

  if (req.nextUrl.pathname.startsWith("/api/chat")) {
    setCORSHeaders(req, response);
  }

  if (
    req.nextUrl.pathname.startsWith("/api/chat") ||
    req.nextUrl.pathname.startsWith("/api/search")
  ) {
    const rateLimitSuccess = await handleRateLimit(req);
    if (!rateLimitSuccess) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }
  }

  return response;
}) as any;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
