import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DashboardRole } from "./dashboard-config";
import { prisma } from "./prisma";

const SESSION_COOKIE = "zazi_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const SESSION_ISSUER = "zazi-donut";
const SESSION_AUDIENCE = "zazi-dashboard";
const ROLES = [
  "pemilik",
  "pembuat_donut",
  "pengantar",
  "penjaga_tempat",
] as const satisfies readonly DashboardRole[];

export type AuthRole = (typeof ROLES)[number];

export type AuthenticatedUser = {
  id_user: number;
  nama: string;
  username: string;
  role: AuthRole;
};

export function isAuthRole(role: string): role is AuthRole {
  return ROLES.some((candidate) => candidate === role);
}

export function dashboardPath(role: AuthRole) {
  return role === "pemilik" ? "/pemilik" : `/dashboard/${role}`;
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

async function verifySession(token: string) {
  if (token.length > 2048) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      audience: SESSION_AUDIENCE,
      issuer: SESSION_ISSUER,
    });
    const userId = Number(payload.sub);
    if (
      !Number.isSafeInteger(userId) ||
      userId < 1 ||
      typeof payload.role !== "string" ||
      !isAuthRole(payload.role)
    ) {
      return null;
    }

    return { userId, role: payload.role };
  } catch {
    return null;
  }
}

export async function createAuthSession(userId: number, role: AuthRole) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(userId))
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySession(token);
  if (!session) return null;

  const user = await prisma.users.findUnique({
    where: { id_user: session.userId },
    select: {
      id_user: true,
      nama: true,
      username: true,
      role: true,
      status_registrasi: true,
    },
  });

  if (
    !user ||
    user.status_registrasi.trim().toLowerCase() !== "aktif" ||
    user.role !== session.role ||
    !isAuthRole(user.role)
  ) {
    return null;
  }

  return {
    id_user: user.id_user,
    nama: user.nama,
    username: user.username,
    role: user.role,
  };
}

export async function requireDashboardRole(role: AuthRole) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(dashboardPath(user.role));
  return user;
}
