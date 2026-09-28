
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

export default function InventoryMaterials({
  inventory,
  isLowStock,
  showNotification,
  onInventoryUpdated,
}: InventoryMaterialsProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editUnitCost, setEditUnitCost] = useState("");
  const [editReorderLevel, setEditReorderLevel] = useState("");

  const [saving, setSaving] = useState(false);

  /* =========================
     PREMIUM NOTIFICATION FALLBACK
  ========================== */

  function notify(
    type: "success" | "error",
    message: string
  ) {
    if (showNotification) {
      showNotification(type, message);
    }
  }

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
     OPEN MATERIAL
  ========================== */

  function openMaterial(item: any) {
    setSelectedMaterial(item);
    setIsEditing(false);

    setEditName(item.name || "");
    setEditQuantity(String(item.quantity ?? ""));
    setEditUnit(item.unit || "");
    setEditUnitCost(String(item.unit_cost ?? ""));
    setEditReorderLevel(String(item.reorder_level ?? ""));
  }

  /* =========================
     START EDITING
  ========================== */

  function startEditing() {
    if (!selectedMaterial) return;

    setEditName(selectedMaterial.name || "");
    setEditQuantity(
      String(selectedMaterial.quantity ?? "")
    );
    setEditUnit(selectedMaterial.unit || "");
    setEditUnitCost(
      String(selectedMaterial.unit_cost ?? "")
    );
    setEditReorderLevel(
      String(selectedMaterial.reorder_level ?? "")
    );

    setIsEditing(true);
  }

  /* =========================
     CANCEL EDITING
  ========================== */

  function cancelEditing() {
    if (!selectedMaterial) return;

    setEditName(selectedMaterial.name || "");
    setEditQuantity(
      String(selectedMaterial.quantity ?? "")
    );
    setEditUnit(selectedMaterial.unit || "");
    setEditUnitCost(
      String(selectedMaterial.unit_cost ?? "")
    );
    setEditReorderLevel(
      String(selectedMaterial.reorder_level ?? "")
    );

    setIsEditing(false);
  }

  /* =========================
     SAVE MATERIAL
  ========================== */

  async function saveMaterial() {
    if (!selectedMaterial || saving) {
      return;
    }

    const trimmedName = editName.trim();
    const trimmedUnit = editUnit.trim();

    const quantity = Number(editQuantity);

    const unitCost =
      editUnitCost.trim() === ""
        ? 0
        : Number(editUnitCost);

    const reorderLevel =
      editReorderLevel.trim() === ""
        ? 0
        : Number(editReorderLevel);

    /* =========================
       VALIDATION
    ========================== */

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

    /* =========================
       CHECK DUPLICATE NAME
    ========================== */

    const duplicate = inventory.find(
      (item) =>
        item.id !== selectedMaterial.id &&
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

      /* =========================
         UPDATE DATABASE
      ========================== */

      const { data, error } = await supabase
        .from("inventory")
        .update({
          name: trimmedName,
          quantity,
          unit: trimmedUnit,
          unit_cost: unitCost,
          reorder_level: Math.round(reorderLevel),
        })
        .eq("id", selectedMaterial.id)
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

      /* =========================
         UPDATE MODAL
      ========================== */

      setSelectedMaterial(data);

      setEditName(data.name || "");
      setEditQuantity(
        String(data.quantity ?? "")
      );
      setEditUnit(data.unit || "");
      setEditUnitCost(
        String(data.unit_cost ?? "")
      );
      setEditReorderLevel(
        String(data.reorder_level ?? "")
      );

      setIsEditing(false);

      /* =========================
         REFRESH PARENT INVENTORY
      ========================== */

      if (onInventoryUpdated) {
        await onInventoryUpdated();
      }

      /* =========================
         SUCCESS NOTIFICATION
      ========================== */

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

  /* =========================
     SECTION COMPONENT
  ========================== */

  function Section(
    title: string,
    icon: string,
    items: any[]
  ) {
    return (
      <div className="mb-10">

        <div className="mb-6 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-xl shadow-lg">
            {icon}
          </div>

          <h2 className="text-2xl font-black text-white">
            {title}
          </h2>

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
                onClick={() => openMaterial(item)}
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
                      {Number(
                        item.quantity || 0
                      ).toLocaleString()}
                    </p>

                  </div>

                  <div className="mt-6">

                    <div className="mb-2 flex justify-between text-xs text-slate-400">

                      <span>
                        Inventory Level
                      </span>

                      <span>
                        {isLowStock(item)
                          ? "Needs Restock"
                          : "Healthy"}
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

      {/* =========================
          MATERIAL DETAILS MODAL
      ========================== */}

      {selectedMaterial && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={() => {
            if (!saving) {
              setSelectedMaterial(null);
              setIsEditing(false);
            }
          }}
        >

          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

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
                    {isEditing
                      ? "Update the material information and inventory settings."
                      : "Detailed material information and inventory status."}
                  </p>

                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setSelectedMaterial(null);
                    setIsEditing(false);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-xl text-slate-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ×
                </button>

              </div>

              {isEditing ? (

                /* =========================
                   EDIT FORM
                ========================== */

                <div className="mt-8 space-y-5">

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Material Name
                    </label>

                    <input
                      type="text"
                      value={editName}
                      onChange={(e) =>
                        setEditName(e.target.value)
                      }
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Quantity
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Unit
                    </label>

                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) =>
                        setEditUnit(e.target.value)
                      }
                      disabled={saving}
                      placeholder="e.g. bags, cartons, kg, packs"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-300">
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-sm font-bold text-slate-300">
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
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                  </div>

                  {/* EDIT ACTIONS */}

                  <div className="mt-8 grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      disabled={saving}
                      onClick={cancelEditing}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 font-bold text-white transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveMaterial}
                      className="rounded-xl bg-amber-500 px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">

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

                /* =========================
                   VIEW MODE
                ========================== */

                <>

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
                        {selectedMaterial.unit ||
                          "Unit not set"}
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
                          isLowStock(
                            selectedMaterial
                          )
                            ? "text-red-300"
                            : "text-emerald-300"
                        }`}
                      >
                        {isLowStock(
                          selectedMaterial
                        )
                          ? "LOW STOCK"
                          : "HEALTHY"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {isLowStock(
                          selectedMaterial
                        )
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
                          {selectedMaterial.unit ||
                            "Not set"}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">

                        <span className="text-sm text-slate-400">
                          Quantity
                        </span>

                        <span className="font-black text-amber-300">
                          {Number(
                            selectedMaterial.quantity ||
                              0
                          ).toLocaleString()}{" "}
                          {selectedMaterial.unit ||
                            ""}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">

                        <span className="text-sm text-slate-400">
                          Unit Cost
                        </span>

                        <span className="font-bold text-white">
                          ₦
                          {Number(
                            selectedMaterial.unit_cost ||
                              0
                          ).toLocaleString(
                            "en-NG"
                          )}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">

                        <span className="text-sm text-slate-400">
                          Reorder Level
                        </span>

                        <span className="font-bold text-white">
                          {Number(
                            selectedMaterial.reorder_level ||
                              0
                          ).toLocaleString()}{" "}
                          {selectedMaterial.unit ||
                            ""}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-4 px-5 py-4">

                        <span className="text-sm text-slate-400">
                          Date Added
                        </span>

                        <span className="text-right text-sm font-semibold text-white">
                          {formatDate(
                            selectedMaterial.created_at
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* SYSTEM REFERENCE */}

                  <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">

                    <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
                      System Reference
                    </p>

                    <p className="mt-2 break-all font-mono text-sm text-slate-300">
                      {selectedMaterial.id}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      This unique ID identifies this material
                      record in the ERP database.
                    </p>

                  </div>

                  {/* VIEW ACTIONS */}

                  <div className="mt-6 grid grid-cols-2 gap-3">

                    <button
                      type="button"
                      onClick={startEditing}
                      className="rounded-2xl bg-amber-500 px-6 py-4 font-black text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-400"
                    >
                      Edit Material
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMaterial(null);
                        setIsEditing(false);
                      }}
                      className="rounded-2xl border border-slate-700 bg-slate-800 px-6 py-4 font-black text-white transition hover:border-amber-400/40 hover:bg-slate-700"
                    >
                      Close
                    </button>

                  </div>

                </>

              )}

            </div>

          </div>

        </div>

      )}

    </>
  );
}