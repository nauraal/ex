import Link from "next/link";
import DashboardShell from "./dashboard-shell";
import DemoReportFilters from "./demo-report-filters";
import ProductCreateForm from "./product-create-form";
import RegistrationDecisionButton from "./registration-decision-button";
import {
  AccountCreateForm,
  AccountRowActions,
} from "./account-management";
import {
  AllocationForm,
  CourierShipmentForm,
  GuardReceiptForm,
  IngredientCreateForm,
  MaterialRequirementForm,
  MaterialUsageForm,
  PlanRowActions,
  ProductStockAdjustmentForm,
  ProductStockAdjustment,
  ProductionPlanForm,
  ProductionDamageForm,
  ProductionReportForm,
  ProductionResultForm,
  RawMaterialStockAdjustment,
  type OperationalOptions,
} from "./operational-forms";
import {
  dashboardHref,
  type DashboardConfig,
  type DashboardNavigationItem,
  type DemoRow,
  type DemoScreen,
} from "../../lib/dashboard-config";
import type { ProductFormOptions } from "../../lib/product-queries";

export default function DashboardScreen({
  config,
  screen,
  accountName,
  tableRows,
  brandSubtitle,
  productFormOptions,
  operationalOptions,
}: {
  config: DashboardConfig;
  screen: DemoScreen;
  accountName: string;
  tableRows?: DemoRow[];
  brandSubtitle?: string;
  productFormOptions?: ProductFormOptions;
  operationalOptions?: OperationalOptions;
}) {
  const activeModule = config.modules.find(
    (module) => module.id === screen.menuId,
  );
  const navigation: DashboardNavigationItem[] = [
    { id: "beranda", label: "Beranda", href: dashboardHref(config.role) },
    ...config.modules.map((module) => ({
      id: module.id,
      label: module.label,
      href: dashboardHref(config.role, module.id),
    })),
  ];
  const backHref = screen.backHref
    ? dashboardHref(config.role, screen.backHref)
    : dashboardHref(config.role);
  const primaryHref = screen.primaryAction
    ? dashboardHref(config.role, screen.primaryAction.href)
    : undefined;
  const secondaryHref = screen.secondaryAction
    ? dashboardHref(config.role, screen.secondaryAction.href)
    : undefined;
  const tableColumns =
    screen.columns?.[screen.columns.length - 1] === "Aksi"
      ? screen.columns.slice(0, -1)
      : screen.columns;
  const rows = tableRows ?? screen.rows ?? [];
  const operational = operationalOptions ?? {
    variants: [],
    plans: [],
    materials: [],
    locations: [],
    couriers: [],
    productions: [],
    productionDetails: [],
    usageMaterials: [],
    courierAllocations: [],
    incomingShipments: [],
  };
  const isOperationalForm = [
    "rencana-form",
    "stok-form",
    "bahan-form",
    "bahan-material-form",
    "alokasi-form",
    "laporan-form",
    "catat-hasil",
    "catat-penggunaan",
    "catat-rusak",
    "konfirmasi-pengiriman",
    "konfirmasi-penerimaan",
  ].includes(screen.slug);

  return (
    <DashboardShell
      activeItem={screen.menuId}
      homeHref={dashboardHref(config.role)}
      navigation={navigation}
      stakeholder={config.label}
      accountName={accountName}
      theme={config.theme}
      brandSubtitle={brandSubtitle}
    >
      <section className="dashboard-home-panel dashboard-screen-panel">
        <div className="dashboard-heading dashboard-screen-heading">
          <div>
            <p className="dashboard-eyebrow">{activeModule?.label ?? "Menu"}</p>
            <h1>{screen.title}</h1>
            <p className="dashboard-intro">{screen.description}</p>
          </div>
          {primaryHref || secondaryHref ? (
            <div className="dashboard-screen-actions">
              {secondaryHref ? (
                <Link
                  className="demo-button demo-button-secondary"
                  href={secondaryHref}
                >
                  {screen.secondaryAction?.label}
                </Link>
              ) : null}
              {primaryHref ? (
                <Link
                  className="demo-button demo-button-primary"
                  href={primaryHref}
                >
                  {screen.primaryAction?.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {screen.tabs?.length ? (
          <nav className="demo-tabs" aria-label="Bagian halaman">
            {screen.tabs.map((tab) => (
              <Link
                aria-current={tab.href === screen.slug ? "page" : undefined}
                className={`demo-tab${tab.href === screen.slug ? " is-active" : ""}`}
                href={dashboardHref(config.role, tab.href)}
                key={tab.href}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {config.role === "pemilik" &&
        screen.slug === "produk-form" &&
        productFormOptions ? (
          <div className="demo-card">
            <ProductCreateForm options={productFormOptions} />
          </div>
        ) : null}

        {config.role === "pemilik" && screen.slug === "pengguna-form" ? (
          <div className="demo-card">
            <AccountCreateForm />
          </div>
        ) : null}

        {screen.slug === "rencana-form" && config.role === "pemilik" ? (
          <div className="demo-card"><ProductionPlanForm {...operational} /></div>
        ) : null}
        {screen.slug === "stok-form" && config.role === "pemilik" ? (
          <div className="demo-card"><ProductStockAdjustmentForm {...operational} /></div>
        ) : null}
        {screen.slug === "bahan-form" && config.role === "pemilik" ? (
          <div className="demo-card"><MaterialRequirementForm {...operational} /></div>
        ) : null}
        {screen.slug === "bahan-material-form" && config.role === "pemilik" ? (
          <div className="demo-card"><IngredientCreateForm {...operational} /></div>
        ) : null}
        {screen.slug === "alokasi-form" && config.role === "pemilik" ? (
          <div className="demo-card"><AllocationForm {...operational} /></div>
        ) : null}
        {screen.slug === "laporan-form" && config.role === "pemilik" ? (
          <div className="demo-card"><ProductionReportForm {...operational} /></div>
        ) : null}
        {screen.slug === "catat-hasil" && config.role === "pembuat_donut" ? (
          <div className="demo-card"><ProductionResultForm {...operational} /></div>
        ) : null}
        {screen.slug === "catat-rusak" && config.role === "pembuat_donut" ? (
          <div className="demo-card"><ProductionDamageForm {...operational} /></div>
        ) : null}
        {screen.slug === "catat-penggunaan" && config.role === "pembuat_donut" ? (
          <div className="demo-card"><MaterialUsageForm {...operational} /></div>
        ) : null}
        {screen.slug === "konfirmasi-pengiriman" && config.role === "pengantar" ? (
          <div className="demo-card"><CourierShipmentForm {...operational} /></div>
        ) : null}
        {screen.slug === "konfirmasi-penerimaan" && config.role === "penjaga_tempat" ? (
          <div className="demo-card"><GuardReceiptForm {...operational} /></div>
        ) : null}

        {screen.kind === "form" &&
        screen.fields &&
        !(config.role === "pemilik" && screen.slug === "produk-form") &&
        !(config.role === "pemilik" && screen.slug === "pengguna-form") &&
        !isOperationalForm ? (
          <div className="demo-card">
            <p className="demo-note">Formulir ini belum terhubung ke database dan belum dapat menyimpan data.</p>
          </div>
        ) : null}

        {screen.kind === "detail" ? (
          screen.details ? (
            <div className="demo-card">
              <dl className="demo-details">
                {screen.details.map((item) => (
                  <div className="demo-detail-row" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {screen.primaryAction && primaryHref ? (
                <Link className="demo-button demo-button-primary" href={primaryHref}>
                  {screen.primaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="demo-card">
              <p className="demo-note">Detail ini belum tersedia dari data database untuk halaman ini.</p>
            </div>
          )
        ) : null}

        {(screen.kind === "table" || screen.kind === "report") &&
        screen.columns &&
        (screen.rows || tableRows) ? (
          <div className="demo-card">
            {screen.kind === "report" ? (
              <DemoReportFilters
                columns={tableColumns ?? []}
                role={config.role}
                rows={rows}
              />
            ) : (
              <div className="demo-table-wrap">
                <table className="demo-table">
                  <thead>
                    <tr>
                      {tableColumns?.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((item, index) => (
                      <tr key={`${item.values[0]}-${index}`}>
                        {item.values.map((value, cellIndex) => (
                          <td key={`${cellIndex}-${value}`}>{value}</td>
                        ))}
                        <td>
                          <div className="demo-row-actions">
                            {(item.actions ?? [
                              {
                                label: item.actionLabel ?? "Lihat",
                                href: item.href,
                              },
                            ]).map((action) => (
                              action.registrationDecision && action.userId ? (
                                <RegistrationDecisionButton
                                  key={`${action.label}-${action.userId}`}
                                  label={action.label}
                                  status={action.registrationDecision}
                                  userId={action.userId}
                                />
                              ) : action.accountId ? (
                                <AccountRowActions
                                  key={`${action.label}-${action.accountId}`}
                                  name={action.accountName ?? ""}
                                  status={action.accountStatus ?? ""}
                                  userId={action.accountId}
                                  username={action.accountUsername ?? ""}
                                />
                              ) : action.planId ? (
                                <PlanRowActions
                                  date={action.planDate ?? ""}
                                  id={action.planId}
                                  key={`${action.label}-${action.planId}`}
                                  note={action.planNote ?? null}
                                  quantity={action.planQuantity ?? 0}
                                />
                              ) : action.stockVariantId ? (
                                <ProductStockAdjustment
                                  key={`${action.label}-${action.stockVariantId}`}
                                  quantity={action.stockQuantity ?? 0}
                                  variantId={action.stockVariantId}
                                />
                              ) : action.rawMaterialId ? (
                                <RawMaterialStockAdjustment
                                  key={`${action.label}-${action.rawMaterialId}`}
                                  materialId={action.rawMaterialId}
                                  quantity={action.rawMaterialQuantity ?? "0"}
                                />
                              ) : action.label === "—" ? (
                                <span key={`${action.label}-${action.href}`} className="demo-row-link">—</span>
                              ) : (
                                <Link
                                  className="demo-row-link"
                                  href={dashboardHref(config.role, action.href)}
                                  key={`${action.label}-${action.href}`}
                                >
                                  {action.label}
                                </Link>
                              )
                            ))}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="demo-table-empty" colSpan={screen.columns.length}>
                          {screen.slug === "verifikasi"
                            ? "Tidak ada pendaftaran yang menunggu verifikasi."
                            : screen.slug === "registrasi-riwayat"
                              ? "Belum ada riwayat registrasi."
                              : "Belum ada data tersimpan di database."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {screen.note ? <p className="demo-note">{screen.note}</p> : null}
        {screen.relatedLinks?.length ? (
          <nav className="demo-related-links" aria-label="Halaman terkait">
            {screen.relatedLinks.map((item) => (
              <Link
                className="demo-text-link"
                href={dashboardHref(config.role, item.href)}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="demo-screen-footer">
          <Link className="demo-button demo-button-secondary" href={backHref}>
            Kembali
          </Link>
          <Link className="demo-text-link" href={dashboardHref(config.role)}>
            Beranda {config.label}
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
