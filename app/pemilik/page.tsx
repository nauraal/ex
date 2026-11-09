import { notFound } from "next/navigation";
import DashboardHome from "../components/dashboard-home";
import { getDashboardConfig } from "../../lib/dashboard-config";

export default function OwnerDashboardPage() {
  const config = getDashboardConfig("pemilik");
  if (!config) notFound();

  return <DashboardHome config={config} />;
}
