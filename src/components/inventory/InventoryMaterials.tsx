"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface InventoryMaterialsProps {
  inventory: any[];
  isLowStock: (item: any) => boolean;
  showNotification?: (
    type: "success" | "error",
    message: string
  ) => void;
  onInventoryUpdated?: () => Promise<void> | void;
}

/* =====================================================
   MATERIAL IMAGES
===================================================== */

const materialImages: Record<string, string> = {
  Flour: "/inventory/flour.jpg",
  Sugar: "/inventory/sugar.jpg",
  Butter: "/inventory/butter.jpg",
  Yeast: "/inventory/yeast.jpg",
  "Groundnut Oil": "/inventory/groundnut-oil.jpg",
  Tape: "/inventory/tape.jpg",
  Resins: "/inventory/resins.jpg",
};

export default function InventoryMaterials({
  inventory,
  isLowStock,
  showNotification,
  onInventoryUpdated,
}: InventoryMaterialsProps) {
  const [selectedMaterial, setSelectedMaterial] =
    useState<any | null>(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  const [editQuantity, setEditQuantity] =
    useState("");

  const [editUnit, setEditUnit] =
    useState("");

  const [editUnitCost, setEditUnitCost] =
    useState("");

  const [editReorderLevel, setEditReorderLevel] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /* =====================================================
     LAST UPLOAD
  ===================================================== */

  const [lastUpload, setLastUpload] =
    useState<any | null>(null);

  const [loadingLastUpload, setLoadingLastUpload] =
    useState(false);

  /* =====================================================
     NOTIFICATION
  ===================================================== */

  function notify(
    type: "success" | "error",
    message: string
  ) {
    if (showNotification) {
      showNotification(type, message);
    }
  }

  /* =====================================================
     IMAGE
  ===================================================== */

  function getMaterialImage(name: string) {
    return materialImages[name];
  }

  /* =====================================================
     MATERIAL GROUP
  ===================================================== */

  function getMaterialGroup(name: string) {
    if (
      [
        "Flour",
        "Sugar",
        "Butter",
        "Yeast",
        "Groundnut Oil",
        "Iruka Recipe",
        "White Recipe",
        "Fruits Recipe",
      ].includes(name)
    ) {
      return "Production Ingredient";
    }

    if (
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
      ].includes(name)
    ) {
      return "Packaging Material";
    }

    if (
      ["Brown", "Resins", "Flavour"].includes(name)
    ) {
      return "Bakery Additive";
    }

    return "Inventory Material";
  }

  /* =====================================================
     MATERIAL GROUPS
  ===================================================== */

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

  const additives = inventory.filter((item) =>
    ["Brown", "Resins", "Flavour"].includes(
      item.name
    )
  );

  /* =====================================================
     DATE FORMATTER
  ===================================================== */

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

  /* =====================================================
     NUMBER FORMATTER
  ===================================================== */

  function formatNumber(value: any) {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("en-NG", {
      maximumFractionDigits: 2,
    });
  }

  /* =====================================================
     CURRENCY FORMATTER
  ===================================================== */

  function formatCurrency(value: any) {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) {
      return "₦0";
    }

    return `₦${number.toLocaleString("en-NG", {
      maximumFractionDigits: 2,
    })}`;
  }

  /* =====================================================
     FETCH LAST RECEIVED STOCK
  ===================================================== */

  async function fetchLastUpload(
    materialName: string
  ) {
    try {
      setLoadingLastUpload(true);
      setLastUpload(null);

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(
          "id, material_name, quantity_used, transaction_type, reference, created_at"
        )
        .eq(
          "material_name",
          materialName
        )
        .eq(
          "transaction_type",
          "RECEIVED"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Fetch last inventory upload error:",
          error
        );

        notify(
          "error",
          "Unable to load the latest upload information."
        );

        return;
      }

      setLastUpload(data || null);
    } catch (error) {
      console.error(
        "Unexpected last upload error:",
        error
      );
    } finally {
      setLoadingLastUpload(false);
    }
  }

  /* =====================================================
     OPEN MATERIAL PROFILE
  ===================================================== */

  async function openMaterial(item: any) {
    setSelectedMaterial(item);
    setIsEditing(false);

    setEditName(item.name || "");

    setEditQuantity(
      String(item.quantity ?? "")
    );

    setEditUnit(item.unit || "");

    setEditUnitCost(
      String(item.unit_cost ?? "")
    );

    setEditReorderLevel(
      String(item.reorder_level ?? "")
    );

    await fetchLastUpload(item.name);
  }

  /* =====================================================
     START EDITING
  ===================================================== */

  function startEditing() {
    if (!selectedMaterial) return;

    setEditName(
      selectedMaterial.name || ""
    );

    setEditQuantity(
      String(
        selectedMaterial.quantity ?? ""
      )
    );

    setEditUnit(
      selectedMaterial.unit || ""
    );

    setEditUnitCost(
      String(
        selectedMaterial.unit_cost ?? ""
      )
    );

    setEditReorderLevel(
      String(
        selectedMaterial.reorder_level ?? ""
      )
    );

    setIsEditing(true);
  }

  /* =====================================================
     CANCEL EDITING
  ===================================================== */

  function cancelEditing() {
    if (!selectedMaterial) return;

    setEditName(
      selectedMaterial.name || ""
    );

    setEditQuantity(
      String(
        selectedMaterial.quantity ?? ""
      )
    );

    setEditUnit(
      selectedMaterial.unit || ""
    );

    setEditUnitCost(
      String(
        selectedMaterial.unit_cost ?? ""
      )
    );

    setEditReorderLevel(
      String(
        selectedMaterial.reorder_level ?? ""
      )
    );

    setIsEditing(false);
  }

  /* =====================================================
     SAVE MATERIAL
  ===================================================== */

  async function saveMaterial() {
    if (!selectedMaterial || saving) {
      return;
    }

    const trimmedName =
      editName.trim();

    const trimmedUnit =
      editUnit.trim();

    const quantity =
      Number(editQuantity);

    const unitCost =
      editUnitCost.trim() === ""
        ? 0
        : Number(editUnitCost);

    const reorderLevel =
      editReorderLevel.trim() === ""
        ? 0
        : Number(editReorderLevel);

    if (!trimmedName) {
      notify(
        "error",
        "Material name is required."
      );
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity < 0
    ) {
      notify(
        "error",
        "Please enter a valid quantity."
      );
      return;
    }

    if (
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      notify(
        "error",
        "Please enter a valid unit cost."
      );
      return;
    }

    if (
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0
    ) {
      notify(
        "error",
        "Please enter a valid reorder level."
      );
      return;
    }

    if (!trimmedUnit) {
      notify(
        "error",
        "Please enter a unit."
      );
      return;
    }

    const duplicate =
      inventory.find(
        (item) =>
          item.id !==
            selectedMaterial.id &&
          String(item.name)
            .trim()
            .toLowerCase() ===
            trimmedName.toLowerCase()
      );

    if (duplicate) {
      notify(
        "error",
        `A material named "${trimmedName}" already exists.`
      );
      return;
    }

    try {
      setSaving(true);

      const { data, error } =
        await supabase
          .from("inventory")
          .update({
            name: trimmedName,
            quantity,
            unit: trimmedUnit,
            unit_cost: unitCost,
            reorder_level:
              Math.round(
                reorderLevel
              ),
          })
          .eq(
            "id",
            selectedMaterial.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "Material was not updated."
        );
      }

      setSelectedMaterial(data);

      setEditName(
        data.name || ""
      );

      setEditQuantity(
        String(data.quantity ?? "")
      );

      setEditUnit(
        data.unit || ""
      );

      setEditUnitCost(
        String(data.unit_cost ?? "")
      );

      setEditReorderLevel(
        String(
          data.reorder_level ?? ""
        )
      );

      setIsEditing(false);

      await fetchLastUpload(
        data.name
      );

      if (onInventoryUpdated) {
        await onInventoryUpdated();
      }

      notify(
        "success",
        `${data.name} was updated successfully.`
      );
    } catch (error: any) {
      console.error(
        "Update inventory material error:",
        error
      );

      notify(
        "error",
        error?.message ||
          "Unable to update inventory material."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     CLOSE PROFILE
  ===================================================== */

  function closeMaterial() {
    if (saving) return;

    setSelectedMaterial(null);
    setIsEditing(false);
    setLastUpload(null);
  }

  /* =====================================================
     SECTION
  ===================================================== */

  function Section(
    title: string,
    icon: string,
    items: any[]
  ) {
    return (
      <div className="mb-11 last:mb-0">

        {/* SECTION HEADER */}

        <div className="mb-5 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-xl shadow-lg">
              {icon}
            </div>

            <div>

              <h2 className="text-2xl font-black tracking-tight text-white">
                {title}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Manage and monitor inventory
                materials
              </p>

            </div>

          </div>

          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-400">
            {items.length}{" "}
            {items.length === 1
              ? "item"
              : "items"}
          </span>

        </div>

        {items.length === 0 ? (

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-500">
            No materials available.
          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {items.map((item) => {

              const image =
                getMaterialImage(
                  item.name
                );

              const lowStock =
                isLowStock(item);

              return (

                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    openMaterial(item)
                  }
                  className="group overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-b from-slate-800/95 to-slate-900 text-left shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_24px_55px_rgba(0,0,0,0.42)] focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >

                  {/* TOP ACCENT */}

                  <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

                  {/* IMAGE */}

                  <div className="relative h-48 overflow-hidden bg-slate-950">

                    {image ? (

                      <img
                        src={image}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">

                        <div className="text-center">

                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-3xl shadow-xl">
                            📦
                          </div>

                          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Photo not added
                          </p>

                        </div>

                      </div>

                    )}

                    {/* IMAGE OVERLAY */}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

                    {/* STATUS */}

                    <div className="absolute right-4 top-4">

                      {lowStock ? (

                        <span className="rounded-full border border-red-400/30 bg-red-500/90 px-3 py-1.5 text-[10px] font-black tracking-wide text-white shadow-lg backdrop-blur-md">
                          LOW STOCK
                        </span>

                      ) : (

                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/90 px-3 py-1.5 text-[10px] font-black tracking-wide text-white shadow-lg backdrop-blur-md">
                          HEALTHY
                        </span>

                      )}

                    </div>

                    {/* CATEGORY */}

                    <div className="absolute bottom-4 left-5">

                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                        {getMaterialGroup(
                          item.name
                        )}
                      </p>

                    </div>

                  </div>

                  {/* CARD BODY */}

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">

                        <h3 className="truncate text-lg font-black text-white">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {item.unit ||
                            "Unit not set"}
                        </p>

                      </div>

                      <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-[10px] text-slate-500">
                        #{item.id}
                      </span>

                    </div>

                    {/* STOCK */}

                    <div className="mt-5 flex items-end justify-between">

                      <div>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Current Stock
                        </p>

                        <div className="mt-1 flex items-baseline gap-2">

                          <p className="text-4xl font-black tracking-tight text-amber-300">
                            {formatNumber(
                              item.quantity
                            )}
                          </p>

                          <span className="text-xs font-bold text-slate-500">
                            {item.unit ||
                              ""}
                          </span>

                        </div>

                      </div>

                      <div className="text-right">

                        <p className="text-[10px] font-medium text-slate-600">
                          Reorder
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-400">
                          {formatNumber(
                            item.reorder_level
                          )}
                        </p>

                      </div>

                    </div>

                    {/* LEVEL */}

                    <div className="mt-4">

                      <div className="mb-2 flex items-center justify-between">

                        <span className="text-[10px] font-medium text-slate-600">
                          Inventory Level
                        </span>

                        <span
                          className={`text-[10px] font-bold ${
                            lowStock
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {lowStock
                            ? "Needs Restock"
                            : "Healthy"}
                        </span>

                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">

                        <div
                          className={`h-full rounded-full ${
                            lowStock
                              ? "w-1/4 bg-red-500"
                              : "w-full bg-gradient-to-r from-emerald-400 to-green-500"
                          }`}
                        />

                      </div>

                    </div>

                    {/* FOOTER */}

                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">

                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Material Profile
                      </span>

                      <span className="flex items-center gap-1 text-xs font-black text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-amber-300">
                        View Details
                        <span>→</span>
                      </span>

                    </div>

                  </div>

                </button>
              );
            })}

          </div>

        )}

      </div>
    );
  }

  return (
    <>

      {/* =====================================================
          INVENTORY MATERIALS
      ===================================================== */}

      <div className="rounded-[30px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.35)] lg:p-7">

        {Section(
          "Production Ingredients",
          "🍞",
          production
        )}

        {Section(
          "Packaging Materials",
          "📦",
          packaging
        )}

        {Section(
          "Bakery Additives",
          "🧪",
          additives
        )}

      </div>

      {/* =====================================================
          MATERIAL PROFILE MODAL
      ===================================================== */}

      {selectedMaterial && (

        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md sm:p-6"
          onClick={closeMaterial}
        >

          <div
            className="relative my-auto max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto overflow-x-hidden rounded-[30px] border border-slate-700 bg-slate-900 shadow-[0_35px_100px_rgba(0,0,0,0.55)]"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="relative overflow-hidden bg-gradient-to-r from-amber-700 via-orange-800 to-slate-950 p-7 text-white lg:p-8">

              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 md:flex-row md:items-center">

                {/* IMAGE */}

                <div className="h-40 w-40 shrink-0 overflow-hidden rounded-3xl border-4 border-white/10 bg-white/10 shadow-2xl">

                  {getMaterialImage(
                    selectedMaterial.name
                  ) ? (

                    <img
                      src={getMaterialImage(
                        selectedMaterial.name
                      )}
                      alt={selectedMaterial.name}
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    <div className="flex h-full w-full items-center justify-center bg-slate-900/60">

                      <div className="text-center">

                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
                          📦
                        </div>

                        <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          No Photo
                        </p>

                      </div>

                    </div>

                  )}

                </div>

                {/* IDENTITY */}

                <div className="min-w-0 flex-1">

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                    {getMaterialGroup(
                      selectedMaterial.name
                    )}
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                    {selectedMaterial.name}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2">

                    <span
                      className={`rounded-full px-4 py-2 text-xs font-black ${
                        isLowStock(
                          selectedMaterial
                        )
                          ? "bg-red-500 text-white"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {isLowStock(
                        selectedMaterial
                      )
                        ? "LOW STOCK"
                        : "HEALTHY"}
                    </span>

                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-amber-100">
                      {selectedMaterial.unit ||
                        "Unit not set"}
                    </span>

                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">

                    <div>

                      <p className="text-[10px] uppercase tracking-wider text-amber-200/60">
                        Material ID
                      </p>

                      <p className="mt-1 truncate font-mono text-sm font-bold text-white">
                        {selectedMaterial.id}
                      </p>

                    </div>

                    <div>

                      <p className="text-[10px] uppercase tracking-wider text-amber-200/60">
                        Current Stock
                      </p>

                      <p className="mt-1 text-sm font-black text-white">
                        {formatNumber(
                          selectedMaterial.quantity
                        )}{" "}
                        {selectedMaterial.unit ||
                          ""}
                      </p>

                    </div>

                    <div>

                      <p className="text-[10px] uppercase tracking-wider text-amber-200/60">
                        Date Added
                      </p>

                      <p className="mt-1 text-sm font-bold text-white">
                        {formatDate(
                          selectedMaterial.created_at
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                {/* CLOSE */}

                <button
                  type="button"
                  disabled={saving}
                  onClick={closeMaterial}
                  aria-label="Close material profile"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white/70 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50 md:relative md:right-auto md:top-auto"
                >
                  ×
                </button>

              </div>

            </div>

            {/* =================================================
                EDIT MODE
            ================================================= */}

            {isEditing ? (

              <div className="p-6 lg:p-8">

                <div className="mb-7">

                  <h3 className="text-2xl font-black text-white">
                    Edit Material
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Update the material record in the ERP inventory database.
                  </p>

                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* NAME */}

                  <div className="md:col-span-2">

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Material Name
                    </label>

                    <input
                      type="text"
                      value={editName}
                      onChange={(e) =>
                        setEditName(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                    />

                  </div>

                  {/* QUANTITY */}

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Current Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editQuantity}
                      onChange={(e) =>
                        setEditQuantity(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                    />

                  </div>

                  {/* UNIT */}

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Unit
                    </label>

                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) =>
                        setEditUnit(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      placeholder="bags, cartons, kg, packs..."
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                    />

                  </div>

                  {/* UNIT COST */}

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Unit Cost
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editUnitCost}
                      onChange={(e) =>
                        setEditUnitCost(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                    />

                  </div>

                  {/* REORDER LEVEL */}

                  <div>

                    <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                      Reorder Level
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editReorderLevel}
                      onChange={(e) =>
                        setEditReorderLevel(
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-60"
                    />

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelEditing}
                    className="rounded-2xl border border-slate-700 bg-slate-800 px-7 py-3.5 font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveMaterial}
                    className="rounded-2xl bg-amber-500 px-7 py-3.5 font-black text-slate-950 shadow-lg transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {saving ? (

                      <span className="flex items-center gap-2">

                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />

                        Saving...

                      </span>

                    ) : (
                      "Save Changes"
                    )}
                  </button>

                </div>

              </div>

            ) : (

              /* =================================================
                 VIEW MODE
              ================================================= */

              <div className="p-6 lg:p-8">

                {/* STOCK OVERVIEW */}

                <div>

                  <div className="mb-5">

                    <h3 className="text-2xl font-black text-white">
                      Stock Overview
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Current inventory position and latest stock movement.
                    </p>

                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    {/* CURRENT */}

                    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-300/70">
                        Current Stock
                      </p>

                      <p className="mt-2 text-3xl font-black text-amber-300">
                        {formatNumber(
                          selectedMaterial.quantity
                        )}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {selectedMaterial.unit ||
                          "Unit"}
                      </p>

                    </div>

                    {/* LAST UPLOAD */}

                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-300/70">
                        Last Uploaded
                      </p>

                      {loadingLastUpload ? (

                        <div className="mt-3 flex items-center gap-2">

                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300/20 border-t-blue-300" />

                          <span className="text-sm text-slate-400">
                            Loading...
                          </span>

                        </div>

                      ) : (

                        <>

                          <p className="mt-2 text-3xl font-black text-blue-300">
                            {lastUpload
                              ? formatNumber(
                                  lastUpload.quantity_used
                                )
                              : "—"}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {selectedMaterial.unit ||
                              "Unit"}
                          </p>

                        </>

                      )}

                    </div>

                    {/* COST */}

                    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Unit Cost
                      </p>

                      <p className="mt-2 text-2xl font-black text-white">
                        {formatCurrency(
                          selectedMaterial.unit_cost
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Per unit
                      </p>

                    </div>

                    {/* REORDER */}

                    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Reorder Level
                      </p>

                      <p className="mt-2 text-3xl font-black text-white">
                        {formatNumber(
                          selectedMaterial.reorder_level
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {selectedMaterial.unit ||
                          "Unit"}
                      </p>

                    </div>

                  </div>

                </div>

                {/* LAST UPLOAD */}

                <div className="mt-8 rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-950 p-6">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-xl">
                        📥
                      </div>

                      <div>

                        <h3 className="text-xl font-black text-white">
                          Last Stock Upload
                        </h3>

                        <p className="text-xs text-slate-500">
                          Most recent RECEIVED transaction
                        </p>

                      </div>

                    </div>

                    {lastUpload && (

                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black text-emerald-300">
                        RECEIVED
                      </span>

                    )}

                  </div>

                  {loadingLastUpload ? (

                    <div className="mt-6 flex justify-center rounded-2xl border border-slate-800 bg-slate-950/50 p-8">

                      <div className="flex items-center gap-3 text-sm text-slate-500">

                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-400" />

                        Loading latest upload...

                      </div>

                    </div>

                  ) : lastUpload ? (

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">

                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Uploaded Quantity
                        </p>

                        <p className="mt-2 text-2xl font-black text-blue-300">
                          {formatNumber(
                            lastUpload.quantity_used
                          )}{" "}
                          <span className="text-sm text-slate-500">
                            {selectedMaterial.unit ||
                              ""}
                          </span>
                        </p>

                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">

                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Uploaded On
                        </p>

                        <p className="mt-2 text-sm font-bold leading-6 text-white">
                          {formatDate(
                            lastUpload.created_at
                          )}
                        </p>

                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">

                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          Reference
                        </p>

                        <p className="mt-2 text-sm font-bold text-white">
                          {lastUpload.reference ||
                            "No reference"}
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-7 text-center">

                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl">
                        📦
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-400">
                        No stock upload history found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        No RECEIVED transaction exists for this material yet.
                      </p>

                    </div>

                  )}

                </div>

                {/* MATERIAL INFORMATION */}

                <div className="mt-8">

                  <div className="mb-5">

                    <h3 className="text-2xl font-black text-white">
                      Material Information
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Complete information stored for this material.
                    </p>

                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Material Name
                      </p>

                      <p className="mt-2 text-lg font-black text-white">
                        {selectedMaterial.name}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Material Group
                      </p>

                      <p className="mt-2 text-lg font-black text-amber-300">
                        {getMaterialGroup(
                          selectedMaterial.name
                        )}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Unit
                      </p>

                      <p className="mt-2 text-lg font-black text-white">
                        {selectedMaterial.unit ||
                          "Not set"}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Current Quantity
                      </p>

                      <p className="mt-2 text-lg font-black text-amber-300">
                        {formatNumber(
                          selectedMaterial.quantity
                        )}{" "}
                        {selectedMaterial.unit ||
                          ""}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Unit Cost
                      </p>

                      <p className="mt-2 text-lg font-black text-white">
                        {formatCurrency(
                          selectedMaterial.unit_cost
                        )}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Reorder Level
                      </p>

                      <p className="mt-2 text-lg font-black text-white">
                        {formatNumber(
                          selectedMaterial.reorder_level
                        )}{" "}
                        {selectedMaterial.unit ||
                          ""}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Material ID
                      </p>

                      <p className="mt-2 break-all font-mono text-sm font-bold text-amber-300">
                        {selectedMaterial.id}
                      </p>

                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Date Added
                      </p>

                      <p className="mt-2 text-sm font-bold leading-6 text-white">
                        {formatDate(
                          selectedMaterial.created_at
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                {/* SYSTEM REFERENCE */}

                <div className="mt-8 rounded-3xl border border-amber-400/10 bg-amber-500/5 p-6">

                  <div className="flex items-start gap-4">

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-xl">
                      🗃️
                    </div>

                    <div>

                      <p className="text-xs font-black uppercase tracking-wider text-amber-300">
                        ERP System Reference
                      </p>

                      <p className="mt-2 break-all font-mono text-sm text-slate-300">
                        Inventory ID:{" "}
                        {selectedMaterial.id}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        This identifier references the material record stored in the ERP inventory database.
                      </p>

                    </div>

                  </div>

                </div>

                {/* FOOTER */}

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">

                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-2xl bg-amber-500 px-7 py-3.5 font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-400 active:scale-95"
                  >
                    ✏️ Edit Material
                  </button>

                  <button
                    type="button"
                    onClick={closeMaterial}
                    className="rounded-2xl border border-slate-700 bg-slate-800 px-7 py-3.5 font-black text-white transition hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-700 active:scale-95"
                  >
                    Close
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

    </>
  );
}