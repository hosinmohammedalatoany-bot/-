import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/server/db";
import type { BranchRecord } from "@/lib/organization-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  const activeOnly = new URL(request.url).searchParams.get("active_only");

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const qs = activeOnly === "1" ? "?active_only=1" : "";
    const path = `/api/organization/branches/${activeOnly === "1" ? "?active_only=1" : ""}`;
    const { status, data } = await djangoJson<BranchRecord[]>(path, {
      accessToken: access ?? undefined
    });
    if (status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر تحميل الفروع.") },
        { status }
      );
    }
    return NextResponse.json({ branches: data });
  }

  const db = await readDb();
  const names = db.branches ?? [];
  const branches: BranchRecord[] = names.map((name, i) => ({
    id: `legacy-${i}`,
    name,
    code: `b${i}`,
    address: "",
    phone: "",
    manager_name: "",
    is_active: true
  }));
  return NextResponse.json({ branches });
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    manager_name?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "اسم الفرع مطلوب." }, { status: 400 });
  }

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const { status, data } = await djangoJson<BranchRecord>("/api/organization/branches/", {
      method: "POST",
      accessToken: access ?? undefined,
      body: JSON.stringify(body)
    });
    if (status !== 201) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر إنشاء الفرع.") },
        { status }
      );
    }
    return NextResponse.json({ ok: true, branch: data }, { status: 201 });
  }

  const db = await readDb();
  const name = body.name.trim();
  if (db.branches.includes(name)) {
    return NextResponse.json({ error: "الفرع موجود مسبقاً." }, { status: 400 });
  }
  db.branches = [name, ...db.branches];
  await writeDb(db);
  return NextResponse.json(
    {
      ok: true,
      branch: {
        id: `legacy-${db.branches.length}`,
        name,
        code: body.code ?? "branch",
        address: body.address ?? "",
        phone: body.phone ?? "",
        manager_name: body.manager_name ?? "",
        is_active: true
      } satisfies BranchRecord
    },
    { status: 201 }
  );
}
