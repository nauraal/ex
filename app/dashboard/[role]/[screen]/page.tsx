import { notFound } from "next/navigation";
import DashboardScreen from "../../../components/dashboard-screen";
import type { OperationalOptions } from "../../../components/operational-forms";
import {
  dashboardScreenStaticParams,
  getDashboardConfig,
  getDashboardScreen,
} from "../../../../lib/dashboard-config";
import { requireDashboardRole } from "../../../../lib/auth";
import {
  getAccountRows,
  getProductFormOptions,
  getRegistrationHistoryRows,
  getRegistrationRows,
  getProductVariantRows,
} from "../../../../lib/product-queries";
import {
  getAllocatablePlanOptions,
  getAllocationRows,
  getCourierOptions,
  getCourierAllocationOptions,
  getCourierRows,
  getCourierInformationRows,
  getGuardShipmentRows,
  getIncomingShipmentOptions,
  getIngredientOptions,
  getMaterialUsageOptions,
  getLocationOptions,
  getLocationRows,
  getMakerPlanRows,
  getMaterialRequirementRows,
  getOpenProductionPlanOptions,
  getProductionPlanOptions,
  getProductionQualityRows,
  getProductionReportRows,
  getProductionOptions,
  getProductStockRows,
  getRawMaterialStockRows,
  getRequirementPlanOptions,
  getProductionPlanRows,
} from "../../../../lib/operational-queries";

export const instant = false;

export function generateStaticParams() {
  return dashboardScreenStaticParams();
}

export default async function DashboardModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; screen: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, screen: slug } = await params;
  const query = searchParams ? await searchParams : {};
  const config = getDashboardConfig(role);
  const screen = getDashboardScreen(role, slug);

  if (!config || !screen) notFound();
  const user = await requireDashboardRole(config.role);
  const isOwnerProductList = config.role === "pemilik" && slug === "produk";
  const isOwnerProductForm = config.role === "pemilik" && slug === "produk-form";
  let tableRows;
  if (screen.kind === "table" || screen.kind === "report") {
    tableRows = [];
    if (config.role === "pemilik") {
      switch (slug) {
        case "produk":
          tableRows = await getProductVariantRows(user.username);
          break;
        case "verifikasi":
          tableRows = await getRegistrationRows();
          break;
        case "pengguna":
          tableRows = await getAccountRows();
          break;
        case "registrasi-riwayat":
          tableRows = await getRegistrationHistoryRows();
          break;
        case "rencana":
          tableRows = await getProductionPlanRows(user.username);
          break;
        case "bahan":
          tableRows = await getMaterialRequirementRows(user.username);
          break;
        case "bahan-stok":
          tableRows = await getRawMaterialStockRows(true, user.username);
          break;
        case "stok":
          tableRows = await getProductStockRows(user.username);
          break;
        case "alokasi":
          tableRows = await getAllocationRows(user.username);
          break;
        case "alokasi-riwayat":
          tableRows = await getAllocationRows(user.username, true);
          break;
        case "alokasi-lokasi":
          tableRows = await getLocationRows();
          break;
        case "laporan":
          tableRows = await getProductionReportRows(user.username);
          break;
      }
    } else if (config.role === "pembuat_donut") {
      if (slug === "hasil-produksi") tableRows = await getMakerPlanRows(user.username);
      if (slug === "bahan-baku") tableRows = await getRawMaterialStockRows(false, user.username);
      if (slug === "kualitas-hasil") tableRows = await getProductionQualityRows(user.username);
    } else if (config.role === "pengantar") {
      if (slug === "pengiriman") tableRows = await getCourierRows(user.username);
      if (slug === "riwayat-pengiriman") tableRows = await getCourierRows(user.username, true);
      if (slug === "informasi-produk") tableRows = await getCourierInformationRows(user.username);
    } else if (config.role === "penjaga_tempat") {
      if (slug === "menerima-produk") tableRows = await getGuardShipmentRows(user.username);
      if (slug === "status-pengiriman") tableRows = await getGuardShipmentRows(user.username, "status");
      if (slug === "riwayat-penerimaan") tableRows = await getGuardShipmentRows(user.username, "history");
    }
  }
  const productFormOptions = isOwnerProductForm
    ? await getProductFormOptions()
    : undefined;
  const operationalOptions: OperationalOptions = {
    variants:
      (config.role === "pemilik" && ["rencana-form", "bahan-material-form", "stok-form"].includes(slug))
        ? await getProductionPlanOptions(user.username)
        : [],
    plans:
      config.role === "pemilik" && slug === "bahan-form"
        ? await getRequirementPlanOptions(user.username)
        : config.role === "pemilik" && slug === "alokasi-form"
          ? await getAllocatablePlanOptions(user.username)
          : config.role === "pembuat_donut" && slug === "catat-hasil"
            ? await getOpenProductionPlanOptions(user.username)
            : [],
    materials:
      config.role === "pemilik" && slug === "bahan-form"
        ? await getIngredientOptions(user.username)
        : [],
    locations:
      config.role === "pemilik" && slug === "alokasi-form"
        ? await getLocationOptions()
        : [],
    couriers:
      config.role === "pemilik" && slug === "alokasi-form"
        ? await getCourierOptions()
        : [],
    productions:
      config.role === "pemilik" && slug === "laporan-form"
        ? await getProductionOptions(user.username, "pemilik")
        : [],
    ...(
      config.role === "pembuat_donut" && slug === "catat-penggunaan"
        ? await getMaterialUsageOptions(user.username)
        : { productionDetails: [], usageMaterials: [] }
    ),
    courierAllocations:
      config.role === "pengantar" && slug === "konfirmasi-pengiriman"
        ? await getCourierAllocationOptions(user.username)
        : [],
    incomingShipments:
      config.role === "penjaga_tempat" && slug === "konfirmasi-penerimaan"
        ? await getIncomingShipmentOptions(user.username)
        : [],
    ...(config.role === "pembuat_donut" && slug === "catat-rusak"
      ? { productions: await getProductionOptions(user.username, "pembuat_donut") }
      : {}),
  };
  if (config.role === "pemilik" && slug === "alokasi-form") {
    const locationId = parsePositiveId(query.id_lokasi);
    if (locationId && operationalOptions.locations.some((location) => location.id_lokasi === locationId)) {
      operationalOptions.selectedLocationId = locationId;
    }
  }
  if (config.role === "pembuat_donut" && slug === "catat-hasil") {
    const planId = parsePositiveId(query.id_rencana);
    if (planId && operationalOptions.plans.some((plan) => plan.id_rencana === planId)) {
      operationalOptions.selectedPlanId = planId;
    }
  }
  if (config.role === "pembuat_donut" && slug === "catat-penggunaan") {
    const materialId = parsePositiveId(query.id_bahan);
    if (materialId && operationalOptions.usageMaterials.some((material) => material.id_bahan === materialId)) {
      operationalOptions.selectedMaterialId = materialId;
    }
  }
  if (config.role === "pembuat_donut" && slug === "catat-rusak") {
    const productionId = parsePositiveId(query.id_hasil);
    if (productionId && operationalOptions.productions.some((production) => production.id_hasil === productionId)) {
      operationalOptions.selectedProductionId = productionId;
    }
  }
  if (config.role === "pengantar" && slug === "konfirmasi-pengiriman") {
    const allocationId = parsePositiveId(query.id_alokasi);
    const shipmentId = parsePositiveId(query.id_pengiriman);
    const hasShipmentId =
      typeof query.id_pengiriman === "string" && query.id_pengiriman.length > 0;
    const allocation = operationalOptions.courierAllocations.find(
      (item) =>
        item.id_alokasi === allocationId &&
        (!hasShipmentId || item.id_pengiriman === shipmentId),
    );
    if (allocation) {
      operationalOptions.selectedAllocationId = allocation.id_alokasi;
      if (allocation.id_pengiriman) {
        operationalOptions.selectedShipmentId = allocation.id_pengiriman;
      }
    }
  }
  if (config.role === "penjaga_tempat" && slug === "konfirmasi-penerimaan") {
    const shipmentId = parsePositiveId(query.id_pengiriman);
    if (shipmentId && operationalOptions.incomingShipments.some((shipment) => shipment.id_pengiriman === shipmentId)) {
      operationalOptions.selectedShipmentId = shipmentId;
    }
  }
  const displayScreen =
    screen.kind === "detail"
      ? {
          ...screen,
          details: undefined,
          primaryAction: undefined,
          secondaryAction: undefined,
        }
      : screen;

  return (
    <DashboardScreen
      accountName={user.nama}
      brandSubtitle={
        isOwnerProductList || isOwnerProductForm
          ? "Produksi dan Distribusi"
          : undefined
      }
      config={config}
      operationalOptions={operationalOptions}
      productFormOptions={productFormOptions}
      screen={displayScreen}
      tableRows={tableRows}
    />
  );
}

function parsePositiveId(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
