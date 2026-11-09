import { notFound } from "next/navigation";
import DashboardHome from "../../components/dashboard-home";
import {
  dashboardRoleStaticParams,
  getDashboardConfig,
} from "../../../lib/dashboard-config";

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

  return <DashboardHome config={config} />;
}
