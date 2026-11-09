import { notFound } from "next/navigation";
import DashboardScreen from "../../../components/dashboard-screen";
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
}: {
  params: Promise<{ role: string; screen: string }>;
}) {
  const { role, screen: slug } = await params;
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
          tableRows = await getProductVariantRows();
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
          tableRows = await getProductionPlanRows();
          break;
        case "bahan":
          tableRows = await getMaterialRequirementRows();
          break;
        case "bahan-stok":
          tableRows = await getRawMaterialStockRows();
          break;
        case "stok":
          tableRows = await getProductStockRows();
          break;
        case "alokasi":
        case "alokasi-riwayat":
          tableRows = await getAllocationRows();
          break;
        case "laporan":
          tableRows = await getProductionReportRows();
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
  const operationalOptions = {
    variants:
      (config.role === "pemilik" && ["rencana-form", "bahan-material-form", "stok-form"].includes(slug))
        ? await getProductionPlanOptions()
        : [],
    plans:
      config.role === "pemilik" && slug === "bahan-form"
        ? await getRequirementPlanOptions()
        : config.role === "pemilik" && slug === "alokasi-form"
          ? await getAllocatablePlanOptions()
          : config.role === "pembuat_donut" && slug === "catat-hasil"
            ? await getOpenProductionPlanOptions(user.username)
            : [],
    materials:
      config.role === "pemilik" && slug === "bahan-form"
        ? await getIngredientOptions()
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
        ? await getProductionOptions()
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
      ? { productions: await getProductionOptions(user.username) }
      : {}),
  };
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
