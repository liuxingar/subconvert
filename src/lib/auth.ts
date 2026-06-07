import { cookies } from "next/headers";
import { getUserById, getUserByUsername } from "@/lib/db";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  if (cookieStore.get("subboost_admin")?.value === "1") {
    return { id: "local-admin", username: cookieStore.get("subboost_admin_user")?.value || "admin", isAdmin: true };
  }
  const userValue = cookieStore.get("subboost_user")?.value;
  if (userValue) {
    const user = getUserById(userValue) || getUserByUsername(userValue);
    if (user) return { id: user.id, username: user.username, isAdmin: false };
  }
  return null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
