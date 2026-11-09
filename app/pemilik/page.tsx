import { notFound } from "next/navigation";
import DashboardHome from "../components/dashboard-home";
import { getDashboardConfig } from "../../lib/dashboard-config";
import { requireDashboardRole } from "../../lib/auth";
import { getDashboardMetricValues } from "../../lib/operational-queries";

export const instant = false;

export default async function OwnerDashboardPage() {
  const config = getDashboardConfig("pemilik");
  if (!config) notFound();
  const user = await requireDashboardRole("pemilik");
  const metricValues = await getDashboardMetricValues("pemilik", user.username);

  return <DashboardHome accountName={user.nama} config={config} metricValues={metricValues} />;
}
