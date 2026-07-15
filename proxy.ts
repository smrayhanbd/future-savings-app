import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // 1. Check if the user has a valid token (is logged in)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // 2. If NO TOKEN (unauthenticated), redirect to Landing Page immediately
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // 3. Role-based routing (Only runs if the user IS logged in)
  
  // If a MEMBER tries to access the Admin Dashboard, redirect to Member Portal
  if (path.startsWith("/dashboard") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/portal", req.url))
  }

  // If an ADMIN tries to access the Member Portal, redirect to Admin Dashboard
  if (path.startsWith("/portal") && token.role !== "MEMBER") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  // This ensures the middleware ONLY runs on protected routes.
  // Your landing page ("/"), login ("/login"), and register ("/register") remain completely public.
  matcher: ["/dashboard/:path*", "/portal/:path*"]
}