import { notFound } from "next/navigation";
import DashboardHome from "../components/dashboard-home";
import { getDashboardConfig } from "../../lib/dashboard-config";
import { requireDashboardRole } from "../../lib/auth";

export const instant = false;

export default async function OwnerDashboardPage() {
  const config = getDashboardConfig("pemilik");
  if (!config) notFound();
  const user = await requireDashboardRole("pemilik");

  return <DashboardHome accountName={user.nama} config={config} />;
}
