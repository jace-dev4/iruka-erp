"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  AlertTriangle,
  Boxes,
  Banknote,
  ChevronRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

useEffect(() => {
  fetchProducts();

  const channel = supabase
    .channel("products-live-updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "products",
      },
      (payload) => {
        console.log("Products table changed:", payload);

        fetchProducts();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  async function fetchProducts(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Products error:", error);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  /* ============================
        SEARCH
  ============================ */

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();

      return (
        name.includes(searchTerm) ||
        sku.includes(searchTerm)
      );
    });
  }, [products, search]);

  /* ============================
        KPIs
  ============================ */

  const totalStock = useMemo(() => {
    return products.reduce(
      (sum, product) =>
        sum + Number(product.stock || 0),
      0
    );
  }, [products]);

  const inventoryValue = useMemo(() => {
    return products.reduce(
      (sum, product) =>
        sum +
        Number(product.stock || 0) *
          Number(product.price || 0),
      0
    );
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock || 0) <=
        Number(product.reorder_level || 20)
    ).length;
  }, [products]);

  /* ============================
        DATE
  ============================ */

  const today = new Date();

  const formattedDate = today.toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  /* ============================
        STATUS
  ============================ */

  function getProductStatus(product: any) {
    const stock = Number(product.stock || 0);
    const reorderLevel = Number(
      product.reorder_level || 20
    );

    if (stock === 0) {
      return {
        label: "Out of Stock",
        className:
          "bg-red-500/10 text-red-400 border-red-500/20",
        dot: "bg-red-400",
      };
    }

    if (stock <= reorderLevel) {
      return {
        label: "Low Stock",
        className:
          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        dot: "bg-yellow-400",
      };
    }

    return {
      label: "Available",
      className:
        "bg-green-500/10 text-green-400 border-green-500/20",
      dot: "bg-green-400",
    };
  }

  /* ============================
        LOADING
  ============================ */



return (
  <ProtectedRoute
    allowedRoles={[
      "admin",
      "accountant",
      "cashier",
    ]}
  >
    <div className="min-h-screen bg-[#08111f] -m-6 p-6 md:p-8">

      {/* =====================================================
            HEADER
      ===================================================== */}

      <div className="relative overflow-hidden rounded-[32px] border border-slate-700 bg-gradient-to-br from-[#0d1b35] via-[#101f3d] to-[#172b52] p-7 md:p-9 shadow-2xl mb-8">

        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-yellow-500/5 blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-7">

          <div>

            <div className="flex items-center gap-3 mb-4">

              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">

                <Package
                  size={25}
                  className="text-blue-400"
                />

              </div>

              <span className="text-blue-400 font-semibold tracking-wide">
                INVENTORY MANAGEMENT
              </span>

            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Products
            </h1>

            <p className="text-slate-400 mt-3 text-base md:text-lg">
              Manage bakery products, pricing and finished-goods inventory.
            </p>

          </div>

          <div className="flex flex-col sm:flex-row gap-4">

            <div className="rounded-2xl bg-slate-950/50 border border-slate-700 px-5 py-4">

              <div className="flex items-center gap-3">

                <CalendarDays
                  size={20}
                  className="text-yellow-400"
                />

                <div>

                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Today
                  </p>

                  <p className="text-white font-semibold mt-1">
                    {formattedDate}
                  </p>

                </div>

              </div>

            </div>

            <button
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 px-6 py-4 text-slate-950 font-bold transition shadow-lg shadow-yellow-500/10"
            >

              <RefreshCw
                size={19}
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

          </div>

        </div>

      </div>


      {/* =====================================================
            KPI CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

        {/* TOTAL PRODUCTS */}

        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-slate-400 text-sm font-medium">
                Total Products
              </p>

              <h2 className="text-4xl font-black text-white mt-3">
                {products.length}
              </h2>

              <p className="text-green-400 text-sm mt-3">
                Active product catalog
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">

              <Package
                size={24}
                className="text-blue-400"
              />

            </div>

          </div>

        </div>


        {/* TOTAL STOCK */}

        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-slate-400 text-sm font-medium">
                Total Stock
              </p>

              <h2 className="text-4xl font-black text-white mt-3">
                {totalStock.toLocaleString()}
              </h2>

              <p className="text-green-400 text-sm mt-3">
                Finished goods available
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">

              <Boxes
                size={24}
                className="text-green-400"
              />

            </div>

          </div>

        </div>


        {/* INVENTORY VALUE */}

        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-slate-400 text-sm font-medium">
                Inventory Value
              </p>

              <h2 className="text-3xl md:text-4xl font-black text-white mt-3">
                ₦{inventoryValue.toLocaleString()}
              </h2>

              <p className="text-purple-400 text-sm mt-3">
                Current stock value
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">

              <Banknote
                size={24}
                className="text-purple-400"
              />

            </div>

          </div>

        </div>


        {/* LOW STOCK */}

        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-slate-400 text-sm font-medium">
                Low Stock
              </p>

              <h2 className="text-4xl font-black text-white mt-3">
                {lowStockCount}
              </h2>

              <p className="text-yellow-400 text-sm mt-3">
                Products needing attention
              </p>

            </div>

            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">

              <AlertTriangle
                size={24}
                className="text-yellow-400"
              />

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
            SEARCH
      ===================================================== */}

      <div className="rounded-3xl border border-slate-700 bg-slate-900/80 shadow-xl p-5 mb-8">

        <div className="flex flex-col lg:flex-row lg:items-center gap-4">

          <div className="relative flex-1">

            <Search
              size={21}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by product name or SKU..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 py-4 pl-14 pr-5 text-white placeholder:text-slate-500 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/10 transition"
            />

          </div>

          <div className="rounded-2xl bg-slate-800 border border-slate-700 px-5 py-4">

            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Showing
            </p>

            <p className="text-white font-bold mt-1">
              {filteredProducts.length} of{" "}
              {products.length} Products
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
            PRODUCT TABLE
      ===================================================== */}

      <div className="rounded-3xl border border-slate-700 bg-slate-900/80 shadow-2xl overflow-hidden">

        <div className="px-6 md:px-8 py-6 border-b border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>

            <h2 className="text-2xl font-bold text-white">
              Bakery Products
            </h2>

            <p className="text-slate-400 mt-1">
              Select a product to view its complete information.
            </p>

          </div>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold"
            >
              Clear Search
            </button>
          )}

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead>

              <tr className="bg-slate-800/80 border-b border-slate-700">

                <th className="px-7 py-5 text-left text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Product
                </th>

                <th className="px-7 py-5 text-left text-xs uppercase tracking-wider text-slate-400 font-bold">
                  SKU
                </th>

                <th className="px-7 py-5 text-left text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Stock
                </th>

                <th className="px-7 py-5 text-left text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Price
                </th>

                <th className="px-7 py-5 text-left text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Status
                </th>

                <th className="px-7 py-5 text-right text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredProducts.map((product) => {

                const status =
                  getProductStatus(product);

                return (

                  <tr
                    key={product.id}
                    onClick={() =>
                      router.push(
                        `/products/${product.id}?from=products`
                      )
                    }
                    className="group border-b border-slate-800 hover:bg-slate-800/50 transition cursor-pointer"
                  >

                    {/* PRODUCT */}

                    <td className="px-7 py-6">

                      <div className="flex items-center gap-4">

                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">

                          {product.image_url ? (

                            <img
                              src={product.image_url}
                              alt={product.name || "Product"}
                              className="w-14 h-14 object-contain"
                            />

                          ) : (

                            <Package
                              size={28}
                              className="text-slate-600"
                            />

                          )}

                        </div>

                        <div>

                          <h3 className="text-base font-bold text-white group-hover:text-yellow-400 transition">
                            {product.name ||
                              "Unnamed Product"}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            Product ID: {product.id}
                          </p>

                        </div>

                      </div>

                    </td>


                    {/* SKU */}

                    <td className="px-7 py-6">

                      <span className="text-slate-300 font-medium">
                        {product.sku || "N/A"}
                      </span>

                    </td>


                    {/* STOCK */}

                    <td className="px-7 py-6">

                      <div>

                        <span className="text-lg font-bold text-white">
                          {Number(
                            product.stock || 0
                          ).toLocaleString()}
                        </span>

                        <p className="text-xs text-slate-500 mt-1">
                          units available
                        </p>

                      </div>

                    </td>


                    {/* PRICE */}

                    <td className="px-7 py-6">

                      <span className="text-lg font-bold text-green-400">
                        ₦
                        {Number(
                          product.price || 0
                        ).toLocaleString()}
                      </span>

                    </td>


                    {/* STATUS */}

                    <td className="px-7 py-6">

                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${status.className}`}
                      >

                        <span
                          className={`w-2 h-2 rounded-full ${status.dot}`}
                        />

                        {status.label}

                      </span>

                    </td>


                    {/* ACTION */}

                    <td className="px-7 py-6 text-right">

                      <button
                        onClick={(event) => {
                          event.stopPropagation();

                          router.push(
                            `/products/${product.id}?from=products`
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-bold text-white transition"
                      >

                        View Product

                        <ChevronRight
                          size={17}
                        />

                      </button>

                    </td>

                  </tr>

                );
              })}


              {/* EMPTY */}

              {filteredProducts.length === 0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="py-24 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center">

                        <Search
                          size={34}
                          className="text-slate-600"
                        />

                      </div>

                      <h3 className="text-2xl font-bold text-white mt-6">
                        No Products Found
                      </h3>

                      <p className="text-slate-400 mt-2">
                        No products match "{search}".
                      </p>

                      <button
                        onClick={() =>
                          setSearch("")
                        }
                        className="mt-6 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition"
                      >
                        Clear Search
                      </button>

                    </div>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  </ProtectedRoute>
);
}