import { notFound } from "next/navigation";
import { ModuleContent } from "@/components/modules/module-content";
import { isModuleKey } from "@/lib/module-utils";

export default async function DashboardModulePage({
  params
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!isModuleKey(module)) {
    notFound();
  }
  return <ModuleContent moduleKey={module} />;
}
