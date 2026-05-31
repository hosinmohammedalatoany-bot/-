import { VerifyDocumentClient } from "./verify-client";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <VerifyDocumentClient code={code} />;
}
