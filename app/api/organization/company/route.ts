import { NextResponse } from "next/server";
import type { CompanyPrintSettings } from "@/lib/company-print-settings";
import { companyFromApi, companyToApi } from "@/lib/organization-map";
import {
  djangoErrorMessage,
  djangoJson,
  isDjangoAuthEnabled
} from "@/lib/server/django-api";
import { readJwtAccessFromCookie } from "@/lib/server/jwt-session";
import {
  readCompanySettingsFile,
  writeCompanySettingsFile
} from "@/lib/server/company-settings-file";
import { getUserFromRequest } from "@/lib/server/session";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const { status, data } = await djangoJson<Record<string, unknown>>(
      "/api/organization/company/",
      { accessToken: access ?? undefined }
    );
    if (status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر تحميل إعدادات الشركة.") },
        { status }
      );
    }
    return NextResponse.json({ settings: companyFromApi(data), source: "api" });
  }

  const settings = await readCompanySettingsFile();
  return NextResponse.json({ settings, source: "file" });
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "انتهت الجلسة." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CompanyPrintSettings> & {
    settings?: Partial<CompanyPrintSettings>;
  };
  const patch = body.settings ?? body;

  if (isDjangoAuthEnabled()) {
    const access = readJwtAccessFromCookie(request.headers.get("cookie"));
    const loaded = await djangoJson<Record<string, unknown>>("/api/organization/company/", {
      accessToken: access ?? undefined
    });
    const current =
      loaded.status === 200 ? companyFromApi(loaded.data) : await readCompanySettingsFile();
    const merged = { ...current, ...patch };
    const { status, data } = await djangoJson<Record<string, unknown>>(
      "/api/organization/company/",
      {
        method: "PATCH",
        accessToken: access ?? undefined,
        body: JSON.stringify(companyToApi(merged))
      }
    );
    if (status !== 200) {
      return NextResponse.json(
        { error: djangoErrorMessage(data, "تعذر حفظ إعدادات الشركة.") },
        { status }
      );
    }
    return NextResponse.json({ ok: true, settings: companyFromApi(data) });
  }

  const current = await readCompanySettingsFile();
  const merged = { ...current, ...patch };
  await writeCompanySettingsFile(merged);
  return NextResponse.json({ ok: true, settings: merged });
}

export async function PUT(request: Request) {
  return PATCH(request);
}
