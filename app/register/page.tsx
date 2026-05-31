import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/auth-form";
import { readDb } from "@/lib/server/db";

export default async function RegisterPage() {
  const db = await readDb();
  if (!db.setupCompleted) {
    redirect("/setup");
  }
  return <RegisterForm />;
}
