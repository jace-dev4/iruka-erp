"use client";

import { useState } from "react";

interface InventoryMaterialsProps {
  inventory: any[];
  isLowStock: (item: any) => boolean;
}

export default function InventoryMaterials({
  inventory,
  isLowStock,
}: InventoryMaterialsProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  /* =========================
     PRODUCTION INGREDIENTS
  ========================== */

  const production = inventory.filter((item) =>
    [
      "Flour",
      "Sugar",
      "Butter",
      "Yeast",
      "Groundnut Oil",
      "Iruka Recipe",
      "White Recipe",
      "Fruits Recipe",
    ].includes(item.name)
  );

  /* =========================
     PACKAGING MATERIALS
  ========================== */

  const packaging = inventory.filter((item) =>
    [
      "Tape",
      "Twist",
      "Small Iruka Nylon",
      "Small Rosy Nylon",
      "Medium Iruka Nylon",
      "Medium Rosy Nylon",
      "Big Smart Nylon",
      "Classic Iruka Nylon",
      "Classic Fruits Nylon",
      "Jumbo Iruka Nylon",
      "Jumbo Fruits Nylon",
      "Big Brother Family Nylon",
    ].includes(item.name)
  );

  /* =========================
     BAKERY ADDITIVES
  ========================== */

  const additives = inventory.filter((item) =>
    ["Brown", "Resins", "Flavour"].includes(item.name)
  );

  /* =========================
     DATE FORMATTER
  ========================== */

function formatDate(value: any) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

  /* =========================
     SECTION COMPONENT
  ========================== */

  function Section(title: string, icon: string, items: any[]) {
    return (
      <div className="mb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-xl shadow-lg">
            {icon}
          </div>

          <h2 className="text-2xl font-black text-white">{title}</h2>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-center text-slate-400">
            No materials available.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMaterial(item)}
                className="group overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 text-left shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-amber-950/30 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              >
                <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500" />

                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {item.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {item.unit || "Unit not set"}
                      </p>
                    </div>

                    {isLowStock(item) ? (
                      <span className="rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
                        LOW
                      </span>
                    ) : (
                      <span className="rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
                        HEALTHY
                      </span>
                    )}
                  </div>

                  <div className="mt-8">
                    <p className="text-5xl font-black text-amber-300">
                      {Number(item.quantity || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex justify-between text-xs text-slate-400">
                      <span>Inventory Level</span>

                      <span>
                        {isLowStock(item) ? "Needs Restock" : "Healthy"}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLowStock(item)
                            ? "w-1/4 bg-red-500"
                            : "w-full bg-gradient-to-r from-green-400 to-emerald-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* CLICK INDICATOR */}

                  <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Material ID
                    </span>

                    <span className="max-w-[160px] truncate font-mono text-xs text-amber-300">
                      {item.id}
                    </span>
                  </div>

                  <div className="mt-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500 transition group-hover:text-amber-300">
                    Click to view material details →
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* =========================
          INVENTORY MATERIALS
      ========================== */}

      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        {Section("Production Ingredients", "🍞", production)}

        {Section("Packaging Materials", "📦", packaging)}

        {Section("Bakery Additives", "🧪", additives)}
      </div>

      {/* =========================
          MATERIAL DETAILS MODAL
      ========================== */}

      {selectedMaterial && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={() => setSelectedMaterial(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* TOP ACCENT */}

            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

            <div className="p-7 lg:p-9">
              {/* HEADER */}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                    Inventory Material
                  </span>

                  <h2 className="mt-4 text-3xl font-black text-white lg:text-4xl">
                    {selectedMaterial.name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Detailed material information and inventory status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-xl text-slate-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
                >
                  ×
                </button>
              </div>

              {/* MAIN STOCK */}

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300/70">
                    Current Stock
                  </p>

                  <p className="mt-2 text-4xl font-black text-amber-300">
                    {Number(
                      selectedMaterial.quantity || 0
                    ).toLocaleString()}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {selectedMaterial.unit || "Unit not set"}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    isLowStock(selectedMaterial)
                      ? "border-red-400/20 bg-red-500/10"
                      : "border-emerald-400/20 bg-emerald-500/10"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Stock Status
                  </p>

                  <p
                    className={`mt-2 text-2xl font-black ${
                      isLowStock(selectedMaterial)
                        ? "text-red-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {isLowStock(selectedMaterial)
                      ? "LOW STOCK"
                      : "HEALTHY"}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {isLowStock(selectedMaterial)
                      ? "Restock recommended"
                      : "Stock level is healthy"}
                  </p>
                </div>
              </div>

              {/* INFORMATION */}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/60">
                <div className="border-b border-slate-700 px-5 py-4">
                  <h3 className="font-black text-white">
                    Material Information
                  </h3>
                </div>

                <div className="divide-y divide-slate-800">
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm text-slate-400">
                      Material ID
                    </span>

                    <span className="max-w-[250px] truncate rounded-lg bg-slate-800 px-3 py-1.5 font-mono text-xs text-amber-300">
                      {selectedMaterial.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm text-slate-400">
                      Material Name
                    </span>

                    <span className="font-bold text-white">
                      {selectedMaterial.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm text-slate-400">
                      Unit
                    </span>

                    <span className="font-bold text-white">
                      {selectedMaterial.unit || "Not set"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm text-slate-400">
                      Quantity
                    </span>

                    <span className="font-black text-amber-300">
                      {Number(
                        selectedMaterial.quantity || 0
                      ).toLocaleString()}{" "}
                      {selectedMaterial.unit || ""}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm text-slate-400">
                      Date Added
                    </span>

                    <span className="text-right text-sm font-semibold text-white">
                      {formatDate(selectedMaterial.created_at)}
                    </span>
                  </div>

                  {selectedMaterial.updated_at && (
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <span className="text-sm text-slate-400">
                        Last Updated
                      </span>

                      <span className="text-right text-sm font-semibold text-white">
                        {formatDate(selectedMaterial.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID FOOTER */}

              <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  System Reference
                </p>

                <p className="mt-2 break-all font-mono text-sm text-slate-300">
                  {selectedMaterial.id}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  This unique ID identifies this material record in the ERP
                  database.
                </p>
              </div>

              {/* CLOSE */}

              <button
                type="button"
                onClick={() => setSelectedMaterial(null)}
                className="mt-6 w-full rounded-2xl border border-slate-700 bg-slate-800 px-6 py-4 font-black text-white transition hover:border-amber-400/40 hover:bg-slate-700"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}