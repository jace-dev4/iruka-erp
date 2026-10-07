"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import Sidebar from "@/components/Sidebar";

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-100">

      {/* =====================================================
          MOBILE HEADER
      ====================================================== */}

      <div className="fixed left-0 right-0 top-0 z-[60] flex h-14 items-center bg-[#071028] px-4 shadow-lg lg:hidden">

        <button
          type="button"
          onClick={() =>
            setSidebarOpen(!sidebarOpen)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={25} />
        </button>

        <h1 className="ml-3 font-black text-yellow-500">
          IRUKA ERP
        </h1>

      </div>


      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />


      {/* =====================================================
          MAIN ERP VIEWPORT
      ====================================================== */}

      <main
        className="
          min-h-screen
          min-w-0
          overflow-x-hidden
          lg:ml-[280px]
          lg:w-[calc(100%-280px)]
        "
      >

        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}

        <div
          className="
            min-w-0
            w-full
            p-4
            pt-20
            lg:p-8
            lg:pt-8
          "
        >
          {children}
        </div>

      </main>

    </div>
  );
}