"use client";

import { useState } from "react";

interface InventoryHistoryProps {
  transactions: any[];
}

export default function InventoryHistory({
  transactions,
}: InventoryHistoryProps) {

  const [historyLimit, setHistoryLimit] = useState(10);

  const displayedTransactions =
    transactions.slice(0, historyLimit);

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 p-8 mt-10">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">

        <div>

          <h2 className="text-3xl font-black text-white">
            Inventory History
          </h2>

          <p className="text-slate-400 mt-2">
            Latest inventory movements
          </p>

        </div>

        <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl">

          <span className="text-slate-400 text-sm">
            Showing{" "}
          </span>

          <span className="text-white font-bold">
            {Math.min(historyLimit, transactions.length)}
          </span>

          <span className="text-slate-400 text-sm">
            {" "}of{" "}
          </span>

          <span className="text-white font-bold">
            {transactions.length}
          </span>

        </div>

      </div>

      {/* TABLE */}

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr className="bg-[#071028] text-white">

              <th className="p-4 text-left">
                Material
              </th>

              <th className="p-4 text-center">
                Type
              </th>

              <th className="p-4 text-center">
                Quantity
              </th>

              <th className="p-4 text-center">
                Reference
              </th>

              <th className="p-4 text-right">
                Date
              </th>

            </tr>

          </thead>

          <tbody>

            {displayedTransactions.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="p-12 text-center text-slate-400"
                >
                  No inventory history found.
                </td>

              </tr>

            ) : (

              displayedTransactions.map((item) => (

                <tr
                  key={item.id}
                  className="border-b border-slate-700 hover:bg-slate-800 transition"
                >

                  {/* MATERIAL */}

                  <td className="p-4 font-bold text-white">
                    {item.material_name}
                  </td>

                  {/* TYPE */}

                  <td className="p-4 text-center">

                    {item.transaction_type === "RECEIVED" ? (

                      <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full font-bold text-sm">
                        Received
                      </span>

                    ) : item.transaction_type === "ISSUED" ? (

                      <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full font-bold text-sm">
                        Issued
                      </span>

                    ) : (

                      <span className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full font-bold text-sm">
                        Auto Deduction
                      </span>

                    )}

                  </td>

                  {/* QUANTITY */}

                  <td className="p-4 text-center text-amber-300 font-black">

                    {Number(
                      item.quantity_used || 0
                    ).toLocaleString()}

                  </td>

                  {/* REFERENCE */}

                  <td className="p-4 text-center text-slate-300">

                    {item.reference || "—"}

                  </td>

                  {/* DATE */}

                  <td className="p-4 text-right text-slate-400">

{item.created_at
  ? new Date(item.created_at).toLocaleString(
      "en-NG",
      {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      }
    )
  : "—"}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* LOAD MORE */}

      {transactions.length > historyLimit && (

        <div className="flex justify-center mt-8">

          <button
            onClick={() =>
              setHistoryLimit(
                (current) => current + 10
              )
            }
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-black transition shadow-lg"
          >

            Load More

          </button>

        </div>

      )}

      {/* SHOWING ALL */}

      {transactions.length > 0 &&
        transactions.length <= historyLimit && (

          <div className="text-center mt-8 text-slate-500 text-sm">

            Showing all {transactions.length} inventory transactions.

          </div>

        )}

    </div>
  );
}
