"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Pencil,
  X,
  Save,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";

interface ProductionHistoryProps {
  productionLogs: any[];

  onEditProduction?: (
    originalProduction: any,
    updatedData: {
      quantity: number;
      dough_batches: number;
      shift: string;
      waste_quantity: number;
    }
  ) => Promise<void>;

  onRefresh?: () => Promise<void>;
}

export default function ProductionHistory({
  productionLogs,
  onEditProduction,
  onRefresh,
}: ProductionHistoryProps) {
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All Shifts");

  const [editingProduction, setEditingProduction] =
    useState<any>(null);

  const [editQuantity, setEditQuantity] = useState("");
  const [editDoughBatches, setEditDoughBatches] =
    useState("");
  const [editShift, setEditShift] = useState("Morning");
  const [editWaste, setEditWaste] = useState("");

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * ==========================================
   * REALTIME
   * ==========================================
   */

  useEffect(() => {
    const channel = supabase
      .channel("production-history-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_logs",
        },
        async () => {
          if (onRefresh) {
            await onRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  /*
   * ==========================================
   * FILTER
   * ==========================================
   */

  const filteredLogs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return productionLogs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        String(log.bread || "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(log.batch || "")
          .toLowerCase()
          .includes(searchTerm);

      const matchesShift =
        shiftFilter === "All Shifts" ||
        log.shift === shiftFilter;

      return matchesSearch && matchesShift;
    });
  }, [productionLogs, search, shiftFilter]);

  /*
   * ==========================================
   * OPEN EDIT
   * ==========================================
   */

  function openEditProduction(log: any) {
    setEditingProduction(log);

    setEditQuantity(
      String(log.quantity ?? "")
    );

    setEditDoughBatches(
      String(log.dough_batches ?? "")
    );

    setEditShift(
      log.shift || "Morning"
    );

    setEditWaste(
      String(log.waste_quantity ?? 0)
    );
  }

  /*
   * ==========================================
   * CLOSE EDIT
   * ==========================================
   */

  function closeEdit() {
    if (saving) return;

    setEditingProduction(null);
    setEditQuantity("");
    setEditDoughBatches("");
    setEditShift("Morning");
    setEditWaste("");
  }

  /*
   * ==========================================
   * SAVE EDIT
   * ==========================================
   */

  async function handleSaveEdit() {
    if (!editingProduction || saving) return;

    const quantity = Number(editQuantity);
    const doughBatches = Number(editDoughBatches);
    const waste = Number(editWaste || 0);

    if (quantity <= 0) {
      alert("Production quantity must be greater than 0.");
      return;
    }

    if (doughBatches <= 0) {
      alert("Dough batches must be greater than 0.");
      return;
    }

    if (waste < 0) {
      alert("Waste cannot be negative.");
      return;
    }

    if (waste > quantity) {
      alert("Waste cannot be greater than production quantity.");
      return;
    }

    setSaving(true);

    try {
      /*
       * Send the edit to the parent.
       *
       * The parent should handle:
       * - restoring old inventory
       * - applying new inventory deduction
       * - adjusting finished product stock
       * - updating production_logs
       * - updating inventory_transactions
       */

      if (onEditProduction) {
        await onEditProduction(
          editingProduction,
          {
            quantity,
            dough_batches: doughBatches,
            shift: editShift,
            waste_quantity: waste,
          }
        );
      } else {
        /*
         * Fallback:
         * If no parent handler was supplied,
         * update production_logs directly.
         *
         * We intentionally keep this fallback simple.
         * The parent handler is recommended because
         * production quantity affects inventory.
         */

        const { error } = await supabase
          .from("production_logs")
          .update({
            quantity,
            dough_batches: doughBatches,
            shift: editShift,
            waste_quantity: waste,
          })
          .eq("id", editingProduction.id);

        if (error) {
          throw new Error(error.message);
        }
      }

      closeEdit();

    } catch (error: any) {
      console.error(
        "Edit production error:",
        error
      );

      alert(
        error?.message ||
          "Failed to update production."
      );

    } finally {
      setSaving(false);
    }
  }

  /*
   * ==========================================
   * MANUAL REFRESH
   * ==========================================
   */

  async function handleRefresh() {
    if (refreshing || !onRefresh) return;

    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  /*
   * ==========================================
   * SUMMARY
   * ==========================================
   */

  const totalProduced = filteredLogs.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const totalDough = filteredLogs.reduce(
    (sum, item) =>
      sum + Number(item.dough_batches || 0),
    0
  );

  return (
    <>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

          <div>
            <h2 className="text-3xl font-black text-[#071028]">
              Production History
            </h2>

            <p className="text-gray-500 mt-2">
              Daily production records and completed batches
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">

            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="border-2 border-slate-200 rounded-2xl pl-11 pr-5 py-3 w-72 focus:outline-none focus:border-[#071028]"
              />

            </div>

            <select
              value={shiftFilter}
              onChange={(e) =>
                setShiftFilter(e.target.value)
              }
              className="border-2 border-slate-200 rounded-2xl px-4 py-3"
            >
              <option>All Shifts</option>
              <option>Morning</option>
              <option>Night</option>
            </select>

            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#071028] text-white font-bold hover:bg-slate-800 transition disabled:opacity-50"
              >
                <RefreshCw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            )}

          </div>

        </div>

        {/* SUMMARY */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

          <div className="bg-slate-50 rounded-2xl p-6">
            <p className="text-gray-500">
              Production Records
            </p>

            <h2 className="text-4xl font-black text-[#071028] mt-2">
              {filteredLogs.length}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <p className="text-gray-500">
              Pieces Produced
            </p>

            <h2 className="text-4xl font-black text-green-600 mt-2">
              {totalProduced.toLocaleString()}
            </h2>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6">
            <p className="text-gray-500">
              Dough Batches
            </p>

            <h2 className="text-4xl font-black text-orange-500 mt-2">
              {totalDough.toLocaleString()}
            </h2>
          </div>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto rounded-3xl border border-slate-200">

          <table className="w-full">

            <thead>
              <tr className="bg-[#071028] text-white">

                <th className="p-5 text-left">
                  Product
                </th>

                <th className="p-5 text-center">
                  Shift
                </th>

                <th className="p-5 text-center">
                  Produced
                </th>

                <th className="p-5 text-center">
                  Waste
                </th>

                <th className="p-5 text-center">
                  Dough
                </th>

                <th className="p-5 text-center">
                  Net
                </th>

                <th className="p-5 text-center">
                  Status
                </th>

                <th className="p-5 text-center">
                  Action
                </th>

                <th className="p-5 text-right">
                  Date
                </th>

              </tr>
            </thead>

            <tbody>

              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-16 text-gray-500"
                  >
                    No production records found.
                  </td>
                </tr>
              )}

              {filteredLogs.map((log) => {

                const quantity =
                  Number(log.quantity || 0);

                const waste =
                  Number(log.waste_quantity || 0);

                const net =
                  quantity - waste;

                return (
                  <tr
                    key={log.id}
                    className="border-b hover:bg-slate-50 transition-all duration-200"
                  >

                    <td className="p-5">

                      <div className="flex items-center gap-4">

                        <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center text-xl">
                          🍞
                        </div>

                        <div>
                          <p className="font-bold text-[#071028]">
                            {log.bread}
                          </p>

                          <p className="text-sm text-gray-500">
                            Batch #{log.batch}
                          </p>
                        </div>

                      </div>

                    </td>

                    <td className="text-center">

                      <span className="inline-flex px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                        {log.shift}
                      </span>

                    </td>

                    <td className="text-center font-black text-blue-950 text-lg">
                      {quantity.toLocaleString()}
                    </td>

                    <td className="text-center font-black text-red-600">
                      {waste.toLocaleString()}
                    </td>

                    <td className="text-center font-black text-orange-500">
                      {log.dough_batches ?? "-"}
                    </td>

                    <td className="text-center font-black text-green-600 text-lg">
                      {net.toLocaleString()}
                    </td>

                    <td className="text-center">

                      <span className="inline-flex px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold">
                        ✅ Completed
                      </span>

                    </td>

                    {/* ACTION */}

                    <td className="text-center">

                      <button
                        onClick={() =>
                          openEditProduction(log)
                        }
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-900/10"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                    </td>

                    <td className="text-right text-gray-500 whitespace-nowrap pr-5">

                      {new Date(
                        log.created_at
                      ).toLocaleString(
                        "en-NG",
                        {
                          timeZone:
                            "Africa/Lagos",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }
                      )}

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

      </div>

      {/* ==========================================
          EDIT PRODUCTION MODAL
      ========================================== */}

      {editingProduction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">

          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={closeEdit}
          />

          <div className="relative w-full max-w-2xl bg-[#0b1424] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">

            {/* HEADER */}

            <div className="px-8 py-6 border-b border-slate-700 flex items-center justify-between">

              <div>

                <p className="text-blue-400 text-sm font-bold uppercase tracking-wider">
                  Edit Production
                </p>

                <h2 className="text-3xl font-black text-white mt-1">
                  {editingProduction.bread}
                </h2>

                <p className="text-slate-400 text-sm mt-1">
                  Batch #{editingProduction.batch}
                </p>

              </div>

              <button
                disabled={saving}
                onClick={closeEdit}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            {/* BODY */}

            <div className="p-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* PRODUCED */}

                <div>

                  <label className="block text-slate-300 text-sm font-bold mb-2">
                    Produced Pieces
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={editQuantity}
                    disabled={saving}
                    onChange={(e) =>
                      setEditQuantity(
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                  />

                </div>

                {/* DOUGH */}

                <div>

                  <label className="block text-slate-300 text-sm font-bold mb-2">
                    Dough Batches
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={editDoughBatches}
                    disabled={saving}
                    onChange={(e) =>
                      setEditDoughBatches(
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold outline-none focus:border-yellow-500 disabled:opacity-50"
                  />

                </div>

                {/* SHIFT */}

                <div>

                  <label className="block text-slate-300 text-sm font-bold mb-2">
                    Shift
                  </label>

                  <select
                    value={editShift}
                    disabled={saving}
                    onChange={(e) =>
                      setEditShift(
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="Morning">
                      Morning
                    </option>

                    <option value="Night">
                      Night
                    </option>
                  </select>

                </div>

                {/* WASTE */}

                <div>

                  <label className="block text-slate-300 text-sm font-bold mb-2">
                    Waste / Damaged
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={editWaste}
                    disabled={saving}
                    onChange={(e) =>
                      setEditWaste(
                        e.target.value
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold outline-none focus:border-red-500 disabled:opacity-50"
                  />

                </div>

              </div>

              {/* WARNING */}

              <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">

                <p className="text-yellow-300 text-sm leading-relaxed">

                  <strong>Important:</strong>{" "}
                  Changing production quantity or dough
                  batches affects raw-material consumption.
                  The production update should therefore
                  restore the old deduction and apply the
                  new calculation.

                </p>

              </div>

              {/* ACTIONS */}

              <div className="flex gap-3 mt-7">

                <button
                  disabled={saving}
                  onClick={closeEdit}
                  className="flex-1 px-5 py-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  onClick={handleSaveEdit}
                  className="flex-1 px-5 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>

        </div>
      )}
    </>
  );
}