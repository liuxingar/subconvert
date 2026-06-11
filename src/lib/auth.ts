import { cookies } from "next/headers";
import { deleteAuthSession, getAuthSessionUser } from "@/lib/db";

export const authCookieName = "subboost_session";
export const userSessionMaxAgeSeconds = 60 * 60 * 24 * 30;
export const adminSessionMaxAgeSeconds = 60 * 60 * 12;

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    path: "/",
    maxAge
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  return token ? getAuthSessionUser(token) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("UNAUTHORIZED");
  return user;
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;
  if (token) deleteAuthSession(token);
  cookieStore.delete(authCookieName);
  cookieStore.delete("subboost_user");
  cookieStore.delete("subboost_admin");
  cookieStore.delete("subboost_admin_user");
}
