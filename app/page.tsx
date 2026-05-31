import { redirect } from "next/navigation";
import { readDb } from "@/lib/server/db";

export default async function HomePage() {
  const db = await readDb();
  if (!db.setupCompleted) {
    redirect("/setup");
  }
  redirect("/dashboard/dashboard");
}
