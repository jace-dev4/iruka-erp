
"use client";

import { useEffect, useState } from "react";

import ProtectedRoute from "@/components/ProtectedRoute";

import InventoryMaterials from "@/components/inventory/InventoryMaterials";
import InventoryHistory from "@/components/inventory/InventoryHistory";
import InventorySummary from "@/components/inventory/InventorySummary";

import { supabase } from "@/lib/supabase";

export default function InventoryPage() {
  /* =========================
     STATES
  ========================== */

  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  

  const [refreshing, setRefreshing] = useState(false);
  const [addingInventory, setAddingInventory] = useState(false);

  const [editingTransaction, setEditingTransaction] =
  useState<any | null>(null);

const [editQuantity, setEditQuantity] =
  useState("");

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  /* =========================
     NOTIFICATION
  ========================== */

  function showNotification(
    type: "success" | "error" | "info",
    message: string
  ) {
    setNotification({
      type,
      message,
    });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }

  /* =========================
     INITIAL FETCH + REALTIME
  ========================== */

  useEffect(() => {
    fetchInventory();

    const inventoryChannel = supabase
      .channel("inventory-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    const transactionChannel = supabase
      .channel("inventory-transactions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_transactions",
        },
        () => {
          fetchInventory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, []);

  /* =========================
     FETCH INVENTORY
  ========================== */

  async function fetchInventory(showRefreshMessage = false) {
    if (showRefreshMessage) {
      setRefreshing(true);
    }

    try {
      const [
        { data: inventoryData, error: inventoryError },
        { data: historyData, error: historyError },
      ] = await Promise.all([
        supabase
          .from("inventory")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("inventory_transactions")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (inventoryError) {
        throw inventoryError;
      }

      if (historyError) {
        throw historyError;
      }

      setInventory(inventoryData || []);
      setTransactions(historyData || []);

      if (showRefreshMessage) {
        showNotification(
          "success",
          "Inventory data refreshed successfully."
        );
      }
    } catch (error: any) {
      console.error("Inventory fetch error:", error);

      showNotification(
        "error",
        error?.message || "Unable to refresh inventory."
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* =========================
     ADD INVENTORY
  ========================== */

  async function addInventory() {
    if (!name || !quantity || !unit) {
      showNotification(
        "error",
        "Please select a material and enter quantity and unit."
      );
      return;
    }

    const numericQuantity = Number(quantity);

    if (numericQuantity <= 0) {
      showNotification(
        "error",
        "Quantity must be greater than zero."
      );
      return;
    }

    setAddingInventory(true);

    try {
      const existingMaterial = inventory.find(
        (item) =>
          item.name.toLowerCase().trim() ===
          name.toLowerCase().trim()
      );

      if (existingMaterial) {
        const newQuantity =
          Number(existingMaterial.quantity) +
          numericQuantity;

        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            quantity: newQuantity,
          })
          .eq("id", existingMaterial.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("inventory")
          .insert([
            {
              name,
              quantity: numericQuantity,
              unit,
            },
          ]);

        if (insertError) {
          throw insertError;
        }
      }

      /* =========================
         INVENTORY TRANSACTION
      ========================== */

      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            material_name: name,
            quantity_used: numericQuantity,
            transaction_type: "RECEIVED",
            reference: "Manual Stock Entry",
          },
        ]);

      if (transactionError) {
        throw transactionError;
      }

      setName("");
      setQuantity("");
      setUnit("");

      await fetchInventory();

      showNotification(
        "success",
        `${name} inventory received successfully.`
      );
    } catch (error: any) {
      console.error("Add inventory error:", error);

      showNotification(
        "error",
        error?.message || "Unable to add inventory."
      );
    } finally {
      setAddingInventory(false);
    }
  }

  /* =========================
   EDIT RECEIVED INVENTORY
========================== */

async function editReceivedInventory() {

  if (!editingTransaction) {
    return;
  }

  const newQuantity = Number(editQuantity);

  if (!Number.isFinite(newQuantity) || newQuantity < 0) {
    showNotification(
      "error",
      "Please enter a valid quantity."
    );
    return;
  }

  const oldQuantity =
    Number(editingTransaction.quantity_used || 0);

  const difference =
    newQuantity - oldQuantity;

  try {

    /* =========================
       FIND INVENTORY ITEM
    ========================== */

    const { data: inventoryItem, error: inventoryError } =
      await supabase
        .from("inventory")
        .select("*")
        .eq(
          "name",
          editingTransaction.material_name
        )
        .single();

    if (inventoryError) {
      throw inventoryError;
    }

    if (!inventoryItem) {
      throw new Error(
        "Inventory item not found."
      );
    }

    /* =========================
       CALCULATE CORRECT STOCK
    ========================== */

    const currentQuantity =
      Number(inventoryItem.quantity || 0);

    const correctedQuantity =
      currentQuantity + difference;

    if (correctedQuantity < 0) {
      throw new Error(
        "This correction would make inventory quantity negative."
      );
    }

    /* =========================
       UPDATE INVENTORY
    ========================== */

    const { error: inventoryUpdateError } =
      await supabase
        .from("inventory")
        .update({
          quantity: correctedQuantity,
        })
        .eq("id", inventoryItem.id);

    if (inventoryUpdateError) {
      throw inventoryUpdateError;
    }

    /* =========================
       UPDATE HISTORY ENTRY
    ========================== */

    const { error: transactionUpdateError } =
      await supabase
        .from("inventory_transactions")
        .update({
          quantity_used: newQuantity,
        })
        .eq(
          "id",
          editingTransaction.id
        );

    if (transactionUpdateError) {
      throw transactionUpdateError;
    }

    /* =========================
       CLOSE EDIT
    ========================== */

    setEditingTransaction(null);
    setEditQuantity("");

    await fetchInventory();

    showNotification(
      "success",
      `${editingTransaction.material_name} inventory entry corrected successfully.`
    );

  } catch (error: any) {

    console.error(
      "Edit inventory error:",
      error
    );

    showNotification(
      "error",
      error?.message ||
      "Unable to correct inventory entry."
    );
  }
}

/* =========================
   LOW STOCK CHECKER
========================== */

function isLowStock(item: any) {
  const quantity = Number(item.quantity || 0);

  const lowStockThresholds: Record<string, number> = {
    /* Production Ingredients */
    Flour: 400,
    Sugar: 50,
    Yeast: 0.5,
    Butter: 10,
    "Groundnut Oil": 5,

    /* Recipe Materials */
    "Iruka Recipe": 10,
    "White Recipe": 10,
    "Fruits Recipe": 10,

    /* Nylon Packaging */
    "Small Iruka Nylon": 1000,
    "Small Rosy Nylon": 1000,
    "Medium Iruka Nylon": 1000,
    "Medium Rosy Nylon": 1000,
    "Big Smart Nylon": 1000,
    "Classic Iruka Nylon": 1000,
    "Classic Fruits Nylon": 1000,
    "Jumbo Iruka Nylon": 1000,
    "Jumbo Fruits Nylon": 1000,
    "Big Brother Family Nylon": 1000,

    /* Other Packaging */
    Tape: 100,
    Twist: 2,

    /* Bakery Additives */
    Brown: 5,
    Resins: 1,
    Flavour: 1,
  };

  const threshold = lowStockThresholds[item.name];

  // If the material is not defined above,
  // keep the existing healthy state.
  if (threshold === undefined) {
    return false;
  }

  return quantity < threshold;
}

  /* =========================
     TOTAL MATERIALS
  ========================== */

  const totalMaterials = inventory.length;

  const lowStockCount = inventory.filter(
    (item) => isLowStock(item)
  ).length;

  return (
<ProtectedRoute
  allowedRoles={[
    "admin",
    "inventory officer",
  ]}
>
      <div className="min-h-screen p-6 lg:p-10 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">

        {/* =========================
            PREMIUM NOTIFICATION
        ========================== */}

        {notification && (
          <div className="fixed top-6 right-6 z-50 w-[calc(100%-3rem)] max-w-md">
            <div
              className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
                notification.type === "success"
                  ? "border-emerald-400/30 bg-emerald-950/90"
                  : notification.type === "error"
                  ? "border-red-400/30 bg-red-950/90"
                  : "border-blue-400/30 bg-blue-950/90"
              }`}
            >
              <div
                className={`absolute left-0 top-0 h-full w-1 ${
                  notification.type === "success"
                    ? "bg-emerald-400"
                    : notification.type === "error"
                    ? "bg-red-400"
                    : "bg-blue-400"
                }`}
              />

              <div className="flex items-start gap-4 p-5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    notification.type === "success"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : notification.type === "error"
                      ? "bg-red-400/15 text-red-300"
                      : "bg-blue-400/15 text-blue-300"
                  }`}
                >
                  <span className="text-xl">
                    {notification.type === "success"
                      ? "✓"
                      : notification.type === "error"
                      ? "!"
                      : "i"}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-wider text-white">
                    {notification.type === "success"
                      ? "Success"
                      : notification.type === "error"
                      ? "Action Failed"
                      : "Inventory Update"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {notification.message}
                  </p>
                </div>

                <button
                  onClick={() => setNotification(null)}
                  className="text-slate-500 transition hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================
            HEADER
        ========================== */}

        <div className="mb-10 overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/70 shadow-2xl backdrop-blur-xl">

          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-7 lg:p-10">

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-4 flex flex-wrap items-center gap-3">

                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-1.5 text-sm font-bold text-amber-300">
                    📦 INVENTORY MANAGEMENT
                  </span>

                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-sm text-slate-300">
                    📅{" "}
{new Date().toLocaleDateString(
  "en-GB",
  {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }
)}
                  </span>

                </div>

                <h1 className="text-4xl font-black tracking-tight text-white lg:text-5xl">
                  Smart Inventory Control
                </h1>

                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 lg:text-lg">
                  Monitor inventory levels, stock movements,
                  recipe materials and warehouse operations.
                </p>

              </div>

              <div className="flex items-center gap-4">

                {/* REFRESH BUTTON */}

                <button
                  onClick={() => fetchInventory(true)}
                  disabled={refreshing}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-slate-600 bg-slate-800/80 px-5 py-3.5 font-bold text-white shadow-lg transition-all duration-200 hover:border-blue-400/50 hover:bg-blue-900/50 hover:shadow-blue-950/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`text-xl ${
                      refreshing
                        ? "animate-spin"
                        : "transition-transform group-hover:rotate-180"
                    }`}
                  >
                    ↻
                  </span>

                  <span>
                    {refreshing
                      ? "Refreshing..."
                      : "Refresh"}
                  </span>
                </button>

                <div className="hidden h-28 w-28 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-6xl shadow-inner lg:flex">
                  📦
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* =========================
            SUMMARY
        ========================== */}

        <InventorySummary
          totalMaterials={totalMaterials}
          lowStockCount={lowStockCount}
        />

        {/* =========================
            LOW STOCK ALERTS
        ========================== */}

        {lowStockCount > 0 && (
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-red-400/30 bg-gradient-to-br from-red-950/80 via-slate-900 to-red-950/60 p-6 shadow-2xl">

            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />

            <div className="relative">

              <div className="mb-5 flex items-center justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10 text-2xl">
                    ⚠
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Low Stock Warnings
                    </h2>

                    <p className="text-sm text-red-200/70">
                      Immediate attention may be required.
                    </p>
                  </div>

                </div>

                <span className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300">
                  {lowStockCount}{" "}
                  {lowStockCount === 1
                    ? "ITEM"
                    : "ITEMS"}
                </span>

              </div>

              <div className="grid gap-3 md:grid-cols-2">

                {inventory
                  .filter((item) =>
                    isLowStock(item)
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-red-400/20 bg-slate-950/70 p-4 transition hover:border-red-400/40"
                    >

                      <div className="flex items-center gap-3">

                        <span className="text-xl">
                          🔴
                        </span>

                        <div>
                          <p className="font-black text-white">
                            {item.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            Current stock level
                          </p>
                        </div>

                      </div>

                      <div className="text-right">

                        <p className="text-lg font-black text-red-300">
                          {item.quantity}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.unit}
                        </p>

                      </div>

                    </div>
                  ))}

              </div>

            </div>

          </div>
        )}

        {/* =========================
            ADD INVENTORY
        ========================== */}

        <div className="relative mb-10 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/90 shadow-2xl">

          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative p-7 lg:p-8">

            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl shadow-lg">
                  📥
                </div>

                <div>

                  <h2 className="text-2xl font-black text-white lg:text-3xl">
                    Add Inventory
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Record incoming materials and update warehouse stock.
                  </p>

                </div>

              </div>

              <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                ● Live Inventory
              </div>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Material
                </label>

                <select
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                >
                  <option value="">
                    Select Material
                  </option>

                  <optgroup label="🍞 Production Ingredients">
                    <option value="Flour">Flour</option>
                    <option value="Sugar">Sugar</option>
                    <option value="Butter">Butter</option>
                    <option value="Yeast">Yeast</option>
                    <option value="Groundnut Oil">
                      Groundnut Oil
                    </option>
                  </optgroup>

                  <optgroup label="🥖 Bakery Recipes">
                    <option value="Iruka Recipe">
                      Iruka Recipe
                    </option>
                    <option value="White Recipe">
                      White Recipe
                    </option>
                    <option value="Fruits Recipe">
                      Fruits Recipe
                    </option>
                  </optgroup>

                  <optgroup label="📦 Nylon Packaging">
                    <option value="Small Iruka Nylon">
                      Small Iruka Nylon
                    </option>
                    <option value="Small Rosy Nylon">
                      Small Rosy Nylon
                    </option>
                    <option value="Medium Iruka Nylon">
                      Medium Iruka Nylon
                    </option>
                    <option value="Medium Rosy Nylon">
                      Medium Rosy Nylon
                    </option>
                    <option value="Big Smart Nylon">
                      Big Smart Nylon
                    </option>
                    <option value="Classic Iruka Nylon">
                      Classic Iruka Nylon
                    </option>
                    <option value="Classic Fruits Nylon">
                      Classic Fruits Nylon
                    </option>
                    <option value="Jumbo Iruka Nylon">
                      Jumbo Iruka Nylon
                    </option>
                    <option value="Jumbo Fruits Nylon">
                      Jumbo Fruits Nylon
                    </option>
                    <option value="Big Brother Family Nylon">
                      Big Brother Family Nylon
                    </option>
                  </optgroup>

                  <optgroup label="📦 Other Packaging">
                    <option value="Tape">Tape</option>
                    <option value="Twist">Twist</option>
                  </optgroup>

                  <optgroup label="🧪 Bakery Additives">
                    <option value="Brown">Brown</option>
                    <option value="Resins">Resins</option>
                    <option value="Flavour">Flavour</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Unit
                </label>

                <input
                  type="text"
                  placeholder="e.g. bags, kg, litres"
                  value={unit}
                  onChange={(e) =>
                    setUnit(e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-white placeholder-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>

            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">

              <button
                onClick={addInventory}
                disabled={addingInventory}
                className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 px-8 py-4 font-black text-slate-950 shadow-xl shadow-orange-950/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-orange-900/40 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <span className="text-xl">
                  {addingInventory
                    ? "⟳"
                    : "＋"}
                </span>

                <span>
                  {addingInventory
                    ? "Adding Inventory..."
                    : "Add Inventory"}
                </span>

              </button>

              <p className="text-sm text-slate-500">
                Stock changes are automatically recorded in inventory history.
              </p>

            </div>

          </div>

        </div>

        {/* =========================
            INVENTORY TABLE
        ========================== */}

        <InventoryMaterials
          inventory={inventory}
          isLowStock={isLowStock}
        />

        {/* =========================
            RECIPE INVENTORY
        ========================== */}

        <div className="mt-10">

          <div className="mb-6 flex items-center justify-between">

            <div>
              <h2 className="text-3xl font-black text-white">
                🥖 Recipe Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Current recipe material availability.
              </p>
            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-3">

            {inventory
              .filter((item) =>
                [
                  "Iruka Recipe",
                  "White Recipe",
                  "Fruits Recipe",
                ].includes(item.name)
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 p-6 text-white shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >

                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative">

                    <div className="flex items-center justify-between">

                      <h3 className="text-2xl font-black">
                        {item.name}
                      </h3>

                      <span className="rounded-xl bg-white/15 px-3 py-2 text-xl">
                        🥖
                      </span>

                    </div>

                    <p className="mt-5 text-5xl font-black">
                      {item.quantity}
                    </p>

                    <p className="mt-1 font-medium text-white/80">
                      Recipe Packs
                    </p>

                  </div>

                </div>
              ))}

          </div>

        </div>

        {/* =========================
            INVENTORY HISTORY
        ========================== */}

        <div className="mt-10">

<InventoryHistory
  transactions={transactions}
  onEditReceived={(transaction) => {
    setEditingTransaction(transaction);
    setEditQuantity(
      String(transaction.quantity_used || "")
    );
  }}
/>

        </div>

      </div>

      {/* =========================
          EDIT INVENTORY MODAL
      ========================== */}

      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">

          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">

            <h2 className="text-2xl font-black text-white">
              Edit Inventory Entry
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Correct the quantity originally received.
            </p>

            {/* MATERIAL */}

            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-4">

              <p className="text-xs uppercase tracking-wider text-slate-500">
                Material
              </p>

              <p className="mt-1 text-lg font-black text-white">
                {editingTransaction.material_name}
              </p>

            </div>

            {/* OLD QUANTITY */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-400">
                Original Quantity
              </label>

              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400">
                {Number(
                  editingTransaction.quantity_used || 0
                ).toLocaleString()}
              </div>

            </div>

            {/* NEW QUANTITY */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-300">
                Correct Quantity
              </label>

              <input
                type="number"
                min="0"
                step="any"
                value={editQuantity}
                onChange={(e) =>
                  setEditQuantity(e.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10"
              />

            </div>

            {/* BUTTONS */}

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setEditQuantity("");
                }}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold text-white transition hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={editReceivedInventory}
                className="flex-1 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-400"
              >
                Save Correction
              </button>

            </div>

          </div>

        </div>
      )}

    </ProtectedRoute>
  );
}