import { notFound } from "next/navigation";
import DashboardScreen from "../../../components/dashboard-screen";
import {
  dashboardScreenStaticParams,
  getDashboardConfig,
  getDashboardScreen,
} from "../../../../lib/dashboard-config";
import { requireDashboardRole } from "../../../../lib/auth";

export const instant = false;

export function generateStaticParams() {
  return dashboardScreenStaticParams();
}

export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ role: string; screen: string }>;
}) {
  const { role, screen: slug } = await params;
  const config = getDashboardConfig(role);
  const screen = getDashboardScreen(role, slug);

  if (!config || !screen) notFound();
  const user = await requireDashboardRole(config.role);

  return (
    <DashboardScreen accountName={user.nama} config={config} screen={screen} />
  );
}
