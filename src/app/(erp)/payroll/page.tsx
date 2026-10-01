"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";

import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

import {
  Users,
  Wallet,
  Landmark,
  Printer,
  Download,
  CalendarDays,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";

/* =====================================================
   TYPES
===================================================== */

interface Staff {
  id: number;
  staff_id: string;
  full_name: string;
  department: string;
  position: string;
  salary: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  employment_status: string;
  date_joined: string;
  photo_url: string | null;
}

interface Debt {
  id: number;
  staff_name: string;
  amount: number;
  month: string;
  year: number;
  status: string;
}

interface Payroll {
  id: number;
  staff_id: number;
  staff_name: string;
  department: string;
  position: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  basic_salary: number;
  days_worked: number;
  salary_earned: number;
  total_deduction: number;
  balance_payable: number;
  payroll_month: string;
  payroll_year: number;
  payment_status: string;
  created_at: string;
}

/* =====================================================
   HELPERS
===================================================== */

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getMonthName(monthIndex: number) {
  return new Date(2000, monthIndex, 1).toLocaleString("default", {
    month: "long",
  });
}

function getMonthIndex(monthName: string) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return months.indexOf(monthName);
}

/* =====================================================
   PAGE
===================================================== */

export default function PayrollPage() {
  /* =====================================================
     STATE
  ===================================================== */

  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);

  const [selectedPayroll, setSelectedPayroll] =
    useState<Payroll[]>([]);

  const [showPayrollModal, setShowPayrollModal] =
    useState(false);

  const [search, setSearch] = useState("");

  /* =====================================================
     SELECTED PAYROLL PERIOD

     Default = current month/year.

     The user can change this at ANY TIME.
  ===================================================== */

  const [selectedPayrollMonth, setSelectedPayrollMonth] =
    useState(getMonthName(now.getMonth()));

  const [selectedPayrollYear, setSelectedPayrollYear] =
    useState(now.getFullYear());

  /* =====================================================
     MONTHS
  ===================================================== */

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  /* =====================================================
     YEARS

     Allows previous years and future years.

     Adjust range later if needed.
  ===================================================== */

  const currentYear = now.getFullYear();

  const years = Array.from(
    { length: 11 },
    (_, index) => currentYear - 5 + index
  );

  /* =====================================================
     SELECTED MONTH INFORMATION
  ===================================================== */

  const selectedMonthIndex =
    getMonthIndex(selectedPayrollMonth);

  const daysInMonth = new Date(
    selectedPayrollYear,
    selectedMonthIndex + 1,
    0
  ).getDate();

  const monthStart = new Date(
    selectedPayrollYear,
    selectedMonthIndex,
    1
  );

  const monthEnd = new Date(
    selectedPayrollYear,
    selectedMonthIndex,
    daysInMonth
  );

  /* =====================================================
     FETCH DATA
  ===================================================== */

  async function fetchData() {
    try {
      setLoading(true);

      const [
        staffResponse,
        debtResponse,
        payrollResponse,
      ] = await Promise.all([
        supabase
          .from("staff")
.select(`
  id,
  staff_id,
  full_name,
  department,
  position,
  salary,
  bank_name,
  account_name,
  account_number,
  employment_status,
  date_joined,
  photo_url
`)
          .eq("employment_status", "Active")
          .order("full_name"),

        supabase
          .from("staff_debts")
          .select("*")
          .eq("status", "Open"),

        supabase
          .from("payroll")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (staffResponse.error) {
        console.error(
          "Staff Fetch Error:",
          staffResponse.error
        );

        alert(staffResponse.error.message);
        return;
      }

      if (debtResponse.error) {
        console.error(
          "Debt Fetch Error:",
          debtResponse.error
        );

        alert(debtResponse.error.message);
        return;
      }

      if (payrollResponse.error) {
        console.error(
          "Payroll Fetch Error:",
          payrollResponse.error
        );

        alert(payrollResponse.error.message);
        return;
      }

      setStaff(
        (staffResponse.data || []) as Staff[]
      );

      setDebts(
        (debtResponse.data || []) as Debt[]
      );

      setPayroll(
        (payrollResponse.data || []) as Payroll[]
      );
    } catch (error: any) {
      console.error(
        "Payroll Fetch Error:",
        error
      );

      alert(
        error?.message ||
          "Unable to load payroll information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

    /* =====================================================
     STAFF LOOKUP

     Connect payroll staff_id to the real staff record.

     payroll.staff_id = staff.id
     staff.staff_id   = visible Staff ID
     staff.photo_url  = employee photo
  ===================================================== */

  const staffByDatabaseId =
    useMemo(() => {
      const lookup: Record<
        number,
        Staff
      > = {};

      staff.forEach((member) => {
        lookup[member.id] = member;
      });

      return lookup;
    }, [staff]);

  /* =====================================================
     STAFF DEBT DEDUCTION

     IMPORTANT:

     Debt is matched against the SELECTED payroll
     month/year, not today's month/year.
  ===================================================== */

  function getDeduction(staffName: string) {
    return debts
      .filter(
        (item) =>
          item.staff_name === staffName &&
          item.month === selectedPayrollMonth &&
          Number(item.year) ===
            Number(selectedPayrollYear) &&
          item.status === "Open"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );
  }

  /* =====================================================
     CALCULATE DAYS WORKED

     Uses the SELECTED payroll month.

     Example:

     Selected month = October 2026

     Joined:
     Before October 1
       → 31 days

     Joined October 10
       → 22 days

     Joined after October 31
       → 0 days
  ===================================================== */

  function calculateDaysWorked(
    dateJoined: string
  ) {
    if (!dateJoined) {
      return daysInMonth;
    }

    const joinedDate = new Date(dateJoined);

    joinedDate.setHours(
      0,
      0,
      0,
      0
    );

    if (
      joinedDate < monthStart
    ) {
      return daysInMonth;
    }

    if (
      joinedDate > monthEnd
    ) {
      return 0;
    }

    return (
      daysInMonth -
      joinedDate.getDate() +
      1
    );
  }

  /* =====================================================
     CALCULATE PAYROLL FOR STAFF
  ===================================================== */

  function calculatePayrollForStaff(
    employee: Staff
  ) {
    const basicSalary =
      Number(employee.salary || 0);

    const daysWorked =
      calculateDaysWorked(
        employee.date_joined
      );

    const dailySalary =
      daysInMonth > 0
        ? basicSalary / daysInMonth
        : 0;

    const salaryEarned =
      dailySalary * daysWorked;

    const deduction =
      getDeduction(
        employee.full_name
      );

    const balancePayable =
      Math.max(
        salaryEarned -
          deduction,
        0
      );

    return {
      daysWorked,
      salaryEarned,
      deduction,
      balancePayable,
    };
  }

  /* =====================================================
     SELECTED MONTH PAYROLL

     Everything on the main page now follows the
     selected month/year.
  ===================================================== */

const selectedMonthPayroll =
  useMemo(() => {
    const filtered = payroll.filter(
      (item) =>
        item.payroll_month ===
          selectedPayrollMonth &&
        Number(item.payroll_year) ===
          Number(selectedPayrollYear)
    );

    /*
      ALWAYS SORT PAYROLL
      A → Z BY STAFF NAME
    */
    return [...filtered].sort((a, b) => {
      const nameA =
        String(a.staff_name || "").trim();

      const nameB =
        String(b.staff_name || "").trim();

      return nameA.localeCompare(
        nameB,
        undefined,
        {
          sensitivity: "base",
          numeric: true,
        }
      );
    });
  }, [
    payroll,
    selectedPayrollMonth,
    selectedPayrollYear,
  ]);

  /* =====================================================
     CHECK WHETHER SELECTED PAYROLL EXISTS
  ===================================================== */

  const payrollAlreadyGenerated =
    selectedMonthPayroll.length > 0;

  /* =====================================================
     GENERATE PAYROLL

     IMPORTANT:

     Payroll can now be generated ANY TIME.

     There is NO month-end restriction.

     The selected month/year determines the payroll
     period.
  ===================================================== */

  async function generatePayroll() {
    if (generating) return;

    /* -----------------------------------------------
       Prevent duplicate payroll
    ------------------------------------------------ */

    if (payrollAlreadyGenerated) {
      alert(
        `Payroll for ${selectedPayrollMonth} ${selectedPayrollYear} has already been generated.`
      );

      return;
    }

    /* -----------------------------------------------
       Make sure there are active staff
    ------------------------------------------------ */

    if (staff.length === 0) {
      alert(
        "There are no active staff members available for payroll."
      );

      return;
    }

    try {
      setGenerating(true);

      const payrollRows: any[] = [];

      let grossPayroll = 0;
      let totalDeductions = 0;
      let netPayroll = 0;

      /* ---------------------------------------------
         Calculate every employee
      ---------------------------------------------- */

      for (const employee of staff) {
        const calculation =
          calculatePayrollForStaff(
            employee
          );

        /*
          Staff who had not joined yet are excluded.
        */

        if (
          calculation.daysWorked <= 0
        ) {
          continue;
        }

        grossPayroll +=
          calculation.salaryEarned;

        totalDeductions +=
          calculation.deduction;

        netPayroll +=
          calculation.balancePayable;

        payrollRows.push({
          staff_id:
            employee.id,

          staff_name:
            employee.full_name,

          department:
            employee.department ||
            "",

          position:
            employee.position ||
            "",

          bank_name:
            employee.bank_name ||
            "",

          account_name:
            employee.account_name ||
            "",

          account_number:
            employee.account_number ||
            "",

          basic_salary:
            Number(
              employee.salary || 0
            ),

          days_worked:
            calculation.daysWorked,

          salary_earned:
            calculation.salaryEarned,

          total_deduction:
            calculation.deduction,

          balance_payable:
            calculation.balancePayable,

          payroll_month:
            selectedPayrollMonth,

          payroll_year:
            selectedPayrollYear,

          payment_status:
            "Ready",
        });
      }

      /* ---------------------------------------------
         Make sure there are eligible employees
      ---------------------------------------------- */

      if (
        payrollRows.length === 0
      ) {
        alert(
          `No eligible staff members were found for ${selectedPayrollMonth} ${selectedPayrollYear}.`
        );

        return;
      }

      /* ---------------------------------------------
         FINAL DUPLICATE CHECK

         This protects against another payroll being
         created after the page was loaded.
      ---------------------------------------------- */

      const {
        data: existingPayroll,
        error: existingPayrollError,
      } = await supabase
        .from("payroll")
        .select("id")
        .eq(
          "payroll_month",
          selectedPayrollMonth
        )
        .eq(
          "payroll_year",
          selectedPayrollYear
        )
        .limit(1);

      if (existingPayrollError) {
        console.error(
          "Duplicate Payroll Check Error:",
          existingPayrollError
        );

        alert(
          existingPayrollError.message
        );

        return;
      }

      if (
        existingPayroll &&
        existingPayroll.length > 0
      ) {
        alert(
          `Payroll for ${selectedPayrollMonth} ${selectedPayrollYear} already exists.`
        );

        await fetchData();

        return;
      }

      /* ---------------------------------------------
         INSERT PAYROLL
      ---------------------------------------------- */

      const {
        error: payrollError,
      } = await supabase
        .from("payroll")
        .insert(payrollRows);

      if (payrollError) {
        console.error(
          "Payroll Insert Error:",
          payrollError
        );

        alert(
          payrollError.message
        );

        return;
      }

      /* ---------------------------------------------
         SUCCESS
      ---------------------------------------------- */

      alert(
        `${selectedPayrollMonth} ${selectedPayrollYear} payroll generated successfully.\n\n` +
          `Employees: ${payrollRows.length}\n` +
          `Gross Payroll: ${money(grossPayroll)}\n` +
          `Deductions: ${money(totalDeductions)}\n` +
          `Net Payroll: ${money(netPayroll)}`
      );

      await fetchData();
    } catch (error: any) {
      console.error(
        "Generate Payroll Error:",
        error
      );

      alert(
        error?.message ||
          "Unable to generate payroll."
      );
    } finally {
      setGenerating(false);
    }
  }

  /* =====================================================
     PAY SALARY
  ===================================================== */

  async function paySalary(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Confirm that this salary has actually been paid?"
      );

    if (!confirmed) return;

    const { error } =
      await supabase
        .from("payroll")
        .update({
          payment_status:
            "Paid",
        })
        .eq(
          "id",
          id
        );

    if (error) {
      console.error(
        "Salary Payment Error:",
        error
      );

      alert(
        error.message
      );

      return;
    }

    await fetchData();

    alert(
      "Salary marked as paid successfully."
    );
  }

  /* =====================================================
     VIEW PAYROLL
  ===================================================== */

  async function viewPayroll(
    month: string,
    year: number
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("payroll")
      .select("*")
      .eq(
        "payroll_month",
        month
      )
      .eq(
        "payroll_year",
        year
      )
      .order(
        "staff_name"
      );

    if (error) {
      console.error(
        "View Payroll Error:",
        error
      );

      alert(
        error.message
      );

      return;
    }

    setSelectedPayroll(
      (data || []) as Payroll[]
    );

    setShowPayrollModal(
      true
    );
  }

  /* =====================================================
     SUMMARY
  ===================================================== */

  const grossPayroll =
    useMemo(() => {
      return selectedMonthPayroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.salary_earned || 0
          ),
        0
      );
    }, [
      selectedMonthPayroll,
    ]);

  const totalDeductions =
    useMemo(() => {
      return selectedMonthPayroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_deduction ||
              0
          ),
        0
      );
    }, [
      selectedMonthPayroll,
    ]);

  const netPayroll =
    useMemo(() => {
      return selectedMonthPayroll.reduce(
        (sum, item) =>
          sum +
          Number(
            item.balance_payable ||
              0
          ),
        0
      );
    }, [
      selectedMonthPayroll,
    ]);

  const paidPayroll =
    useMemo(() => {
      return selectedMonthPayroll
        .filter(
          (item) =>
            item.payment_status ===
            "Paid"
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.balance_payable ||
                0
            ),
          0
        );
    }, [
      selectedMonthPayroll,
    ]);

  const outstandingPayroll =
    Math.max(
      netPayroll -
        paidPayroll,
      0
    );

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredPayroll =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      if (!searchValue) {
        return selectedMonthPayroll;
      }

      return selectedMonthPayroll.filter(
        (item) =>
          item.staff_name
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          String(
            item.staff_id
          )
            .toLowerCase()
            .includes(
              searchValue
            ) ||
          (
            item.department ||
            ""
          )
            .toLowerCase()
            .includes(
              searchValue
            )
      );
    }, [
      selectedMonthPayroll,
      search,
    ]);

  /* =====================================================
     CHANGE PAYROLL PERIOD
  ===================================================== */

  function changePayrollMonth(
    month: string
  ) {
    setSelectedPayrollMonth(
      month
    );

    setSearch("");
  }

  function changePayrollYear(
    year: number
  ) {
    setSelectedPayrollYear(
      year
    );

    setSearch("");
  }

  /* =====================================================
     DOWNLOAD PAYROLL
  ===================================================== */

  function downloadPayroll() {
    if (
      selectedMonthPayroll.length ===
      0
    ) {
      alert(
        `There is no payroll generated for ${selectedPayrollMonth} ${selectedPayrollYear}.`
      );

      return;
    }

    const doc =
      new jsPDF();

    /* -----------------------------------------------
       HEADER
    ------------------------------------------------ */

    doc.setFillColor(
      15,
      23,
      42
    );

    doc.rect(
      0,
      0,
      210,
      35,
      "F"
    );

    doc.setTextColor(
      255,
      255,
      255
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(
      22
    );

    doc.text(
      "IRUKA INDUSTRIES LTD",
      105,
      16,
      {
        align:
          "center",
      }
    );

    doc.setFontSize(
      13
    );

    doc.text(
      "MONTHLY PAYROLL REPORT",
      105,
      25,
      {
        align:
          "center",
      }
    );

    doc.setTextColor(
      0,
      0,
      0
    );

    doc.setFontSize(
      11
    );

    doc.text(
      `Payroll Period: 1 - ${daysInMonth} ${selectedPayrollMonth} ${selectedPayrollYear}`,
      14,
      45
    );

    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      140,
      45
    );

    /* -----------------------------------------------
       TABLE
    ------------------------------------------------ */

    autoTable(
      doc,
      {
        startY:
          55,

        theme:
          "grid",

        headStyles:
          {
            fillColor:
              [
                15,
                23,
                42,
              ],

            textColor:
              [
                255,
                255,
                255,
              ],

            fontStyle:
              "bold",

            halign:
              "center",
          },

        alternateRowStyles:
          {
            fillColor:
              [
                245,
                247,
                250,
              ],
          },

        styles:
          {
            fontSize:
              8,

            cellPadding:
              3,

            valign:
              "middle",
          },

        head:
          [
            [
              "Staff ID",
              "Staff",
              "Department",
              "Position",
              "Salary",
              "Days",
              "Earned",
              "Deduction",
              "Net Pay",
              "Status",
            ],
          ],

        body:
          selectedMonthPayroll.map(
            (
              item
            ) => [
              item.staff_id,
              item.staff_name,
              item.department,
              item.position,
              money(
                Number(
                  item.basic_salary
                )
              ),
              item.days_worked,
              money(
                Number(
                  item.salary_earned
                )
              ),
              money(
                Number(
                  item.total_deduction
                )
              ),
              money(
                Number(
                  item.balance_payable
                )
              ),
              item.payment_status,
            ]
          ),
      }
    );

    const finalY =
      (doc as any)
        .lastAutoTable
        .finalY +
      15;

    /* -----------------------------------------------
       SUMMARY BOX
    ------------------------------------------------ */

    doc.setFontSize(
      12
    );

    doc.setDrawColor(
      200
    );

    doc.roundedRect(
      14,
      finalY,
      182,
      28,
      2,
      2
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.text(
      "Gross Payroll",
      18,
      finalY +
        8
    );

    doc.text(
      money(
        grossPayroll
      ),
      18,
      finalY +
        18
    );

    doc.text(
      "Deductions",
      78,
      finalY +
        8
    );

    doc.text(
      money(
        totalDeductions
      ),
      78,
      finalY +
        18
    );

    doc.text(
      "Net Payroll",
      150,
      finalY +
        8
    );

    doc.text(
      money(
        netPayroll
      ),
      150,
      finalY +
        18
    );

    /* -----------------------------------------------
       SIGNATURES
    ------------------------------------------------ */

    const signY =
      finalY +
      50;

    doc.line(
      18,
      signY,
      70,
      signY
    );

    doc.text(
      "Prepared By",
      25,
      signY +
        6
    );

    doc.line(
      82,
      signY,
      134,
      signY
    );

    doc.text(
      "Finance Manager",
      88,
      signY +
        6
    );

    doc.line(
      146,
      signY,
      198,
      signY
    );

    doc.text(
      "CEO Approval",
      154,
      signY +
        6
    );

    doc.setFontSize(
      9
    );

    doc.setTextColor(
      120,
      120,
      120
    );

    doc.text(
      "Generated automatically by IRUKA ERP System",
      105,
      290,
      {
        align:
          "center",
      }
    );

    doc.save(
      `Payroll-${selectedPayrollMonth}-${selectedPayrollYear}.pdf`
    );
  }

  /* =====================================================
     PRINT
  ===================================================== */

  function printPayroll() {
    if (
      selectedMonthPayroll.length ===
      0
    ) {
      alert(
        `There is no payroll generated for ${selectedPayrollMonth} ${selectedPayrollYear}.`
      );

      return;
    }

    window.print();
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-xl font-semibold">
          Loading Payroll...
        </p>
      </div>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <ProtectedRoute
      allowedRoles={[
        "admin",
        "accountant",
      ]}
    >
      <div className="min-h-screen bg-slate-100 p-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-900 to-slate-900 p-8 shadow-2xl mb-8">

          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">

            <div>

              <span className="inline-flex items-center rounded-full bg-blue-500/20 px-4 py-2 text-blue-300 text-sm font-semibold">
                Payroll Management
              </span>

              <h1 className="mt-5 text-5xl font-black text-white">
                Monthly Payroll
              </h1>

              <p className="mt-3 text-slate-300 text-lg">
                Generate payroll for any selected month at any time.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-4">

              {/* MONTH */}

              <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-5 border border-white/10">

                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Payroll Month
                </p>

                <h2 className="text-2xl font-bold text-white mt-2">
                  {selectedPayrollMonth}{" "}
                  {selectedPayrollYear}
                </h2>

              </div>

              {/* PERIOD */}

              <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-5 border border-white/10">

                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Payroll Period
                </p>

                <h2 className="text-xl font-bold text-white mt-2">
                  1 - {daysInMonth}
                </h2>

              </div>

              {/* COMPANY */}

              <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-5 border border-white/10">

                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Company
                </p>

                <h2 className="text-lg font-bold text-amber-400 mt-2">
                  IRUKA INDUSTRIES LTD
                </h2>

              </div>

              {/* STATUS */}

              <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-5 border border-white/10">

                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Status
                </p>

                <h2
                  className={`text-lg font-bold mt-2 ${
                    payrollAlreadyGenerated
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {payrollAlreadyGenerated
                    ? "GENERATED"
                    : "READY"}
                </h2>

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            PAYROLL PERIOD FILTER
        ===================================================== */}

        <div className="rounded-3xl bg-white shadow-xl p-8 mb-8">

          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">

            <div>

              <div className="flex items-center gap-3">

                <div className="rounded-2xl bg-blue-100 p-3">
                  <CalendarDays
                    size={25}
                    className="text-blue-800"
                  />
                </div>

                <div>

                  <h2 className="text-2xl font-black text-slate-900">
                    Select Payroll Period
                  </h2>

                  <p className="text-slate-500 mt-1">
                    Choose the month and year you want to generate or view.
                  </p>

                </div>

              </div>

            </div>

            <div className="flex flex-col sm:flex-row gap-4">

              {/* MONTH SELECTOR */}

              <div className="relative">

                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Month
                </label>

                <div className="relative">

                  <select
                    value={selectedPayrollMonth}
                    onChange={(e) =>
                      changePayrollMonth(
                        e.target.value
                      )
                    }
                    className="appearance-none min-w-[190px] rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 pr-12 font-bold text-slate-900 outline-none transition focus:border-blue-800"
                  >
                    {months.map(
                      (month) => (
                        <option
                          key={month}
                          value={month}
                        >
                          {month}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                </div>

              </div>

              {/* YEAR SELECTOR */}

              <div className="relative">

                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Year
                </label>

                <div className="relative">

                  <select
                    value={selectedPayrollYear}
                    onChange={(e) =>
                      changePayrollYear(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="appearance-none min-w-[150px] rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 pr-12 font-bold text-slate-900 outline-none transition focus:border-blue-800"
                  >
                    {years.map(
                      (year) => (
                        <option
                          key={year}
                          value={year}
                        >
                          {year}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                </div>

              </div>

            </div>

          </div>

          {/* SELECTED PERIOD MESSAGE */}

          <div className="mt-6 rounded-2xl bg-blue-50 border border-blue-100 p-5">

            <p className="text-blue-900 font-semibold">

              Selected payroll period:

              <span className="font-black ml-2">
                1 - {daysInMonth}{" "}
                {selectedPayrollMonth}{" "}
                {selectedPayrollYear}
              </span>

            </p>

            <p className="text-sm text-blue-700 mt-1">
              Payroll can be generated now. There is no requirement to wait until the end of the month.
            </p>

          </div>

        </div>

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

          {/* EMPLOYEES */}

          <div className="rounded-3xl bg-white shadow-xl p-7">

            <div className="flex items-center justify-between">

              <Users
                className="text-blue-700"
                size={40}
              />

              <span className="text-sm font-semibold text-slate-500">
                Employees
              </span>

            </div>

            <h2 className="text-4xl font-black text-slate-900 mt-6">
              {selectedMonthPayroll.length ||
                staff.length}
            </h2>

          </div>

          {/* GROSS */}

          <div className="rounded-3xl bg-white shadow-xl p-7">

            <div className="flex items-center justify-between">

              <Wallet
                className="text-green-600"
                size={40}
              />

              <span className="text-sm font-semibold text-slate-500">
                Gross Payroll
              </span>

            </div>

            <h2 className="text-3xl font-black text-green-700 mt-6">
              {money(
                grossPayroll
              )}
            </h2>

          </div>

          {/* DEDUCTIONS */}

          <div className="rounded-3xl bg-white shadow-xl p-7">

            <div className="flex items-center justify-between">

              <Landmark
                className="text-red-600"
                size={40}
              />

              <span className="text-sm font-semibold text-slate-500">
                Deductions
              </span>

            </div>

            <h2 className="text-3xl font-black text-red-600 mt-6">
              {money(
                totalDeductions
              )}
            </h2>

          </div>

          {/* BALANCE */}

          <div className="rounded-3xl bg-white shadow-xl p-7">

            <div className="flex items-center justify-between">

              <FileSpreadsheet
                className="text-amber-500"
                size={40}
              />

              <span className="text-sm font-semibold text-slate-500">
                Balance Payable
              </span>

            </div>

            <h2 className="text-3xl font-black text-slate-900 mt-6">
              {money(
                netPayroll
              )}
            </h2>

            {payrollAlreadyGenerated && (
              <p className="text-sm text-slate-500 mt-3">

                Outstanding:{" "}

                <span className="font-bold text-red-600">
                  {money(
                    outstandingPayroll
                  )}
                </span>

              </p>
            )}

          </div>

        </div>

        {/* =====================================================
            CONTROLS
        ===================================================== */}

        <div className="rounded-3xl bg-white shadow-xl p-8 mb-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

            <div>

              <h2 className="text-3xl font-black text-slate-900">
                Payroll Controls
              </h2>

              <p className="text-slate-500 mt-2">
                Generate payroll for the selected month, download the payroll sheet or print it.
              </p>

              <p className="text-blue-700 font-semibold mt-3">
                Payroll period: 1 -{" "}
                {daysInMonth}{" "}
                {selectedPayrollMonth}{" "}
                {selectedPayrollYear}
              </p>

              {payrollAlreadyGenerated && (
                <p className="text-green-700 font-semibold mt-2">
                  Payroll for this period has already been generated.
                </p>
              )}

            </div>

            <div className="flex flex-wrap gap-4">

              {/* GENERATE */}

              <button
                onClick={
                  generatePayroll
                }
                disabled={
                  generating ||
                  payrollAlreadyGenerated
                }
                className={`rounded-2xl px-6 py-4 text-white font-bold transition ${
                  generating ||
                  payrollAlreadyGenerated
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-950"
                }`}
              >
                {generating
                  ? "Generating..."
                  : payrollAlreadyGenerated
                  ? "Payroll Generated"
                  : "Generate Payroll"}
              </button>

              {/* DOWNLOAD */}

              <button
                onClick={
                  downloadPayroll
                }
                disabled={
                  selectedMonthPayroll.length ===
                  0
                }
                className={`rounded-2xl px-6 py-4 text-white font-bold transition flex items-center gap-2 ${
                  selectedMonthPayroll.length ===
                  0
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                <Download
                  size={18}
                />

                Download
              </button>

              {/* PRINT */}

              <button
                onClick={
                  printPayroll
                }
                disabled={
                  selectedMonthPayroll.length ===
                  0
                }
                className={`rounded-2xl px-6 py-4 text-white font-bold transition flex items-center gap-2 ${
                  selectedMonthPayroll.length ===
                  0
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-black"
                }`}
              >
                <Printer
                  size={18}
                />

                Print
              </button>

            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div className="rounded-3xl bg-white shadow-xl p-6 mb-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder={`Search ${selectedPayrollMonth} ${selectedPayrollYear} payroll...`}
              className="w-full lg:w-96 rounded-2xl border-2 border-slate-200 px-5 py-4 outline-none focus:border-blue-800"
            />

            <div className="flex items-center gap-2 text-slate-600">

              <CalendarDays
                size={20}
              />

              <span className="font-semibold">
                {selectedPayrollMonth}{" "}
                {selectedPayrollYear}
              </span>

            </div>

          </div>

        </div>

        {/* =====================================================
            PAYROLL TABLE
        ===================================================== */}

        <div className="rounded-3xl bg-white shadow-xl overflow-hidden mb-10">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="bg-slate-900 text-white">

                  <th className="px-6 py-5 text-left">
                    Photo
                  </th>

                  <th className="px-6 py-5 text-left">
                    Staff
                  </th>

                  <th className="px-6 py-5 text-left">
                    Department
                  </th>

                  <th className="px-6 py-5 text-left">
                    Position
                  </th>

                  <th className="px-6 py-5 text-left">
                    Bank
                  </th>

                  <th className="px-6 py-5 text-left">
                    Account No.
                  </th>

                  <th className="px-6 py-5 text-right">
                    Salary
                  </th>

                  <th className="px-6 py-5 text-center">
                    Days Worked
                  </th>

                  <th className="px-6 py-5 text-right">
                    Salary Earned
                  </th>

                  <th className="px-6 py-5 text-right">
                    Deduction
                  </th>

                  <th className="px-6 py-5 text-right">
                    Balance
                  </th>

                  <th className="px-6 py-5 text-center">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredPayroll.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={12}
                      className="text-center py-16 text-slate-500"
                    >

                      {payrollAlreadyGenerated
                        ? "No payroll records match your search."
                        : `No payroll generated for ${selectedPayrollMonth} ${selectedPayrollYear}.`}

                    </td>

                  </tr>

                ) : (

                  filteredPayroll.map(
                    (item) => (

                      <tr
                        key={
                          item.id
                        }
                        className="border-b hover:bg-slate-50"
                      >

<td className="px-6 py-5">

  <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center border-2 border-slate-200">

    {staffByDatabaseId[item.staff_id]?.photo_url ? (
      <img
        src={
          staffByDatabaseId[
            item.staff_id
          ]?.photo_url || ""
        }
        alt={item.staff_name}
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="text-xl">
        👤
      </span>
    )}

  </div>

</td>

                        <td className="px-6 py-5">

                          <div>

                            <p className="font-bold text-slate-900">
                              {
                                item.staff_name
                              }
                            </p>

                            <p className="text-sm text-slate-500">
                              {item.account_name ||
                                "No account name"}
                            </p>

                          </div>

                        </td>

                        <td className="px-6 py-5">
                          {
                            item.department
                          }
                        </td>

                        <td className="px-6 py-5">
                          {
                            item.position
                          }
                        </td>

                        <td className="px-6 py-5">
                          {
                            item.bank_name ||
                            "-"
                          }
                        </td>

                        <td className="px-6 py-5 font-mono">
                          {
                            item.account_number ||
                            "-"
                          }
                        </td>

                        <td className="px-6 py-5 text-right font-semibold">
                          {money(
                            Number(
                              item.basic_salary
                            )
                          )}
                        </td>

                        <td className="px-6 py-5 text-center font-semibold">
                          {
                            item.days_worked
                          }
                        </td>

                        <td className="px-6 py-5 text-right font-semibold text-blue-700">
                          {money(
                            Number(
                              item.salary_earned
                            )
                          )}
                        </td>

                        <td className="px-6 py-5 text-right text-red-600 font-semibold">
                          {money(
                            Number(
                              item.total_deduction
                            )
                          )}
                        </td>

                        <td className="px-6 py-5 text-right text-green-700 font-bold">
                          {money(
                            Number(
                              item.balance_payable
                            )
                          )}
                        </td>

                        <td className="px-6 py-5 text-center">

                          <div className="flex items-center justify-center gap-3">

                            <span
                              className={`rounded-full px-4 py-2 text-sm font-bold ${
                                item.payment_status ===
                                "Paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {
                                item.payment_status
                              }
                            </span>

                            {item.payment_status ===
                              "Ready" && (

                              <button
                                onClick={() =>
                                  paySalary(
                                    item.id
                                  )
                                }
                                className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 text-xs font-bold"
                              >
                                Pay
                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* =====================================================
            PAYROLL RECORDS
        ===================================================== */}

        <div className="rounded-3xl bg-white shadow-xl p-8">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

            <div>

              <h2 className="text-3xl font-black text-slate-900">
                Payroll Records
              </h2>

              <p className="text-slate-500 mt-2">
                All generated payroll periods are stored here.
              </p>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>

                <tr className="bg-slate-900 text-white">

                  <th className="px-6 py-5 text-left">
                    Month
                  </th>

                  <th className="px-6 py-5 text-center">
                    Employees
                  </th>

                  <th className="px-6 py-5 text-right">
                    Gross Payroll
                  </th>

                  <th className="px-6 py-5 text-right">
                    Deductions
                  </th>

                  <th className="px-6 py-5 text-right">
                    Net Payroll
                  </th>

                  <th className="px-6 py-5 text-center">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {Array.from(
                  new Map(
                    payroll.map(
                      (item) => [
                        `${item.payroll_month}-${item.payroll_year}`,
                        item,
                      ]
                    )
                  ).values()
                )
                  .sort(
                    (a, b) => {
                      const dateA =
                        new Date(
                          Number(
                            a.payroll_year
                          ),
                          getMonthIndex(
                            a.payroll_month
                          ),
                          1
                        ).getTime();

                      const dateB =
                        new Date(
                          Number(
                            b.payroll_year
                          ),
                          getMonthIndex(
                            b.payroll_month
                          ),
                          1
                        ).getTime();

                      return (
                        dateB -
                        dateA
                      );
                    }
                  )
                  .map(
                    (row) => {

                      const monthPayroll =
                        payroll.filter(
                          (item) =>
                            item.payroll_month ===
                              row.payroll_month &&
                            Number(
                              item.payroll_year
                            ) ===
                              Number(
                                row.payroll_year
                              )
                        );

                      const historicalGross =
                        monthPayroll.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            Number(
                              item.salary_earned ||
                                0
                            ),
                          0
                        );

                      const historicalDeductions =
                        monthPayroll.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            Number(
                              item.total_deduction ||
                                0
                            ),
                          0
                        );

                      const historicalNet =
                        monthPayroll.reduce(
                          (
                            sum,
                            item
                          ) =>
                            sum +
                            Number(
                              item.balance_payable ||
                                0
                            ),
                          0
                        );

                      return (
                        <tr
                          key={`${row.payroll_month}-${row.payroll_year}`}
                          className={`border-b hover:bg-slate-50 ${
                            row.payroll_month ===
                              selectedPayrollMonth &&
                            Number(
                              row.payroll_year
                            ) ===
                              Number(
                                selectedPayrollYear
                              )
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >

                          <td className="px-6 py-5 font-semibold">

                            {row.payroll_month}{" "}
                            {row.payroll_year}

                            {row.payroll_month ===
                              selectedPayrollMonth &&
                              Number(
                                row.payroll_year
                              ) ===
                                Number(
                                  selectedPayrollYear
                                ) && (

                                <span className="ml-3 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold">
                                  SELECTED
                                </span>

                              )}

                          </td>

                          <td className="px-6 py-5 text-center">
                            {
                              monthPayroll.length
                            }
                          </td>

                          <td className="px-6 py-5 text-right">
                            {money(
                              historicalGross
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-red-600">
                            {money(
                              historicalDeductions
                            )}
                          </td>

                          <td className="px-6 py-5 text-right text-green-700 font-bold">
                            {money(
                              historicalNet
                            )}
                          </td>

                          <td className="px-6 py-5 text-center">

                            <button
                              onClick={() =>
                                viewPayroll(
                                  row.payroll_month,
                                  Number(
                                    row.payroll_year
                                  )
                                )
                              }
                              className="rounded-xl bg-blue-900 hover:bg-blue-950 text-white px-5 py-2"
                            >
                              View
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                {payroll.length ===
                  0 && (

                  <tr>

                    <td
                      colSpan={6}
                      className="text-center py-14 text-slate-500"
                    >
                      No payroll records found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* =====================================================
          PAYROLL DETAILS MODAL
      ===================================================== */}

      {showPayrollModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-6xl max-h-[85vh] overflow-y-auto p-8">

            <div className="flex items-center justify-between mb-6">

              <div>

                <h2 className="text-3xl font-black">
                  Payroll Details
                </h2>

                {selectedPayroll.length >
                  0 && (

                  <p className="text-slate-500 mt-1">

                    {
                      selectedPayroll[0]
                        .payroll_month
                    }{" "}

                    {
                      selectedPayroll[0]
                        .payroll_year
                    }

                  </p>

                )}

              </div>

              <button
                onClick={() =>
                  setShowPayrollModal(
                    false
                  )
                }
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl"
              >
                Close
              </button>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>

                  <tr className="bg-slate-900 text-white">

                    <th className="p-4 text-left">
                      Staff
                    </th>

                    <th className="p-4 text-left">
                      Department
                    </th>

                    <th className="p-4 text-left">
                      Bank
                    </th>

                    <th className="p-4 text-left">
                      Account No.
                    </th>

                    <th className="p-4 text-right">
                      Salary
                    </th>

                    <th className="p-4 text-center">
                      Days
                    </th>

                    <th className="p-4 text-right">
                      Earned
                    </th>

                    <th className="p-4 text-right">
                      Deduction
                    </th>

                    <th className="p-4 text-right">
                      Net Pay
                    </th>

                    <th className="p-4 text-center">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {selectedPayroll.map(
                    (item) => (

                      <tr
                        key={
                          item.id
                        }
                        className="border-b"
                      >

                        <td className="p-4">

                          <p className="font-bold">
                            {
                              item.staff_name
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              item.account_name ||
                              "No account name"
                            }
                          </p>

                        </td>

                        <td className="p-4">
                          {
                            item.department
                          }
                        </td>

                        <td className="p-4">
                          {
                            item.bank_name ||
                            "-"
                          }
                        </td>

                        <td className="p-4 font-mono">
                          {
                            item.account_number ||
                            "-"
                          }
                        </td>

                        <td className="p-4 text-right">
                          {money(
                            Number(
                              item.basic_salary
                            )
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {
                            item.days_worked
                          }
                        </td>

                        <td className="p-4 text-right">
                          {money(
                            Number(
                              item.salary_earned
                            )
                          )}
                        </td>

                        <td className="p-4 text-right text-red-600">
                          {money(
                            Number(
                              item.total_deduction
                            )
                          )}
                        </td>

                        <td className="p-4 text-right text-green-700 font-bold">
                          {money(
                            Number(
                              item.balance_payable
                            )
                          )}
                        </td>

                        <td className="p-4 text-center">

                          <span
                            className={`px-4 py-2 rounded-full font-semibold ${
                              item.payment_status ===
                              "Paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {
                              item.payment_status
                            }
                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

    </ProtectedRoute>
  );
}