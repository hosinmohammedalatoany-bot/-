import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/auth-form";
import { readDb } from "@/lib/server/db";

/** Must read live DB after factory reset — static prerender would cache redirect to /login. */
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const db = await readDb();
  if (db.setupCompleted) {
    redirect("/login");
  }
  return <SetupForm />;
}
