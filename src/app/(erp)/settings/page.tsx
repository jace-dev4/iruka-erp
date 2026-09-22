"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Factory,
  Boxes,
  WalletCards,
  Bell,
  Save,
  RefreshCw,
  CheckCircle2,
  Settings2,
  ShieldCheck,
  ChevronRight,
  Info,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  Calculator,
  AlertTriangle,
  Database,
  CircleDollarSign,
  Target,
  Activity,
  SlidersHorizontal,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type SettingsData = {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;

  daily_production_target: string;
  morning_shift_target: string;
  night_shift_target: string;

  flour_low_stock: string;
  sugar_low_stock: string;
  yeast_low_stock: string;
  butter_low_stock: string;

  currency: string;
  default_payment_method: string;

  low_stock_alerts: boolean;
  email_notifications: boolean;
};

/* =========================================================
   DEFAULT SETTINGS
========================================================= */

const DEFAULT_SETTINGS: SettingsData = {
  company_name: "Nkiruka/iruka industries ltd",
  company_address: "",
  company_phone: "",
  company_email: "",

  daily_production_target: "200",
  morning_shift_target: "100",
  night_shift_target: "100",

  flour_low_stock: "400",
  sugar_low_stock: "50",
  yeast_low_stock: "10",
  butter_low_stock: "10",

  currency: "NGN",
  default_payment_method: "Cash",

  low_stock_alerts: true,
  email_notifications: false,
};

/* =========================================================
   NAVIGATION
========================================================= */

const NAV_ITEMS = [
  {
    id: "general",
    label: "General",
    description: "Company profile",
    icon: Building2,
  },
  {
    id: "production",
    label: "Production",
    description: "Production targets",
    icon: Factory,
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock thresholds",
    icon: Boxes,
  },
  {
    id: "finance",
    label: "Finance",
    description: "Financial preferences",
    icon: WalletCards,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "System alerts",
    icon: Bell,
  },
];

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [activeSection, setActiveSection] =
    useState("general");

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadSettings();
  }, []);

  /* =======================================================
     LOAD SETTINGS
  ======================================================= */

  async function loadSettings() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Settings load error:", error);
        return;
      }

      if (data) {
        setSettings({
          company_name:
            data.company_name ??
            DEFAULT_SETTINGS.company_name,

          company_address:
            data.company_address ??
            DEFAULT_SETTINGS.company_address,

          company_phone:
            data.company_phone ??
            DEFAULT_SETTINGS.company_phone,

          company_email:
            data.company_email ??
            DEFAULT_SETTINGS.company_email,

          daily_production_target: String(
            data.daily_production_target ??
              DEFAULT_SETTINGS.daily_production_target
          ),

          morning_shift_target: String(
            data.morning_shift_target ??
              DEFAULT_SETTINGS.morning_shift_target
          ),

          night_shift_target: String(
            data.night_shift_target ??
              DEFAULT_SETTINGS.night_shift_target
          ),

          flour_low_stock: String(
            data.flour_low_stock ??
              DEFAULT_SETTINGS.flour_low_stock
          ),

          sugar_low_stock: String(
            data.sugar_low_stock ??
              DEFAULT_SETTINGS.sugar_low_stock
          ),

          yeast_low_stock: String(
            data.yeast_low_stock ??
              DEFAULT_SETTINGS.yeast_low_stock
          ),

          butter_low_stock: String(
            data.butter_low_stock ??
              DEFAULT_SETTINGS.butter_low_stock
          ),

          currency:
            data.currency ??
            DEFAULT_SETTINGS.currency,

          default_payment_method:
            data.default_payment_method ??
            DEFAULT_SETTINGS.default_payment_method,

          low_stock_alerts:
            data.low_stock_alerts ??
            DEFAULT_SETTINGS.low_stock_alerts,

          email_notifications:
            data.email_notifications ??
            DEFAULT_SETTINGS.email_notifications,
        });
      }
    } catch (error) {
      console.error("Settings load error:", error);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  async function saveSettings() {
    setSaving(true);
    setSaved(false);

    try {
      const payload = {
        company_name: settings.company_name,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,

        daily_production_target:
          Number(settings.daily_production_target) || 0,

        morning_shift_target:
          Number(settings.morning_shift_target) || 0,

        night_shift_target:
          Number(settings.night_shift_target) || 0,

        flour_low_stock:
          Number(settings.flour_low_stock) || 0,

        sugar_low_stock:
          Number(settings.sugar_low_stock) || 0,

        yeast_low_stock:
          Number(settings.yeast_low_stock) || 0,

        butter_low_stock:
          Number(settings.butter_low_stock) || 0,

        currency: settings.currency,

        default_payment_method:
          settings.default_payment_method,

        low_stock_alerts:
          settings.low_stock_alerts,

        email_notifications:
          settings.email_notifications,
      };

      const { data: existing, error: existingError } =
        await supabase
          .from("settings")
          .select("id")
          .limit(1)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      let error;

      if (existing?.id) {
        const result = await supabase
          .from("settings")
          .update(payload)
          .eq("id", existing.id);

        error = result.error;
      } else {
        const result = await supabase
          .from("settings")
          .insert(payload);

        error = result.error;
      }

      if (error) {
        throw error;
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3500);
    } catch (error: any) {
      console.error("Settings save error:", error);

      alert(
        error?.message ||
          "Unable to save system settings."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  function updateSetting(
    key: keyof SettingsData,
    value: string | boolean
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-white">
        <div className="flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-xl" />

            <RefreshCw
              size={26}
              className="relative text-blue-400 animate-spin"
            />
          </div>

          <h2 className="mt-5 text-lg font-black">
            Loading Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Preparing your ERP configuration...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#050B14] text-white">

      {/* ===================================================
          PREMIUM HEADER
      =================================================== */}

      <header className="relative overflow-hidden border-b border-white/[0.06] bg-[#07101D]">

        {/* Background effects */}

        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute -left-40 bottom-[-180px] h-96 w-96 rounded-full bg-amber-500/[0.05] blur-3xl" />

        <div className="relative mx-auto max-w-[1550px] px-5 py-7 lg:px-8 lg:py-9">

          <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">

            {/* LEFT */}

            <div className="flex items-start gap-5">

              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-blue-500/5 shadow-xl shadow-blue-950/20">

                <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-lg" />

                <Settings2
                  size={25}
                  className="relative text-blue-400"
                />

              </div>

              <div>

                <div className="mb-2 flex flex-wrap items-center gap-3">

                  <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-blue-300">
                    System Control Center
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">

                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                    System Active

                  </span>

                </div>

                <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  System Settings
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                  Configure your company profile, production,
                  inventory, finance and ERP notification
                  preferences.
                </p>

              </div>

            </div>

            {/* RIGHT */}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <div className="hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-3 sm:block">

                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                  Current Company
                </p>

                <p className="mt-1 max-w-[220px] truncate text-sm font-bold text-slate-200">
                  {settings.company_name ||
                    "Nkiruka/iruka industries ltd"}
                </p>

              </div>

              <button
                onClick={loadSettings}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-5 text-sm font-bold text-slate-300 shadow-lg transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    saving ? "animate-spin" : ""
                  }
                />

                Reload
              </button>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />

                    Save Changes
                  </>
                )}
              </button>

            </div>

          </div>

          {/* SAVED MESSAGE */}

          {saved && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-5 py-4 shadow-lg shadow-emerald-950/10">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10">
                <CheckCircle2
                  size={18}
                  className="text-emerald-400"
                />
              </div>

              <div>

                <p className="text-sm font-black text-emerald-300">
                  Settings saved successfully
                </p>

                <p className="mt-0.5 text-xs text-emerald-400/60">
                  Your ERP configuration has been updated.
                </p>

              </div>

            </div>
          )}

        </div>

      </header>


      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="mx-auto max-w-[1550px] px-5 py-7 lg:px-8 lg:py-9">

        <div className="grid gap-7 xl:grid-cols-[270px_minmax(0,1fr)]">

          {/* =================================================
              SIDEBAR
          ================================================= */}

          <aside className="xl:sticky xl:top-6 xl:self-start">

            <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#091321] shadow-2xl shadow-black/20">

              {/* Sidebar heading */}

              <div className="border-b border-white/[0.06] px-5 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10">
                    <SlidersHorizontal
                      size={18}
                      className="text-blue-400"
                    />
                  </div>

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.15em] text-white">
                      Configuration
                    </p>

                    <p className="mt-1 text-[11px] text-slate-600">
                      ERP preferences
                    </p>

                  </div>

                </div>

              </div>

              {/* Navigation */}

              <div className="p-2.5">

                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;

                  const active =
                    activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() =>
                        setActiveSection(item.id)
                      }
                      className={`group relative mb-1.5 flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left transition-all ${
                        active
                          ? "border-blue-400/15 bg-blue-500/[0.09]"
                          : "border-transparent hover:border-white/[0.05] hover:bg-white/[0.025]"
                      }`}
                    >

                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
                      )}

                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                          active
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-white/[0.03] text-slate-600 group-hover:text-slate-300"
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p
                          className={`text-sm font-black ${
                            active
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        >
                          {item.label}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-slate-600">
                          {item.description}
                        </p>

                      </div>

                      {active && (
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-blue-400"
                        />
                      )}

                    </button>
                  );
                })}

              </div>

            </div>


            {/* SYSTEM CONNECTION */}

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#091321] p-5 shadow-xl shadow-black/10">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <ShieldCheck
                    size={18}
                    className="text-emerald-400"
                  />
                </div>

                <div>

                  <p className="text-xs font-black text-white">
                    ERP Connection
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-600">
                    Supabase database
                  </p>

                </div>

              </div>

              <div className="my-4 h-px bg-white/[0.05]" />

              <div className="flex items-center justify-between">

                <span className="text-[11px] text-slate-500">
                  Database
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.05] px-2.5 py-1 text-[10px] font-bold text-emerald-400">

                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  Connected

                </span>

              </div>

            </div>

          </aside>


          {/* =================================================
              SETTINGS CONTENT
          ================================================= */}

          <section className="min-w-0 space-y-6">

            {/* GENERAL */}

            {activeSection === "general" && (
              <SettingsSection
                icon={<Building2 size={21} />}
                iconClass="blue"
                eyebrow="GENERAL CONFIGURATION"
                title="Company Profile"
                description="Manage the identity and contact information used throughout your ERP."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <InputField
                    label="Company Name"
                    value={settings.company_name}
                    onChange={(value) =>
                      updateSetting(
                        "company_name",
                        value
                      )
                    }
                    icon={<Building2 size={16} />}
                  />

                  <InputField
                    label="Company Phone"
                    value={settings.company_phone}
                    onChange={(value) =>
                      updateSetting(
                        "company_phone",
                        value
                      )
                    }
                    icon={<Phone size={16} />}
                  />

                  <InputField
                    label="Company Email"
                    value={settings.company_email}
                    onChange={(value) =>
                      updateSetting(
                        "company_email",
                        value
                      )
                    }
                    type="email"
                    icon={<Mail size={16} />}
                  />

                  <InputField
                    label="Company Address"
                    value={settings.company_address}
                    onChange={(value) =>
                      updateSetting(
                        "company_address",
                        value
                      )
                    }
                    icon={<MapPin size={16} />}
                  />

                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-3">

                  <MiniStat
                    icon={<Building2 size={17} />}
                    label="Company"
                    value={
                      settings.company_name ||
                      "Not configured"
                    }
                  />

                  <MiniStat
                    icon={<Phone size={17} />}
                    label="Phone"
                    value={
                      settings.company_phone ||
                      "Not configured"
                    }
                  />

                  <MiniStat
                    icon={<Mail size={17} />}
                    label="Email"
                    value={
                      settings.company_email ||
                      "Not configured"
                    }
                  />

                </div>

                <InfoBox
                  icon={<Database size={17} />}
                  title="Company identity"
                  text="These details can be used by other ERP modules for company headers, reports, invoices and financial documents."
                />

              </SettingsSection>
            )}


            {/* PRODUCTION */}

            {activeSection === "production" && (
              <SettingsSection
                icon={<Factory size={21} />}
                iconClass="orange"
                eyebrow="OPERATIONS"
                title="Production Configuration"
                description="Define the bakery's expected daily production capacity and shift targets."
              >

                <div className="grid gap-5 md:grid-cols-3">

                  <NumberField
                    label="Daily Production Target"
                    value={
                      settings.daily_production_target
                    }
                    onChange={(value) =>
                      updateSetting(
                        "daily_production_target",
                        value
                      )
                    }
                    suffix="bags"
                    icon={<Target size={16} />}
                  />

                  <NumberField
                    label="Morning Shift Target"
                    value={
                      settings.morning_shift_target
                    }
                    onChange={(value) =>
                      updateSetting(
                        "morning_shift_target",
                        value
                      )
                    }
                    suffix="bags"
                    icon={<Factory size={16} />}
                  />

                  <NumberField
                    label="Night Shift Target"
                    value={
                      settings.night_shift_target
                    }
                    onChange={(value) =>
                      updateSetting(
                        "night_shift_target",
                        value
                      )
                    }
                    suffix="bags"
                    icon={<Factory size={16} />}
                  />

                </div>


                <div className="mt-7 grid gap-4 md:grid-cols-2">

                  <MetricCard
                    icon={<Activity size={18} />}
                    label="Combined Shift Target"
                    value={`${Number(
                      settings.morning_shift_target || 0
                    ) +
                      Number(
                        settings.night_shift_target || 0
                      )} bags`}
                    description="Morning + night production"
                  />

                  <MetricCard
                    icon={<Target size={18} />}
                    label="Average Per Shift"
                    value={`${Number(
                      settings.daily_production_target || 0
                    ) / 2 || 0} bags`}
                    description="Based on a two-shift operation"
                  />

                </div>


                <InfoBox
                  icon={<Info size={17} />}
                  title="Production targets"
                  text="These figures define expected production levels. Actual production, flour consumption and stock movement should continue to come from production records."
                />

              </SettingsSection>
            )}


            {/* INVENTORY */}

            {activeSection === "inventory" && (
              <SettingsSection
                icon={<Boxes size={21} />}
                iconClass="blue"
                eyebrow="STOCK CONTROL"
                title="Inventory Configuration"
                description="Define the minimum stock levels used to trigger inventory warnings."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <NumberField
                    label="Flour"
                    value={
                      settings.flour_low_stock
                    }
                    onChange={(value) =>
                      updateSetting(
                        "flour_low_stock",
                        value
                      )
                    }
                    suffix="bags"
                    icon={<Package size={16} />}
                  />

                  <NumberField
                    label="Sugar"
                    value={
                      settings.sugar_low_stock
                    }
                    onChange={(value) =>
                      updateSetting(
                        "sugar_low_stock",
                        value
                      )
                    }
                    suffix="kg"
                    icon={<Package size={16} />}
                  />

                  <NumberField
                    label="Yeast"
                    value={
                      settings.yeast_low_stock
                    }
                    onChange={(value) =>
                      updateSetting(
                        "yeast_low_stock",
                        value
                      )
                    }
                    suffix="units"
                    icon={<Package size={16} />}
                  />

                  <NumberField
                    label="Butter"
                    value={
                      settings.butter_low_stock
                    }
                    onChange={(value) =>
                      updateSetting(
                        "butter_low_stock",
                        value
                      )
                    }
                    suffix="units"
                    icon={<Package size={16} />}
                  />

                </div>


                <div className="mt-7 rounded-2xl border border-amber-400/15 bg-gradient-to-r from-amber-500/[0.06] to-transparent p-5">

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10">
                      <AlertTriangle
                        size={18}
                        className="text-amber-400"
                      />
                    </div>

                    <div>

                      <p className="text-sm font-black text-amber-300">
                        Low-stock thresholds
                      </p>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        When inventory falls below these
                        configured values, the ERP can flag
                        the material as requiring attention.
                      </p>

                    </div>

                  </div>

                </div>

              </SettingsSection>
            )}


            {/* FINANCE */}

            {activeSection === "finance" && (
              <SettingsSection
                icon={<WalletCards size={21} />}
                iconClass="green"
                eyebrow="FINANCIAL CONTROL"
                title="Finance Configuration"
                description="Set the financial preferences used across sales, payments and reports."
              >

                <div className="grid gap-5 md:grid-cols-2">

                  <SelectField
                    label="System Currency"
                    value={settings.currency}
                    onChange={(value) =>
                      updateSetting(
                        "currency",
                        value
                      )
                    }
                    icon={<Calculator size={16} />}
                    options={[
                      {
                        label: "Nigerian Naira (₦)",
                        value: "NGN",
                      },
                      {
                        label: "US Dollar ($)",
                        value: "USD",
                      },
                      {
                        label: "British Pound (£)",
                        value: "GBP",
                      },
                    ]}
                  />

                  <SelectField
                    label="Default Payment Method"
                    value={
                      settings.default_payment_method
                    }
                    onChange={(value) =>
                      updateSetting(
                        "default_payment_method",
                        value
                      )
                    }
                    icon={<CreditCard size={16} />}
                    options={[
                      {
                        label: "Cash",
                        value: "Cash",
                      },
                      {
                        label: "Bank Transfer",
                        value: "Bank Transfer",
                      },
                      {
                        label: "POS",
                        value: "POS",
                      },
                      {
                        label: "Online Payment",
                        value: "Online Payment",
                      },
                    ]}
                  />

                </div>


                <div className="mt-7 grid gap-4 md:grid-cols-2">

                  <MetricCard
                    icon={<CircleDollarSign size={18} />}
                    label="Active Currency"
                    value={
                      settings.currency === "NGN"
                        ? "₦ NGN"
                        : settings.currency
                    }
                    description="System financial currency"
                  />

                  <MetricCard
                    icon={<CreditCard size={18} />}
                    label="Default Payment"
                    value={
                      settings.default_payment_method
                    }
                    description="Default option for new transactions"
                  />

                </div>


                <InfoBox
                  icon={<WalletCards size={17} />}
                  title="Finance preference"
                  text="Changing these values affects configuration preferences. Existing historical transactions should retain their original financial records."
                />

              </SettingsSection>
            )}


            {/* NOTIFICATIONS */}

            {activeSection === "notifications" && (
              <SettingsSection
                icon={<Bell size={21} />}
                iconClass="purple"
                eyebrow="SYSTEM ALERTS"
                title="Notification Settings"
                description="Control which operational alerts are enabled for your ERP."
              >

                <div className="space-y-4">

                  <ToggleSetting
                    title="Low Stock Alerts"
                    description="Notify the ERP when inventory materials fall below configured minimum levels."
                    checked={
                      settings.low_stock_alerts
                    }
                    onChange={(value) =>
                      updateSetting(
                        "low_stock_alerts",
                        value
                      )
                    }
                    icon={<Boxes size={18} />}
                  />

                  <ToggleSetting
                    title="Email Notifications"
                    description="Enable email notification preferences for supported ERP events."
                    checked={
                      settings.email_notifications
                    }
                    onChange={(value) =>
                      updateSetting(
                        "email_notifications",
                        value
                      )
                    }
                    icon={<Mail size={18} />}
                  />

                </div>


                <div className="mt-7 rounded-2xl border border-blue-400/15 bg-gradient-to-r from-blue-500/[0.06] to-transparent p-5">

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                      <Bell
                        size={18}
                        className="text-blue-400"
                      />
                    </div>

                    <div>

                      <p className="text-sm font-black text-blue-300">
                        Notification preferences
                      </p>

                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                        These settings control notification
                        preferences. Actual email delivery
                        requires a configured notification
                        service.
                      </p>

                    </div>

                  </div>

                </div>

              </SettingsSection>
            )}


            {/* =================================================
                BOTTOM SAVE BAR
            ================================================= */}

            <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-r from-[#091321] to-[#0B1727] shadow-2xl">

              <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-500/10">
                    <ShieldCheck
                      size={19}
                      className="text-blue-400"
                    />
                  </div>

                  <div>

                    <p className="text-sm font-black text-white">
                      Configuration ready
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Review your changes before saving them
                      to the ERP.
                    </p>

                  </div>

                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-7 text-sm font-black text-white shadow-xl shadow-blue-950/30 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />

                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={16} />

                      Save All Settings
                    </>
                  )}

                </button>

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   SETTINGS SECTION
========================================================= */

function SettingsSection({
  icon,
  iconClass,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  iconClass:
    | "blue"
    | "orange"
    | "green"
    | "purple";
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const iconStyles = {
    blue: {
      box: "border-blue-400/15 bg-blue-500/10",
      text: "text-blue-400",
    },
    orange: {
      box: "border-orange-400/15 bg-orange-500/10",
      text: "text-orange-400",
    },
    green: {
      box: "border-emerald-400/15 bg-emerald-500/10",
      text: "text-emerald-400",
    },
    purple: {
      box: "border-purple-400/15 bg-purple-500/10",
      text: "text-purple-400",
    },
  };

  const style = iconStyles[iconClass];

  return (
    <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#091321] shadow-2xl shadow-black/20">

      {/* Section header */}

      <div className="relative overflow-hidden border-b border-white/[0.06] p-6 lg:p-8">

        <div className="absolute right-[-80px] top-[-100px] h-60 w-60 rounded-full bg-blue-500/[0.035] blur-3xl" />

        <div className="relative flex items-start gap-4">

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.box}`}
          >
            <span className={style.text}>
              {icon}
            </span>
          </div>

          <div>

            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${style.text}`}>
              {eyebrow}
            </p>

            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-white">
              {title}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>

          </div>

        </div>

      </div>

      {/* Content */}

      <div className="p-6 lg:p-8">
        {children}
      </div>

    </section>
  );
}


/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  value,
  onChange,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">

        {icon && (
          <span className="text-slate-600">
            {icon}
          </span>
        )}

        {label}

      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-13 w-full rounded-2xl border border-white/[0.08] bg-[#0E1A2B] px-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-700 hover:border-white/[0.13] focus:border-blue-500/50 focus:bg-[#101E31] focus:ring-4 focus:ring-blue-500/[0.06]"
      />

    </div>
  );
}


/* =========================================================
   NUMBER FIELD
========================================================= */

function NumberField({
  label,
  value,
  onChange,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">

        {icon && (
          <span className="text-slate-600">
            {icon}
          </span>
        )}

        {label}

      </label>

      <div className="relative">

        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="h-13 w-full rounded-2xl border border-white/[0.08] bg-[#0E1A2B] px-4 pr-20 text-sm font-bold text-white outline-none transition hover:border-white/[0.13] focus:border-blue-500/50 focus:bg-[#101E31] focus:ring-4 focus:ring-blue-500/[0.06]"
        />

        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-white/[0.06] bg-white/[0.035] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
          {suffix}
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  icon?: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">

        {icon && (
          <span className="text-slate-600">
            {icon}
          </span>
        )}

        {label}

      </label>

      <div className="relative">

        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="h-13 w-full appearance-none rounded-2xl border border-white/[0.08] bg-[#0E1A2B] px-4 pr-12 text-sm font-medium text-white outline-none transition hover:border-white/[0.13] focus:border-blue-500/50 focus:bg-[#101E31] focus:ring-4 focus:ring-blue-500/[0.06]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[#0E1A2B] text-white"
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronRight
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-600"
        />

      </div>

    </div>
  );
}


/* =========================================================
   TOGGLE
========================================================= */

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center justify-between gap-5 rounded-2xl border p-5 transition-all ${
        checked
          ? "border-blue-400/15 bg-blue-500/[0.045]"
          : "border-white/[0.06] bg-[#0E1A2B] hover:border-white/[0.1]"
      }`}
    >

      <div className="flex min-w-0 items-center gap-4">

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            checked
              ? "bg-blue-500/10 text-blue-400"
              : "bg-white/[0.03] text-slate-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-sm font-black text-white">
            {title}
          </p>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>


      <div className="relative shrink-0">

        <input
          type="checkbox"
          checked={checked}
          onChange={(e) =>
            onChange(e.target.checked)
          }
          className="sr-only"
        />

        <div
          className={`relative h-7 w-13 rounded-full border transition-all ${
            checked
              ? "border-blue-500 bg-blue-600"
              : "border-white/[0.08] bg-slate-800"
          }`}
        >

          <div
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-all ${
              checked
                ? "left-7"
                : "left-1"
            }`}
          />

        </div>

      </div>

    </label>
  );
}


/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="mt-7 flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <div>

        <p className="text-xs font-black text-slate-300">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-600">
          {text}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-[#0E1A2B] p-5 transition hover:border-white/[0.1]">

      <div className="flex items-center justify-between">

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
          {label}
        </p>

        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/[0.06] text-blue-400/70">
            {icon}
          </div>
        )}

      </div>

      <p className="mt-3 text-xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-slate-600">
        {description}
      </p>

    </div>
  );
}


/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1A2B] p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/[0.07] text-blue-400">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
            {label}
          </p>

          <p className="mt-1 truncate text-xs font-bold text-slate-300">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}