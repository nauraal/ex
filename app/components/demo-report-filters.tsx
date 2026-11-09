"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  dashboardHref,
  type DashboardRole,
  type DemoRow,
} from "../../lib/dashboard-config";

export default function DemoReportFilters({
  columns,
  role,
  rows,
}: {
  columns: string[];
  role: DashboardRole;
  rows: DemoRow[];
}) {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedRange(dateRange);
  }

  const filteredRows = rows.filter(
    (row) =>
      (!appliedRange.from || !row.date || row.date >= appliedRange.from) &&
      (!appliedRange.to || !row.date || row.date <= appliedRange.to),
  );

  return (
    <>
      <form className="demo-report-filters" onSubmit={applyFilters}>
        <label>
          Dari tanggal
          <input
            aria-label="Dari tanggal"
            onChange={(event) =>
              setDateRange({ ...dateRange, from: event.target.value })
            }
            type="date"
            value={dateRange.from}
          />
        </label>
        <label>
          Sampai tanggal
          <input
            aria-label="Sampai tanggal"
            onChange={(event) =>
              setDateRange({ ...dateRange, to: event.target.value })
            }
            type="date"
            value={dateRange.to}
          />
        </label>
        <button className="demo-button demo-button-secondary" type="submit">
          Tampilkan
        </button>
        <span className="demo-filter-status" role="status">
          {`Menampilkan ${filteredRows.length} laporan`}
        </span>
      </form>
      <div className="demo-table-wrap">
        <table className="demo-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={`${row.values[0]}-${index}`}>
                {row.values.map((value, cellIndex) => (
                  <td key={`${cellIndex}-${value}`}>{value}</td>
                ))}
                <td>
                  <Link
                    className="demo-row-link"
                    href={dashboardHref(role, row.href)}
                  >
                    {row.actionLabel ?? "Lihat"}
                  </Link>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  Tidak ada laporan pada periode tersebut.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
