import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const REGISTRATION_ROLES = [
  "pembuat_donut",
  "pengantar",
  "penjaga_tempat",
] as const;

function isRegistrationRole(
  role: unknown,
): role is (typeof REGISTRATION_ROLES)[number] {
  return (
    typeof role === "string" &&
    REGISTRATION_ROLES.some((candidate) => candidate === role)
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: "Permintaan pendaftaran tidak valid." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Format permintaan pendaftaran tidak valid." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("nama" in body) ||
    !("username" in body) ||
    !("password" in body) ||
    !("role" in body) ||
    typeof body.nama !== "string" ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { message: "Nama, username, role, dan kata sandi wajib diisi." },
      { status: 400 },
    );
  }

  const nama = body.nama.trim();
  const username = body.username.trim();
  const password = body.password;
  if (
    nama.length === 0 ||
    nama.length > 255 ||
    username.length === 0 ||
    username.length > 100 ||
    password.length === 0 ||
    new TextEncoder().encode(password).byteLength > 72 ||
    !isRegistrationRole(body.role)
  ) {
    return NextResponse.json(
      { message: "Data pendaftaran tidak valid." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.users.create({
      data: {
        nama,
        username,
        password_hash: passwordHash,
        role: body.role,
        status_registrasi: "menunggu_verifikasi",
      },
      select: { id_user: true },
    });

    return NextResponse.json(
      { message: "Pendaftaran berhasil dan menunggu verifikasi." },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Username sudah digunakan." },
        { status: 409 },
      );
    }

    console.error("Registration request failed.", error);
    return NextResponse.json(
      { message: "Pendaftaran gagal. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
