import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Correo y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Lookup user in PostgreSQL database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas. Verifique su correo o contraseña." },
        { status: 401 }
      );
    }

    // Verify bcrypt password hash
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas. Verifique su correo o contraseña." },
        { status: 401 }
      );
    }

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const sessionPayload = Buffer.from(JSON.stringify(userData)).toString("base64");

    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    // Set secure HTTP-only cookie
    response.cookies.set("admin_session", sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("[Login API Error]:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mensajes amigables según el tipo de error
    let friendlyMessage = "Error inesperado al intentar iniciar sesión. Por favor intente más tarde.";

    if (errorMessage.includes("DATABASE_URL") || errorMessage.includes("Environment variable not found")) {
      friendlyMessage = "No se pudo conectar a la base de datos: variable de configuración no encontrada. Por favor contacte al administrador.";
    } else if (
      errorMessage.includes("Can't reach database") ||
      errorMessage.includes("P1001") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ECONNREFUSED")
    ) {
      friendlyMessage = "No se pudo establecer conexión con el servidor de base de datos. Por favor verifique su conexión o intente más tarde.";
    } else if (errorMessage.includes("P2021") || errorMessage.includes("does not exist in the current database")) {
      friendlyMessage = "La tabla de usuarios aún no está disponible en la base de datos. Por favor ejecute las migraciones.";
    }

    return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 });
  }
}

