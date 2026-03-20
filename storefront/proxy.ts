import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"

const PH_ANON_COOKIE = "_ph_anon_id"

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next()

  if (!request.cookies.get(PH_ANON_COOKIE)) {
    response.cookies.set(PH_ANON_COOKIE, randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
