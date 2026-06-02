import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  defaultCompanyPrintSettings,
  type CompanyPrintSettings
} from "@/lib/company-print-settings";
import { companyFromApi, companyToApi, type ApiCompanyProfile } from "@/lib/organization-map";

const DATA_DIR = path.join(process.cwd(), "data");
const COMPANY_PATH = path.join(DATA_DIR, "company-settings.json");

export async function readCompanySettingsFile(): Promise<CompanyPrintSettings> {
  try {
    const raw = await readFile(COMPANY_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ApiCompanyProfile>;
    return companyFromApi({ ...companyToApi(defaultCompanyPrintSettings), ...parsed });
  } catch {
    return { ...defaultCompanyPrintSettings };
  }
}

export async function writeCompanySettingsFile(settings: CompanyPrintSettings) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(COMPANY_PATH, JSON.stringify(companyToApi(settings), null, 2), "utf8");
}
