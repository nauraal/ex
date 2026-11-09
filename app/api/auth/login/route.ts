import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  createAuthSession,
  dashboardPath,
  isAuthRole,
  type AuthRole,
} from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: "Permintaan login tidak valid." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format permintaan login tidak valid." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { message: "Username dan kata sandi wajib diisi." },
      { status: 400 },
    );
  }

  const username = body.username.trim();
  const password = body.password;
  if (
    username.length === 0 ||
    username.length > 100 ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return NextResponse.json(
      { message: "Username dan kata sandi wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.users.findUnique({
      where: { username },
      select: {
        id_user: true,
        username: true,
        password_hash: true,
        role: true,
        status_registrasi: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Username tidak ditemukan" },
        { status: 401 },
      );
    }

    if (!(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json(
        { message: "Password yang Anda masukkan salah" },
        { status: 401 },
      );
    }

    if (user.status_registrasi.trim().toLowerCase() !== "aktif") {
      return NextResponse.json(
        { message: "Akun belum aktif. Hubungi administrator." },
        { status: 403 },
      );
    }

    if (!isAuthRole(user.role)) {
      console.error("Login denied because the user has an unsupported role.");
      return NextResponse.json(
        { message: "Role akun tidak valid." },
        { status: 403 },
      );
    }

    const role: AuthRole = user.role;
    await createAuthSession(user.id_user, role);

    return NextResponse.json({ redirectTo: dashboardPath(role) });
  } catch (error) {
    console.error("Login request failed.", error);
    return NextResponse.json(
      { message: "Layanan login sedang bermasalah. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
