import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { syncOperationalProfile } from "../../../../lib/account-profiles";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { prisma, withPrismaTransaction } from "../../../../lib/prisma";

const REGISTRATION_ROLES = [
  "pembuat_donut",
  "pengantar",
  "penjaga_tempat",
] as const;

export async function GET() {
  const owner = await getAuthenticatedUser();
  if (!owner) {
    return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  }
  if (owner.role !== "pemilik") {
    return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  }

  try {
    const users = await prisma.users.findMany({
      select: {
        id_user: true,
        nama: true,
        username: true,
        role: true,
        status_registrasi: true,
      },
      orderBy: { id_user: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("User list query failed.", error);
    return NextResponse.json({ message: "Daftar pengguna gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const owner = await getAuthenticatedUser();
  if (!owner) {
    return NextResponse.json({ message: "Sesi login tidak valid." }, { status: 401 });
  }
  if (owner.role !== "pemilik") {
    return NextResponse.json({ message: "Akses hanya tersedia untuk pemilik." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "Permintaan tidak valid." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data pengguna tidak valid." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ message: "Data pengguna tidak valid." }, { status: 400 });
  }

  const nama = readString(body.nama, 255);
  const username = readString(body.username, 100);
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;
  if (
    !nama ||
    !username ||
    password.length === 0 ||
    new TextEncoder().encode(password).byteLength > 72 ||
    !isRegistrationRole(role)
  ) {
    return NextResponse.json({ message: "Nama, username, password, atau role tidak valid." }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await withPrismaTransaction(async (transaction) => {
      const created = await transaction.users.create({
        data: {
          nama,
          username,
          password_hash: passwordHash,
          role,
          status_registrasi: "menunggu_verifikasi",
        },
        select: { id_user: true, nama: true, username: true, role: true },
      });
      await syncOperationalProfile(transaction, {
        nama: created.nama,
        username: created.username,
        role,
        status_registrasi: "menunggu_verifikasi",
      });
      await transaction.riwayat_registrasi.create({
        data: {
          id_user: created.id_user,
          status_registrasi: "menunggu_verifikasi",
          diproses_oleh: owner.id_user,
        },
      });
      return created;
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (hasPrismaCode(error, "P2002")) {
      return NextResponse.json({ message: "Username sudah digunakan." }, { status: 409 });
    }
    console.error("User creation failed.", error);
    return NextResponse.json({ message: "Pengguna gagal disimpan." }, { status: 500 });
  }
}

function isRegistrationRole(
  role: unknown,
): role is (typeof REGISTRATION_ROLES)[number] {
  return (
    typeof role === "string" &&
    REGISTRATION_ROLES.some((candidate) => candidate === role)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
