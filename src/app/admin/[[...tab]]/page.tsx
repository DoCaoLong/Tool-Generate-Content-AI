import { redirect } from "next/navigation";
import AdminApp from "@/components/AdminApp";

const tabs = new Set(["user", "prompts", "keys"]);

export default async function AdminPage({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  const segment = tab?.[0];
  if (!segment || tab.length !== 1 || !tabs.has(segment)) redirect("/admin/user");
  return <AdminApp />;
}
