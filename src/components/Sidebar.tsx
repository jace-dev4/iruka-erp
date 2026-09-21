"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  usePathname,
  useRouter,
} from "next/navigation";

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
  { name: "Customer Orders", href: "/orders", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Debtors", href: "/debtors", icon: Wallet },
  { name: "Products", href: "/products", icon: Package },
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
  setSidebarOpen: (
    value: boolean
  ) => void;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const pathname = usePathname();

const router = useRouter();
const [role, setRole] = useState<string | null>(null);
useEffect(() => {
  setRole(localStorage.getItem("role"));
}, []);

const menu =
  menuByRole[
    role as keyof typeof menuByRole
  ] || [];

const handleLogout = async () => {

  await supabase.auth.signOut();

  localStorage.removeItem("role");

  router.push("/login");

};

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      <div
        className={`
          fixed top-0 left-0 z-50
          w-[280px]
          h-screen
          bg-[#071028]
          text-white
          flex flex-col
          justify-between
          overflow-y-auto
          transition-transform duration-300

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          lg:translate-x-0
        `}
      >
        <div>
          {/* Mobile Close Button */}
          <div className="flex justify-end p-4 lg:hidden">
            <button
              onClick={() =>
                setSidebarOpen(false)
              }
            >
              <X size={24} />
            </button>
          </div>

          {/* Logo */}
<div className="p-6 border-b border-white/10 text-center">

  <Image
    src="/logo/nkiruka-logo.png"
    alt="NKIRUKA Logo"
    width={80}
    height={80}
    className="mx-auto mb-3"
  />

  <h1 className="text-lg font-black text-yellow-500">
    NKIRUKA / IRUKA
  </h1>

  <p className="text-xs text-gray-400">
    INDUSTRIES LTD
  </p>

</div>

          {/* User Card */}
          <div className="p-6">
            <div className="bg-[#0d1838] rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500 text-black font-black flex items-center justify-center">
                A
              </div>

              <div>
                <p className="font-bold">
                  CEO Admin
                </p>

                <p className="text-sm text-gray-400">
                  Administrator
                </p>
              </div>
            </div>
          </div>

          {/* Menu */}
<div className="px-4 space-y-2">
  {!role ? null : menu.map((item) => {
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
                      ? "flex items-center gap-4 px-5 py-4 rounded-2xl bg-yellow-500 text-black font-bold"
                      : "flex items-center gap-4 px-5 py-4 rounded-2xl text-gray-300 hover:bg-[#0d1838] transition-all"
                  }
                >
                  <Icon size={22} />

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
              })}
          </div>
        </div>

        {/* Logout */}
        <div className="p-6">
<button
  onClick={handleLogout}
  className="w-full bg-red-600 hover:bg-red-700 transition-all rounded-2xl py-4 flex items-center justify-center gap-3 font-bold"
>
  <LogOut size={20} />
  Logout
</button>
        </div>
      </div>
    </>
  );
}