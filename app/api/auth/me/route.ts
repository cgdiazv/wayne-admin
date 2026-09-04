import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("admin_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      if (decoded && decoded.email) {
        // Optionally fetch fresh record from DB to verify user is still active
        const freshUser = await prisma.user.findUnique({
          where: { email: decoded.email },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });

        if (freshUser && freshUser.isActive) {
          return NextResponse.json({
            authenticated: true,
            user: freshUser,
          });
        }
      }
    } catch {
      // If parsing fails, session invalid
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
