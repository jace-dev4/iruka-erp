import type { Metadata } from "next";
import "./globals.css";

import { Toaster } from "sonner";

import { InventoryProvider } from "./context/InventoryContext";
import { AuthProvider } from "./context/AuthContext";
import { BranchProvider } from "./context/BranchContext";

export const metadata: Metadata = {
  title: "IRUKA",
  description:
    "IRUKA - Business management and enterprise operations system for IRUKA Industries Ltd.",

  manifest: "/manifest",

  icons: {
    icon: "/logo/nkiruka-logo.png",
    apple: "/logo/nkiruka-logo.png",
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IRUKA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#081028]">

        <AuthProvider>

          <BranchProvider>

            <InventoryProvider>

              {children}

              <Toaster
                position="top-right"
                richColors
                expand
                closeButton
                duration={3500}
                theme="dark"
                toastOptions={{
                  style: {
                    background: "#0B1739",
                    color: "#FFFFFF",
                    border: "1px solid #1E3A8A",
                    borderRadius: "18px",
                    padding: "16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
                  },
                }}
              />

            </InventoryProvider>

          </BranchProvider>

        </AuthProvider>

      </body>
    </html>
  );
}