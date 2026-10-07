"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import { useBranch } from "@/app/context/BranchContext";
import { supabase } from "@/lib/supabase";

import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Factory,
  Boxes,
  Package,
  BarChart3,
  Users,
  Settings,
  Receipt,
  LogOut,
  X,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Building2,
  ChevronDown,
  Check,
  Globe2,
} from "lucide-react";

const menuByRole = {
  admin: [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Customer Orders",
      href: "/orders",
      icon: ShoppingCart,
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Production",
      href: "/production",
      icon: Factory,
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Boxes,
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
    {
      name: "Finance",
      href: "/finance",
      icon: Receipt,
    },
    {
      name: "Debtors",
      href: "/debtors",
      icon: Wallet,
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Staff",
      href: "/staff",
      icon: Users,
    },
    {
      name: "Payroll",
      href: "/payroll",
      icon: Wallet,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ],

  "inventory officer": [
    {
      name: "Inventory",
      href: "/inventory",
      icon: Boxes,
    },
  ],

  cashier: [
    {
      name: "Customer Orders",
      href: "/orders",
      icon: ShoppingCart,
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Debtors",
      href: "/debtors",
      icon: Wallet,
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
  ],

  management: [
    {
      name: "Staff",
      href: "/staff",
      icon: Users,
    },
  ],

  accountant: [
    {
      name: "Production",
      href: "/production",
      icon: Factory,
    },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
    {
      name: "Finance",
      href: "/finance",
      icon: Receipt,
    },
  ],
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const {
  branches,
  currentBranch,
  isAllBranches,
  canAccessAllBranches,
  setCurrentBranch,
  selectAllBranches,
  loading: branchLoading,
} = useBranch();

const [branchMenuOpen, setBranchMenuOpen] =
  useState(false);

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const menu =
    menuByRole[
      role as keyof typeof menuByRole
    ] || [];

  /* =========================
     LOGOUT
  ========================== */

  const handleLogout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await supabase.auth.signOut();

      localStorage.removeItem("role");

      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      {/* =========================
          MOBILE OVERLAY
      ========================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =========================
          SIDEBAR
      ========================== */}

      <div
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-[280px]
          flex-col justify-between
          overflow-y-auto
          border-r border-white/[0.06]
          bg-[#071028]
          text-white
          shadow-2xl shadow-black/30
          transition-transform duration-300

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          lg:translate-x-0
        `}
      >

        {/* =========================
            MAIN SIDEBAR CONTENT
        ========================== */}

        <div>

          {/* Mobile Close */}

          <div className="flex justify-end p-4 lg:hidden">

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <X size={21} />
            </button>

          </div>

          {/* =========================
              LOGO
          ========================== */}

          <div className="border-b border-white/[0.06] p-6 text-center">

            <div className="relative mx-auto mb-3 flex h-[80px] w-[80px] items-center justify-center">

              <div className="absolute inset-0 rounded-full bg-yellow-500/10 blur-xl" />

              <Image
                src="/logo/nkiruka-logo.png"
                alt="NKIRUKA Logo"
                width={80}
                height={80}
                className="relative mx-auto"
              />

            </div>

            <h1 className="text-lg font-black tracking-tight text-yellow-500">
              NKIRUKA / IRUKA
            </h1>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Industries Ltd
            </p>

          </div>

{/* =========================
    BRANCH SELECTOR
========================= */}

<div className="p-5">
  <div className="relative">

    <button
      type="button"
      disabled={branchLoading}
      onClick={() =>
        setBranchMenuOpen(!branchMenuOpen)
      }
      className="
        flex w-full items-center
        justify-between
        gap-3
        rounded-2xl
        border border-white/[0.06]
        bg-[#0d1838]
        p-4
        text-left
        shadow-lg
        transition-all
        hover:border-yellow-400/30
        hover:bg-[#101d40]
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >
      <div className="flex min-w-0 items-center gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
          {isAllBranches ? (
            <Globe2 size={19} />
          ) : (
            <Building2 size={19} />
          )}
        </div>

        <div className="min-w-0">

          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
            Current Branch
          </p>

          <p className="truncate text-sm font-black text-white">
            {branchLoading
              ? "Loading..."
              : isAllBranches
              ? "All Branches"
              : currentBranch?.branch_name ||
                "Select Branch"}
          </p>

        </div>
      </div>

      <ChevronDown
        size={18}
        className={`shrink-0 text-gray-500 transition-transform ${
          branchMenuOpen
            ? "rotate-180 text-yellow-400"
            : ""
        }`}
      />
    </button>

    {branchMenuOpen && !branchLoading && (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() =>
            setBranchMenuOpen(false)
          }
        />

        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1428] shadow-2xl">

          <div className="border-b border-white/[0.06] bg-[#071028] px-4 py-4">

            <p className="text-sm font-black text-white">
              Select Branch
            </p>

            <p className="mt-1 text-[10px] text-gray-500">
              Choose your working branch
            </p>

          </div>

          <div className="max-h-[300px] overflow-y-auto p-2">

            {branches.map((branch) => {

              const selected =
                !isAllBranches &&
                currentBranch?.id === branch.id;

              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    setCurrentBranch(branch.id);
                    setBranchMenuOpen(false);
                  }}
                  className={`
                    flex w-full items-center justify-between
                    rounded-xl px-3 py-3 text-left transition-all
                    ${
                      selected
                        ? "bg-yellow-400/10 text-white"
                        : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                    }
                  `}
                >

                  <div className="flex items-center gap-3">

                    <div
                      className={`
                        flex h-9 w-9 items-center justify-center rounded-xl
                        ${
                          selected
                            ? "bg-yellow-400 text-black"
                            : "bg-white/[0.05] text-gray-500"
                        }
                      `}
                    >
                      <Building2 size={16} />
                    </div>

                    <div>

                      <p className="text-sm font-bold">
                        {branch.branch_name}
                      </p>

                      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                        {branch.branch_code}
                      </p>

                    </div>

                  </div>

                  {selected && (
                    <Check
                      size={17}
                      className="text-emerald-400"
                    />
                  )}

                </button>
              );
            })}

            {canAccessAllBranches && (
              <>
                <div className="my-2 border-t border-white/[0.06]" />

                <button
                  type="button"
                  onClick={() => {
                    selectAllBranches();
                    setBranchMenuOpen(false);
                  }}
                  className={`
                    flex w-full items-center justify-between
                    rounded-xl px-3 py-3 text-left transition-all
                    ${
                      isAllBranches
                        ? "bg-blue-500/10 text-white"
                        : "text-gray-300 hover:bg-white/[0.05]"
                    }
                  `}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-gray-500">
                      <Globe2 size={16} />
                    </div>

                    <div>

                      <p className="text-sm font-bold">
                        All Branches
                      </p>

                      <p className="text-[9px] text-gray-500">
                        Company-wide view
                      </p>

                    </div>

                  </div>

                  {isAllBranches && (
                    <Check
                      size={17}
                      className="text-emerald-400"
                    />
                  )}

                </button>
              </>
            )}

          </div>
        </div>
      </>
    )}

  </div>
</div>

          {/* =========================
              MENU
          ========================== */}

          <div className="space-y-2 px-4">

            {!role
              ? null
              : menu.map((item) => {

                  const Icon = item.icon;

                  const active =
                    pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() =>
                        setSidebarOpen(false)
                      }
                      className={
                        active
                          ? "group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-4 font-bold text-black shadow-lg shadow-yellow-950/20 transition-all"
                          : "group flex items-center gap-4 rounded-2xl border border-transparent px-5 py-4 text-gray-300 transition-all hover:border-white/[0.05] hover:bg-[#0d1838] hover:text-white"
                      }
                    >

                      <Icon
                        size={21}
                        className={
                          active
                            ? "text-black"
                            : "text-gray-400 transition-colors group-hover:text-yellow-400"
                        }
                      />

                      <span>
                        {item.name}
                      </span>

                      {active && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-black/60" />
                      )}

                    </Link>
                  );
                })}

          </div>

        </div>

        {/* =========================
            LOGOUT AREA
        ========================== */}

        <div className="border-t border-white/[0.06] p-5">

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            disabled={loggingOut}
            className="
              group relative w-full overflow-hidden
              rounded-2xl
              border border-red-500/20
              bg-red-500/[0.06]
              px-5 py-4
              text-red-300
              shadow-lg shadow-black/10
              transition-all duration-300
              hover:border-red-400/40
              hover:bg-red-500/10
              hover:text-red-200
              hover:shadow-red-950/20
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >

            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-400 to-red-600 opacity-60 transition-opacity group-hover:opacity-100" />

            <div className="relative flex items-center justify-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 transition-all group-hover:bg-red-500/20">

                <LogOut size={18} />

              </div>

              <div className="text-left">

                <p className="text-sm font-black">
                  Sign Out
                </p>

                <p className="text-[11px] text-red-300/50">
                  End your current session
                </p>

              </div>

            </div>

          </button>

          <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600">
            IRUKA ERP • Secure Session
          </p>

        </div>

      </div>

      {/* =========================
          LOGOUT CONFIRMATION MODAL
      ========================== */}

      {showLogoutModal && (

        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onClick={() => {
            if (!loggingOut) {
              setShowLogoutModal(false);
            }
          }}
        >

          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b1428] shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >

            {/* TOP ACCENT */}

            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

            <div className="p-7">

              {/* ICON */}

              <div className="flex justify-center">

                <div className="relative">

                  <div className="absolute inset-0 rounded-2xl bg-red-500/20 blur-xl" />

                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">

                    <AlertTriangle size={29} />

                  </div>

                </div>

              </div>

              {/* TEXT */}

              <div className="mt-6 text-center">

                <h2 className="text-2xl font-black text-white">
                  Sign out of IRUKA ERP?
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-400">
                  Your current ERP session will be ended.
                  You can sign in again whenever you are
                  ready.
                </p>

              </div>

              {/* ACTIONS */}

              <div className="mt-7 grid grid-cols-2 gap-3">

                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={() =>
                    setShowLogoutModal(false)
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 font-bold text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Stay Signed In
                </button>

                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3.5 font-black text-red-300 transition-all hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loggingOut ? (

                    <span className="flex items-center justify-center gap-2">

                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Signing out...

                    </span>

                  ) : (

                    <span className="flex items-center justify-center gap-2">

                      <LogOut size={18} />

                      Sign Out

                    </span>

                  )}

                </button>

              </div>

              {/* SECURITY NOTE */}

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-600">

                <ShieldCheck size={13} />

                <span>
                  Your session will be securely terminated
                </span>

              </div>

            </div>

          </div>

        </div>

      )}

    </>
  );
}