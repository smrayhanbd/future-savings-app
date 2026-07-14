import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // If a MEMBER tries to access the Admin Dashboard, redirect them to the Member Portal
    if (path.startsWith("/dashboard") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal", req.url))
    }

    // If an ADMIN tries to access the Member Portal, redirect them to the Admin Dashboard
    if (path.startsWith("/portal") && token?.role !== "MEMBER") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/",
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"]
}