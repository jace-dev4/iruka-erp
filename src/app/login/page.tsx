"use client";

import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleLogin() {
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setErrorMessage(error.message);

        setLoading(false);

        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("User not found.");

        setLoading(false);

        return;
      }

      const { data: userData, error: roleError } =
        await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

      if (roleError || !userData) {
        setErrorMessage(
          "Unable to load your account."
        );

        setLoading(false);

        return;
      }

      localStorage.setItem(
        "role",
        userData.role
      );

      localStorage.setItem(
        "full_name",
        userData.full_name
      );

      localStorage.setItem(
        "email",
        userData.email
      );

switch (userData.role) {
  case "admin":
    router.push("/dashboard");
    break;

  case "cashier":
    router.push("/orders");
    break;

  case "management":
    router.push("/staff");
    break;

  case "inventory officer":
    router.push("/inventory");
    break;

  case "accountant":
    router.push("/finance");
    break;

  default:
    router.push("/dashboard");
}
    } catch (err) {
      console.error(err);

      setErrorMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      setErrorMessage(
        "Enter your email first."
      );
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin +
            "/reset-password",
        }
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    alert(
      "Password reset email sent successfully."
    );
  }

  return (
<div
  className="relative min-h-screen flex bg-cover bg-center bg-no-repeat"
style={{
  backgroundImage: "url('/images/bakery-bg.jpg')",
}}
>

  {/* Dark Overlay */}
  <div className="absolute inset-0 bg-[#041225]/75"></div>

  {/* LEFT PANEL */}
  <div className="relative z-10 hidden lg:flex w-1/2 items-center justify-center p-16">

      <div className="max-w-xl">

        <Image
          src="/logo/nkiruka-logo.png"
          alt="NKIRUKA Logo"
          width={180}
          height={180}
          className="mb-8"
        />

        <h1 className="text-5xl font-black text-white leading-tight">

          NKIRUKA / IRUKA INDUSTRIES LTD

        </h1>

        <p className="mt-5 text-xl text-slate-300">

          Enterprise Resource Planning System for
          production, inventory, finance,
          payroll, analytics and customer
          management.

        </p>

        <div className="grid grid-cols-2 gap-6 mt-12">

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">

            <h3 className="text-yellow-400 font-bold text-lg">

              Production

            </h3>

            <p className="text-slate-300 mt-2">

              Track bakery production in real time.

            </p>

          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">

            <h3 className="text-yellow-400 font-bold text-lg">

              Inventory

            </h3>

            <p className="text-slate-300 mt-2">

              Automatic material deductions.

            </p>

          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">

            <h3 className="text-yellow-400 font-bold text-lg">

              Finance

            </h3>

            <p className="text-slate-300 mt-2">

              Profit, expenses and debt tracking.

            </p>

          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">

            <h3 className="text-yellow-400 font-bold text-lg">

              Analytics

            </h3>

            <p className="text-slate-300 mt-2">

              CEO dashboards and reports.

            </p>

          </div>

        </div>

      </div>

    </div>

    {/* LOGIN */}

    <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-8">

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

        <div className="text-center lg:hidden">

          <Image
            src="/logo/nkiruka-logo.png"
            alt="Logo"
            width={110}
            height={110}
            className="mx-auto mb-5"
          />

        </div>

        <h2 className="text-3xl font-black text-slate-900">

          Welcome Back

        </h2>

        <p className="text-slate-500 mt-2">

          Sign in to continue.

        </p>

        {errorMessage && (

          <div className="mt-6 bg-red-100 border border-red-300 text-red-700 rounded-xl p-4">

            {errorMessage}

          </div>

        )}

        <div className="mt-8 space-y-5">

          <div className="relative">

            <Mail
              className="absolute left-4 top-4 text-slate-400"
              size={20}
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  handleLogin();
              }}
              className="w-full rounded-2xl border border-slate-300 pl-12 pr-4 py-4 outline-none focus:border-blue-700"
            />

          </div>

          <div className="relative">

            <Lock
              className="absolute left-4 top-4 text-slate-400"
              size={20}
            />

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  handleLogin();
              }}
              className="w-full rounded-2xl border border-slate-300 pl-12 pr-14 py-4 outline-none focus:border-blue-700"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
              className="absolute right-4 top-4 text-slate-500"
            >

              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}

            </button>

          </div>

          <div className="flex justify-between items-center">

            <label className="flex items-center gap-2 text-sm text-slate-600">

              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() =>
                  setRememberMe(
                    !rememberMe
                  )
                }
              />

              Remember Me

            </label>

            <button
              onClick={forgotPassword}
              className="text-blue-700 font-semibold text-sm"
            >

              Forgot Password?

            </button>

          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-blue-950 hover:bg-blue-900 text-white py-4 font-bold flex justify-center items-center gap-3 transition"
          >

            {loading ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={20}
                />

                Logging in...

              </>
            ) : (
              "Login"
            )}

          </button>

<div className="text-center pt-6">

  <p className="text-slate-500 text-sm">

    Access is restricted to authorized staff only.

  </p>

</div>

        </div>

      </div>

    </div>

  </div>
);
}