import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/auth-form";
import { readDb } from "@/lib/server/db";

export default async function SetupPage() {
  const db = await readDb();
  if (db.setupCompleted) {
    redirect("/login");
  }
  return <SetupForm />;
}
