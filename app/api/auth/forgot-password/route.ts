import { NextResponse } from "next/server";
import { createToken, readDb, writeDb } from "@/lib/server/db";
import { getPublicAppOrigin } from "@/lib/server/app-url";
import { djangoErrorMessage, djangoJson, isDjangoAuthEnabled } from "@/lib/server/django-api";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "أدخل البريد الإلكتروني." }, { status: 400 });
  }

  if (isDjangoAuthEnabled()) {
    const { status, data } = await djangoJson<{
      ok?: boolean;
      message?: string;
      reset_url?: string;
    }>("/api/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    if (status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر معالجة الطلب.") },
        { status: status >= 400 ? status : 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: data.message ?? "إذا كان البريد مسجلاً، تم إنشاء رابط الاستعادة.",
      resetUrl: data.reset_url
    });
  }

  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (user) {
    const token = createToken();
    db.resetTokens.push({
      token,
      email,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false
    });
    await writeDb(db);

    const resetUrl = `${getPublicAppOrigin(request)}/reset-password?token=${token}`;
    return NextResponse.json({
      ok: true,
      message: "إذا كان البريد مسجلاً، تم إنشاء رابط الاستعادة.",
      resetUrl
    });
  }

  return NextResponse.json({ ok: true, message: "إذا كان البريد مسجلاً، تم إنشاء رابط الاستعادة." });
}
