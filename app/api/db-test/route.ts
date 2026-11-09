import { NextResponse, connection } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  await connection();

  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi login tidak valid." },
        { status: 401 },
      );
    }

    if (user.role !== "pemilik") {
      return NextResponse.json(
        { success: false, message: "Akses hanya tersedia untuk pemilik." },
        { status: 403 },
      );
    }

    const totalUsers = await prisma.users.count();

    return NextResponse.json({
      success: true,
      message: "Koneksi PostgreSQL berhasil!",
      totalUsers,
    });
  } catch (error) {
    console.error("Database error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Koneksi database gagal",
      },
      { status: 500 },
    );
  }
}