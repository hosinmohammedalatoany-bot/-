import type { CompanyPrintSettings } from "@/lib/company-print-settings";
import { defaultCompanyPrintSettings } from "@/lib/company-print-settings";

export type ApiCompanyProfile = {
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  commercial_register?: string;
  tax_number?: string;
  currency?: string;
  invoice_footer?: string;
  contract_legal_text?: string;
  print_margin_mm?: number;
  paper_size?: string;
  manager_name?: string;
  manager_title?: string;
  show_qr?: boolean;
  show_barcode?: boolean;
  show_stamp?: boolean;
  show_manager_signature?: boolean;
  show_client_signature?: boolean;
  logo_data_url?: string;
  stamp_data_url?: string;
  signature_data_url?: string;
};

export type BranchRecord = {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  manager_name: string;
  is_active: boolean;
  user_count?: number;
  created_at?: string;
};

export function companyFromApi(data: ApiCompanyProfile): CompanyPrintSettings {
  return {
    ...defaultCompanyPrintSettings,
    companyName: data.company_name ?? defaultCompanyPrintSettings.companyName,
    address: data.address ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    commercialRegister: data.commercial_register ?? "",
    taxNumber: data.tax_number ?? "",
    currency: data.currency ?? "IQD",
    invoiceFooter: data.invoice_footer ?? defaultCompanyPrintSettings.invoiceFooter,
    contractLegalText: data.contract_legal_text ?? defaultCompanyPrintSettings.contractLegalText,
    printMarginMm: data.print_margin_mm ?? 12,
    paperSize: (data.paper_size === "Letter" ? "Letter" : "A4") as CompanyPrintSettings["paperSize"],
    managerName: data.manager_name ?? "",
    managerTitle: data.manager_title ?? "",
    showQr: data.show_qr ?? true,
    showBarcode: data.show_barcode ?? true,
    showStamp: data.show_stamp ?? true,
    showManagerSignature: data.show_manager_signature ?? true,
    showClientSignature: data.show_client_signature ?? true,
    logoDataUrl: data.logo_data_url || undefined,
    stampDataUrl: data.stamp_data_url || undefined,
    signatureDataUrl: data.signature_data_url || undefined,
    branchName: ""
  };
}

export function companyToApi(settings: CompanyPrintSettings): ApiCompanyProfile {
  return {
    company_name: settings.companyName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    commercial_register: settings.commercialRegister,
    tax_number: settings.taxNumber,
    currency: settings.currency || "IQD",
    invoice_footer: settings.invoiceFooter,
    contract_legal_text: settings.contractLegalText,
    print_margin_mm: settings.printMarginMm,
    paper_size: settings.paperSize,
    manager_name: settings.managerName,
    manager_title: settings.managerTitle,
    show_qr: settings.showQr,
    show_barcode: settings.showBarcode,
    show_stamp: settings.showStamp,
    show_manager_signature: settings.showManagerSignature,
    show_client_signature: settings.showClientSignature,
    logo_data_url: settings.logoDataUrl ?? "",
    stamp_data_url: settings.stampDataUrl ?? "",
    signature_data_url: settings.signatureDataUrl ?? ""
  };
}
