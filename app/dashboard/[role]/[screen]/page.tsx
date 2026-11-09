import { notFound } from "next/navigation";
import DashboardScreen from "../../../components/dashboard-screen";
import {
  dashboardScreenStaticParams,
  getDashboardConfig,
  getDashboardScreen,
} from "../../../../lib/dashboard-config";
import { requireDashboardRole } from "../../../../lib/auth";
import {
  getProductFormOptions,
  getProductVariantRows,
} from "../../../../lib/product-queries";

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
  const tableRows = isOwnerProductList
    ? await getProductVariantRows()
    : undefined;
  const productFormOptions = isOwnerProductForm
    ? await getProductFormOptions()
    : undefined;

  return (
    <DashboardScreen
      accountName={user.nama}
      brandSubtitle={
        isOwnerProductList || isOwnerProductForm
          ? "Produksi dan Distribusi"
          : undefined
      }
      config={config}
      productFormOptions={productFormOptions}
      screen={screen}
      tableRows={tableRows}
    />
  );
}
