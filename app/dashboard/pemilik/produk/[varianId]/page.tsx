import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import DashboardShell from "../../../../components/dashboard-shell";
import ProductManagement from "../../../../components/product-management";
import { requireDashboardRole } from "../../../../../lib/auth";
import {
  formatRupiah,
  getProductVariantDetail,
} from "../../../../../lib/product-queries";
import {
  dashboardHref,
  getDashboardConfig,
  type DashboardNavigationItem,
} from "../../../../../lib/dashboard-config";

export const instant = false;

export function generateStaticParams() {
  return [{ varianId: "__placeholder__" }];
}

export default function ProductVariantDetailPage({
  params,
}: {
  params: Promise<{ varianId: string }>;
}) {
  return (
    <Suspense fallback={<p className="product-detail-loading">Memuat detail produk...</p>}>
      <ProductVariantDetail params={params} />
    </Suspense>
  );
}

async function ProductVariantDetail({
  params,
}: {
  params: Promise<{ varianId: string }>;
}) {
  const { varianId } = await params;
  const id = Number(varianId);

  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const user = await requireDashboardRole("pemilik");
  const variant = await getProductVariantDetail(id, user.username);

  if (!variant) notFound();

  const config = getDashboardConfig("pemilik");
  if (!config) notFound();

  const navigation: DashboardNavigationItem[] = [
    { id: "beranda", label: "Beranda", href: dashboardHref(config.role) },
    ...config.modules.map((module) => ({
      id: module.id,
      label: module.label,
      href: dashboardHref(config.role, module.id),
    })),
  ];
  const imageSrc = getProductImageSource(variant.gambar_url);
  const backHref = dashboardHref("pemilik", "produk");

  return (
    <DashboardShell
      accountName={user.nama}
      activeItem="produk"
      brandSubtitle="Produksi dan Distribusi"
      homeHref={dashboardHref("pemilik")}
      navigation={navigation}
      stakeholder={config.label}
      theme={config.theme}
    >
      <section className="product-detail-card" aria-labelledby="product-detail-title">
        <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link href={backHref}>Informasi Produk</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Detail</span>
        </nav>

        <h1 id="product-detail-title">
          Detail {variant.produk.nama_produk} {variant.nama_varian}
        </h1>

        <div className="product-detail-overview">
          <dl className="product-detail-information">
            <div className="product-detail-row">
              <dt>Produk</dt>
              <dd>{variant.produk.nama_produk}</dd>
            </div>
            <div className="product-detail-row">
              <dt>Varian</dt>
              <dd>{variant.nama_varian}</dd>
            </div>
            <div className="product-detail-row">
              <dt>Harga varian</dt>
              <dd>{formatRupiah(variant.harga.toFixed(0))}</dd>
            </div>
          </dl>

          <div className="product-detail-image">
            <Image
              alt={`${variant.produk.nama_produk} varian ${variant.nama_varian}`}
              className="product-detail-image-content"
              fill
              sizes="(max-width: 760px) 90vw, 360px"
              src={imageSrc}
              unoptimized
            />
          </div>
        </div>

        <section className="product-detail-description" aria-labelledby="product-description-title">
          <h2 id="product-description-title">Deskripsi Produk</h2>
          <p>{variant.deskripsi?.trim() || "Deskripsi produk belum tersedia."}</p>
        </section>

        <div className="product-detail-ingredients">
          <IngredientsList
            title="Ingredients Donut"
            ingredients={variant.ingredients_donut}
          />
          <IngredientsList
            title="Ingredients Topping / Olesan"
            ingredients={variant.ingredients_topping}
          />
        </div>

        <ProductManagement
          variant={{
            id_varian: variant.id_varian,
            nama_varian: variant.nama_varian,
            harga: variant.harga.toFixed(0),
            deskripsi: variant.deskripsi,
            ingredients_donut: variant.ingredients_donut,
            ingredients_topping: variant.ingredients_topping,
            gambar_url: variant.gambar_url,
            produk: {
              nama_produk: variant.produk.nama_produk,
              satuan: variant.produk.satuan,
            },
          }}
        />

        <div className="product-detail-footer">
          <Link className="demo-button demo-button-secondary" href={backHref}>
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 20 20"
              width="16"
            >
              <path
                d="M16 10H4m0 0 5-5m-5 5 5 5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            Kembali
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}

function IngredientsList({
  title,
  ingredients,
}: {
  title: string;
  ingredients: string | null;
}) {
  const items = (ingredients ?? "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[\s•*-]+/, "").trim())
    .filter(Boolean);

  return (
    <section className="product-detail-ingredient-list" aria-label={title}>
      <h2>{title}</h2>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Data ingredients belum tersedia.</p>
      )}
    </section>
  );
}

function getProductImageSource(source: string | null) {
  if (source && source.startsWith("/") && !source.startsWith("//")) {
    return source;
  }

  if (source && /^https?:\/\//i.test(source)) {
    return source;
  }

  return "/zazi/donut.png";
}
