import { notFound } from "next/navigation";
import DashboardHome from "../../components/dashboard-home";
import {
  dashboardRoleStaticParams,
  getDashboardConfig,
} from "../../../lib/dashboard-config";
import { requireDashboardRole } from "../../../lib/auth";

export const instant = false;

export function generateStaticParams() {
  return dashboardRoleStaticParams();
}

export default async function RoleDashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const config = getDashboardConfig(role);
  if (!config) notFound();
  const user = await requireDashboardRole(config.role);

  return <DashboardHome accountName={user.nama} config={config} />;
}
