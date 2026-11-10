import { notFound } from "next/navigation";
import DashboardScreen from "../../../../components/dashboard-screen";
import {
  getDashboardConfig,
  getDashboardScreen,
} from "../../../../../lib/dashboard-config";
import { requireDashboardRole } from "../../../../../lib/auth";
import {
  getCourierAllocationDetail,
  getGuardShipmentDetail,
  getMakerPlanDetail,
  getMakerQualityDetail,
  getOwnerReportDetail,
} from "../../../../../lib/operational-queries";

export const instant = false;

export default async function DashboardRecordPage({
  params,
}: {
  params: Promise<{ role: string; screen: string; id: string }>;
}) {
  const { role, screen: slug, id } = await params;
  const config = getDashboardConfig(role);
  const screen = getDashboardScreen(role, slug);
  if (!config || !screen || screen.kind !== "detail") notFound();

  const user = await requireDashboardRole(config.role);
  let record: {
    title: string;
    details: { label: string; value: string }[];
    primaryAction?: { label: string; href: string };
  } | null = null;

  if (config.role === "pemilik" && slug === "laporan-detail") {
    const reportId = parsePositiveId(id);
    if (reportId) record = await getOwnerReportDetail(user.username, reportId);
  } else if (config.role === "pembuat_donut" && slug === "hasil-produksi-detail") {
    const planId = parsePositiveId(id);
    if (planId) record = await getMakerPlanDetail(user.username, planId);
  } else if (config.role === "pembuat_donut" && slug === "kualitas-detail") {
    const productionId = parsePositiveId(id);
    if (productionId) record = await getMakerQualityDetail(user.username, productionId);
  } else if (
    config.role === "pengantar" &&
    (slug === "pengiriman-detail" || slug === "riwayat-detail")
  ) {
    const parsed = parseCourierRecordId(id);
    if (parsed) {
      record = await getCourierAllocationDetail(
        user.username,
        parsed.type,
        parsed.id,
      );
    }
  } else if (
    config.role === "penjaga_tempat" &&
    ["detail-penerimaan", "detail-status", "riwayat-penerimaan-detail"].includes(slug)
  ) {
    const shipmentId = parsePositiveId(id);
    if (shipmentId) record = await getGuardShipmentDetail(user.username, shipmentId);
  }

  if (!record) notFound();
  return (
    <DashboardScreen
      accountName={user.nama}
      config={config}
      screen={{
        ...screen,
        title: record.title,
        details: record.details,
        primaryAction: record.primaryAction,
      }}
    />
  );
}

function parsePositiveId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function parseCourierRecordId(value: string) {
  const match = /^(allocation|shipment)-([1-9]\d*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[2]);
  return Number.isSafeInteger(id)
    ? { type: match[1] as "allocation" | "shipment", id }
    : null;
}
