import { NextResponse } from "next/server";
import { rolePermissions, type DbUser, type UserRole } from "@/lib/server/db";
import { getUserFromRequest } from "@/lib/server/session";

export function effectivePermissions(user: DbUser): string[] {
  return user.permissions.length ? user.permissions : rolePermissions[user.role];
}

export function userHasPermission(user: DbUser, permission: string) {
  const permissions = effectivePermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
}

export function userHasAnyPermission(user: DbUser, required: string[]) {
  return required.some((permission) => userHasPermission(user, permission));
}

export function userHasRole(user: DbUser, roles: UserRole[]) {
  return roles.includes(user.role);
}

export async function requireUser(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return {
      user: null as null,
      response: NextResponse.json({ error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." }, { status: 401 })
    };
  }
  return { user, response: null as null };
}

export async function requirePermission(request: Request, permission: string) {
  const auth = await requireUser(request);
  if (auth.response) {
    return auth;
  }
  if (!userHasPermission(auth.user, permission)) {
    return {
      user: null as null,
      response: NextResponse.json({ error: "ليس لديك صلاحية لتنفيذ هذه العملية." }, { status: 403 })
    };
  }
  return { user: auth.user, response: null as null };
}
