import { notFound } from "next/navigation";
import { ModuleContent } from "@/components/modules/module-content";
import { isModuleKey } from "@/lib/module-utils";
import { isShippedModule } from "@/lib/shipped-modules";
import type { ModuleKey } from "@/lib/domain";

export default async function DashboardModulePage({
  params
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!isModuleKey(module)) {
    notFound();
  }
  if (!isShippedModule(module as ModuleKey)) {
    notFound();
  }
  return <ModuleContent moduleKey={module as ModuleKey} />;
}
