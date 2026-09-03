import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Admin authorization rule:
    // In production, configure ADMIN_EMAIL & ADMIN_PASSWORD in .env.local
    const adminEmail = process.env.ADMIN_EMAIL || "admin@waynetrademarkhn.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "WayneAdmin2026!";

    if (email === adminEmail && password === adminPassword) {
      const response = NextResponse.json({
        success: true,
        user: { email, role: "super_admin", name: "Wayne Administrator" },
      });

      // Set secure HTTP-only cookie
      response.cookies.set("admin_session", "authenticated_session_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid email or password" },
      { status: 401 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
