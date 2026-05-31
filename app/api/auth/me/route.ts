import { NextResponse } from "next/server";
import { rolePermissions } from "@/lib/server/db";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة، يرجى تسجيل الدخول من جديد." }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      branch: user.branch,
      status: user.status,
      mustChangePassword: user.mustChangePassword ?? false,
      lastLoginAt: user.lastLoginAt,
      permissions: user.permissions.length ? user.permissions : rolePermissions[user.role]
    }
  });
}
