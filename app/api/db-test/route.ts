import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const totalUsers = await prisma.users.count();

    return NextResponse.json({
      success: true,
      message: "Koneksi PostgreSQL berhasil!",
      totalUsers: totalUsers,
    });
  } catch (error) {
    console.error("Database error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Koneksi database gagal",
      },
      { status: 500 }
    );
  }
}