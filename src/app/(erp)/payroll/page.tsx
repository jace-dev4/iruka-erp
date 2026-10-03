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
  paid_at: string | null;
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

    const [selectedEmployeePayroll, setSelectedEmployeePayroll] =
  useState<Payroll | null>(null);

const [showEmployeePayrollModal, setShowEmployeePayrollModal] =
  useState(false);

const [processingPayment, setProcessingPayment] =
  useState(false);

  const [search, setSearch] = useState("");

  /* =====================================================
     SELECTED PAYROLL PERIOD
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
  ===================================================== */

  async function generatePayroll() {
    if (generating) return;

    if (payrollAlreadyGenerated) {
      alert(
        `Payroll for ${selectedPayrollMonth} ${selectedPayrollYear} has already been generated.`
      );

      return;
    }

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

      for (const employee of staff) {
        const calculation =
          calculatePayrollForStaff(
            employee
          );

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

      if (
        payrollRows.length === 0
      ) {
        alert(
          `No eligible staff members were found for ${selectedPayrollMonth} ${selectedPayrollYear}.`
        );

        return;
      }

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

  async function paySalary(id: number) {
  if (processingPayment) return;

  const confirmed = window.confirm(
    "Confirm that this salary has actually been paid?"
  );

  if (!confirmed) return;

  try {
    setProcessingPayment(true);

    const paidAt = new Date().toISOString();

    const { error } = await supabase
      .from("payroll")
      .update({
        payment_status: "Paid",
        paid_at: paidAt,
      })
      .eq("id", id);

    if (error) {
      console.error(
        "Salary Payment Error:",
        error
      );

      alert(error.message);
      return;
    }

    await fetchData();

    setSelectedEmployeePayroll((current) =>
      current
        ? {
            ...current,
            payment_status: "Paid",
            paid_at: paidAt,
          }
        : null
    );
  } catch (error: any) {
    console.error(
      "Salary Payment Error:",
      error
    );

    alert(
      error?.message ||
        "Unable to mark salary as paid."
    );
  } finally {
    setProcessingPayment(false);
  }
}

function openEmployeePayroll(item: Payroll) {
  setSelectedEmployeePayroll(item);
  setShowEmployeePayrollModal(true);
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
   DOWNLOAD PAYROLL PDF
===================================================== */

function downloadPayroll() {
  if (selectedMonthPayroll.length === 0) {
    alert(
      `There is no payroll generated for ${selectedPayrollMonth} ${selectedPayrollYear}.`
    );
    return;
  }

  /* =====================================================
     PDF DOCUMENT
  ===================================================== */

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 297;
  const pageHeight = 210;

  const margin = 10;

  /* =====================================================
     COLORS
  ===================================================== */

const navy: [number, number, number] = [15, 23, 42];
const blue: [number, number, number] = [37, 99, 235];
const lightBlue: [number, number, number] = [239, 246, 255];
const slate: [number, number, number] = [71, 85, 105];
const dark: [number, number, number] = [15, 23, 42];
const green: [number, number, number] = [5, 150, 105];
const lightGreen: [number, number, number] = [236, 253, 245];
const yellow: [number, number, number] = [217, 119, 6];
const lightYellow: [number, number, number] = [255, 251, 235];
const red: [number, number, number] = [220, 38, 38];
const line: [number, number, number] = [226, 232, 240];

  /* =====================================================
     HEADER / BRAND AREA
  ===================================================== */

  doc.setFillColor(
    navy[0],
    navy[1],
    navy[2]
  );

  doc.rect(
    0,
    0,
    pageWidth,
    42,
    "F"
  );

  /* -----------------------------------------------------
     LOGO BOX
  ----------------------------------------------------- */

  doc.setFillColor(
    blue[0],
    blue[1],
    blue[2]
  );

  doc.roundedRect(
    12,
    8,
    25,
    25,
    4,
    4,
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
    19
  );

  doc.text(
    "I",
    24.5,
    25,
    {
      align: "center",
    }
  );

  /* -----------------------------------------------------
     BRAND NAME
  ----------------------------------------------------- */

  doc.setFontSize(
    17
  );

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.text(
    "IRUKA INDUSTRIES LTD",
    44,
    16
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    203,
    213,
    225
  );

  doc.text(
    "NKIRUKA / IRUKA INDUSTRIES LTD",
    44,
    23
  );

  doc.setFontSize(
    7.5
  );

  doc.text(
    "BUSINESS MANAGEMENT • PRODUCTION • FINANCE • PAYROLL",
    44,
    29
  );

  /* -----------------------------------------------------
     REPORT TITLE
  ----------------------------------------------------- */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    18
  );

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.text(
    "MONTHLY PAYROLL REPORT",
    pageWidth - 12,
    17,
    {
      align: "right",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    203,
    213,
    225
  );

  doc.text(
    `${selectedPayrollMonth} ${selectedPayrollYear}`,
    pageWidth - 12,
    25,
    {
      align: "right",
    }
  );

  doc.text(
    `Generated ${new Date().toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    )}`,
    pageWidth - 12,
    31,
    {
      align: "right",
    }
  );

  /* =====================================================
     REPORT INFORMATION
  ===================================================== */

  doc.setTextColor(
    dark[0],
    dark[1],
    dark[2]
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    9
  );

  doc.text(
    "PAYROLL PERIOD",
    margin,
    51
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    9
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    `1 - ${daysInMonth} ${selectedPayrollMonth} ${selectedPayrollYear}`,
    margin,
    57
  );

  /* -----------------------------------------------------
     EMPLOYEE COUNT
  ----------------------------------------------------- */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setTextColor(
    dark[0],
    dark[1],
    dark[2]
  );

  doc.text(
    "EMPLOYEES",
    105,
    51
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    `${selectedMonthPayroll.length} payroll record${
      selectedMonthPayroll.length === 1
        ? ""
        : "s"
    }`,
    105,
    57
  );

  /* -----------------------------------------------------
     PAYMENT STATUS SUMMARY
  ----------------------------------------------------- */

  const paidCount =
    selectedMonthPayroll.filter(
      (item) =>
        item.payment_status === "Paid"
    ).length;

  const readyCount =
    selectedMonthPayroll.filter(
      (item) =>
        item.payment_status !== "Paid"
    ).length;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setTextColor(
    dark[0],
    dark[1],
    dark[2]
  );

  doc.text(
    "PAYMENT STATUS",
    190,
    51
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setTextColor(
    green[0],
    green[1],
    green[2]
  );

  doc.text(
    `Paid: ${paidCount}`,
    190,
    57
  );

  doc.setTextColor(
    yellow[0],
    yellow[1],
    yellow[2]
  );

  doc.text(
    `Ready: ${readyCount}`,
    225,
    57
  );

  /* =====================================================
     PAYROLL TABLE
  ===================================================== */

  autoTable(doc, {
    startY: 65,

    margin: {
      left: margin,
      right: margin,
    },

    tableWidth: "auto",

    theme: "grid",

    head: [
      [
        "Staff ID",
        "Employee",
        "Department",
        "Position",
        "Basic Salary",
        "Days",
        "Salary Earned",
        "Deduction",
        "Balance Payable",
        "Status",
      ],
    ],

    body: selectedMonthPayroll.map(
      (item) => [
        staff.find(
          (s) =>
            s.id === item.staff_id
        )?.staff_id || "-",

        item.staff_name || "-",

        item.department || "-",

        item.position || "-",

        money(
          Number(
            item.basic_salary
          )
        ),

        String(
          item.days_worked ?? 0
        ),

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

        item.payment_status ===
        "Paid"
          ? "PAID"
          : "READY",
      ]
    ),

    headStyles: {
      fillColor: [
        navy[0],
        navy[1],
        navy[2],
      ],

      textColor: [
        255,
        255,
        255,
      ],

      fontStyle:
        "bold",

      fontSize: 7.5,

      halign:
        "center",

      valign:
        "middle",

      cellPadding: 3,

      lineWidth: 0,
    },

    bodyStyles: {
      fontSize: 7,

      textColor: [
        30,
        41,
        59,
      ],

      valign:
        "middle",

      cellPadding: 2.7,

      lineColor: [
        ...line,
      ],

      lineWidth:
        0.15,
    },

    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
    },

    styles: {
      overflow:
        "linebreak",

      valign:
        "middle",

      font:
        "helvetica",

      lineColor: [
        ...line,
      ],

      lineWidth:
        0.15,
    },

    columnStyles: {
      0: {
        cellWidth: 25,
        halign:
          "center",
      },

      1: {
        cellWidth: 37,
        fontStyle:
          "bold",
      },

      2: {
        cellWidth: 29,
      },

      3: {
        cellWidth: 29,
      },

      4: {
        cellWidth: 27,
        halign:
          "right",
      },

      5: {
        cellWidth: 17,
        halign:
          "center",
      },

      6: {
        cellWidth: 29,
        halign:
          "right",
      },

      7: {
        cellWidth: 27,
        halign:
          "right",
      },

      8: {
        cellWidth: 30,
        halign:
          "right",
      },

      9: {
        cellWidth: 25,
        halign:
          "center",
      },
    },

    didParseCell:
      (data) => {
        if (
          data.section ===
            "body" &&
          data.column.index ===
            9
        ) {
          if (
            data.cell.raw ===
            "PAID"
          ) {
            data.cell.styles.textColor =
              green;

            data.cell.styles.fontStyle =
              "bold";
          } else {
            data.cell.styles.textColor =
              yellow;

            data.cell.styles.fontStyle =
              "bold";
          }
        }
      },
  });

  /* =====================================================
     SUMMARY
  ===================================================== */

  const finalY =
    (doc as any)
      .lastAutoTable
      .finalY + 10;

  const summaryHeight =
    30;

  /* -----------------------------------------------------
     SUMMARY CONTAINER
  ----------------------------------------------------- */

  doc.setFillColor(
    248,
    250,
    252
  );

  doc.setDrawColor(
    226,
    232,
    240
  );

  doc.roundedRect(
    margin,
    finalY,
    pageWidth -
      margin * 2,
    summaryHeight,
    3,
    3,
    "FD"
  );

  /* -----------------------------------------------------
     GROSS PAYROLL
  ----------------------------------------------------- */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    "GROSS PAYROLL",
    18,
    finalY + 9
  );

  doc.setFontSize(
    12
  );

  doc.setTextColor(
    dark[0],
    dark[1],
    dark[2]
  );

  doc.text(
    money(
      grossPayroll
    ),
    18,
    finalY + 20
  );

  /* -----------------------------------------------------
     TOTAL DEDUCTIONS
  ----------------------------------------------------- */

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    "TOTAL DEDUCTIONS",
    105,
    finalY + 9
  );

  doc.setFontSize(
    12
  );

  doc.setTextColor(
    red[0],
    red[1],
    red[2]
  );

  doc.text(
    money(
      totalDeductions
    ),
    105,
    finalY + 20
  );

  /* -----------------------------------------------------
     NET PAYROLL
  ----------------------------------------------------- */

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    "NET PAYROLL",
    205,
    finalY + 9
  );

  doc.setFontSize(
    12
  );

  doc.setTextColor(
    green[0],
    green[1],
    green[2]
  );

  doc.text(
    money(
      netPayroll
    ),
    205,
    finalY + 20
  );

  /* =====================================================
     SIGNATURE SECTION
  ===================================================== */

  const signY =
    finalY + 48;

  doc.setDrawColor(
    148,
    163,
    184
  );

  /* Prepared By */

  doc.line(
    18,
    signY,
    75,
    signY
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(
    8
  );

  doc.setTextColor(
    slate[0],
    slate[1],
    slate[2]
  );

  doc.text(
    "PREPARED BY",
    18,
    signY + 6
  );

  /* Finance Manager */

  doc.line(
    120,
    signY,
    177,
    signY
  );

  doc.text(
    "FINANCE MANAGER",
    120,
    signY + 6
  );

  /* CEO Approval */

  doc.line(
    222,
    signY,
    279,
    signY
  );

  doc.text(
    "CEO APPROVAL",
    222,
    signY + 6
  );

  /* =====================================================
     FOOTER
  ===================================================== */

  doc.setDrawColor(
    226,
    232,
    240
  );

  doc.line(
    10,
    pageHeight - 12,
    pageWidth - 10,
    pageHeight - 12
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(
    7
  );

  doc.setTextColor(
    100,
    116,
    139
  );

  doc.text(
    "IRUKA ERP • Payroll Management System",
    10,
    pageHeight - 6
  );

  doc.text(
    "Generated automatically",
    pageWidth / 2,
    pageHeight - 6,
    {
      align:
        "center",
    }
  );

  doc.text(
    `Page 1`,
    pageWidth - 10,
    pageHeight - 6,
    {
      align:
        "right",
    }
  );

  /* =====================================================
     SAVE PDF
  ===================================================== */

  doc.save(
    `IRUKA-Payroll-${selectedPayrollMonth}-${selectedPayrollYear}.pdf`
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
                    Account No.
                  </th>

                  <th className="px-6 py-5 text-left">
                    Bank Name
                  </th>

                  <th className="px-6 py-5 text-left">
                    Account Name
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
  key={item.id}
  onClick={() => openEmployeePayroll(item)}
  className="border-b hover:bg-blue-50 cursor-pointer transition"
>

                        {/* PHOTO */}

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

                        {/* STAFF + STAFF ID */}

                        <td className="px-6 py-5">

                          <div>

<p className="font-bold text-slate-900 group-hover:text-blue-800">
  {item.staff_name}
</p>

                            <p className="text-sm text-blue-700 font-semibold">
                              {staffByDatabaseId[
                                item.staff_id
                              ]?.staff_id || "-"}
                            </p>

                          </div>

                        </td>

                        {/* DEPARTMENT */}

                        <td className="px-6 py-5">
                          {item.department || "-"}
                        </td>

                        {/* ACCOUNT NUMBER */}

                        <td className="px-6 py-5 font-mono">
                          {item.account_number || "-"}
                        </td>

                        {/* BANK NAME */}

                        <td className="px-6 py-5">
                          {item.bank_name || "-"}
                        </td>

                        {/* ACCOUNT NAME */}

                        <td className="px-6 py-5">
                          {item.account_name || "-"}
                        </td>

                        {/* SALARY */}

                        <td className="px-6 py-5 text-right font-semibold">
                          {money(
                            Number(
                              item.basic_salary
                            )
                          )}
                        </td>

                        {/* DAYS WORKED */}

                        <td className="px-6 py-5 text-center font-semibold">
                          {
                            item.days_worked
                          }
                        </td>

                        {/* SALARY EARNED */}

                        <td className="px-6 py-5 text-right font-semibold text-blue-700">
                          {money(
                            Number(
                              item.salary_earned
                            )
                          )}
                        </td>

                        {/* DEDUCTION */}

                        <td className="px-6 py-5 text-right text-red-600 font-semibold">
                          {money(
                            Number(
                              item.total_deduction
                            )
                          )}
                        </td>

                        {/* BALANCE */}

                        <td className="px-6 py-5 text-right text-green-700 font-bold">
                          {money(
                            Number(
                              item.balance_payable
                            )
                          )}
                        </td>

                        {/* STATUS */}

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
                      Account No.
                    </th>

                    <th className="p-4 text-left">
                      Bank Name
                    </th>

                    <th className="p-4 text-left">
                      Account Name
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

                        {/* STAFF + STAFF ID */}

                        <td className="p-4">

                          <p className="font-bold text-slate-900">
                            {
                              item.staff_name
                            }
                          </p>

                          <p className="text-xs text-blue-700 font-semibold">
                            {staffByDatabaseId[
                              item.staff_id
                            ]?.staff_id || "-"}
                          </p>

                        </td>

                        {/* DEPARTMENT */}

                        <td className="p-4">
                          {
                            item.department ||
                            "-"
                          }
                        </td>

                        {/* ACCOUNT NUMBER */}

                        <td className="p-4 font-mono">
                          {
                            item.account_number ||
                            "-"
                          }
                        </td>

                        {/* BANK NAME */}

                        <td className="p-4">
                          {
                            item.bank_name ||
                            "-"
                          }
                        </td>

                        {/* ACCOUNT NAME */}

                        <td className="p-4">
                          {
                            item.account_name ||
                            "-"
                          }
                        </td>

                        {/* SALARY */}

                        <td className="p-4 text-right">
                          {money(
                            Number(
                              item.basic_salary
                            )
                          )}
                        </td>

                        {/* DAYS */}

                        <td className="p-4 text-center">
                          {
                            item.days_worked
                          }
                        </td>

                        {/* EARNED */}

                        <td className="p-4 text-right">
                          {money(
                            Number(
                              item.salary_earned
                            )
                          )}
                        </td>

                        {/* DEDUCTION */}

                        <td className="p-4 text-right text-red-600">
                          {money(
                            Number(
                              item.total_deduction
                            )
                          )}
                        </td>

                        {/* NET PAY */}

                        <td className="p-4 text-right text-green-700 font-bold">
                          {money(
                            Number(
                              item.balance_payable
                            )
                          )}
                        </td>

                        {/* STATUS */}

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

      {/* =====================================================
    EMPLOYEE PAYROLL PROFILE MODAL
===================================================== */}

{showEmployeePayrollModal &&
  selectedEmployeePayroll && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Employee Payroll Profile
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              Payroll Information
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowEmployeePayrollModal(false)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-red-100 hover:text-red-600"
          >
            ✕
          </button>

        </div>

        <div className="p-6">

          {/* EMPLOYEE */}
          <div className="rounded-3xl bg-slate-900 p-6 text-white">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">

                {staff.find(
                  (s) =>
                    s.id.toString() ===
                    selectedEmployeePayroll.staff_id.toString()
                )?.photo_url ? (

                  <img
                    src={
                      staff.find(
                        (s) =>
                          s.id.toString() ===
                          selectedEmployeePayroll.staff_id.toString()
                      )?.photo_url || ""
                    }
                    alt={
                      selectedEmployeePayroll.staff_name
                    }
                    className="h-full w-full object-cover"
                  />

                ) : (

                  <span className="text-3xl font-black text-white">
                    {selectedEmployeePayroll.staff_name
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                )}

              </div>

              <div className="flex-1">

                <p className="text-sm font-semibold text-blue-300">
                  EMPLOYEE
                </p>

                <h3 className="mt-1 text-3xl font-black">
                  {selectedEmployeePayroll.staff_name}
                </h3>

                <div className="mt-3 flex flex-wrap gap-3">

                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                    Staff ID:{" "}
                    {
                      staff.find(
                        (s) =>
                          s.id.toString() ===
                          selectedEmployeePayroll.staff_id.toString()
                      )?.staff_id
                    }
                  </span>

                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
                    {
                      selectedEmployeePayroll.department
                    }
                  </span>

                </div>

              </div>

            </div>

          </div>


          {/* PAYMENT DETAILS */}
          <div className="mt-6">

            <h3 className="mb-4 text-xl font-black text-slate-900">
              Payment Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">
                  Bank Name
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {selectedEmployeePayroll.bank_name ||
                    "Not provided"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">
                  Account Name
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {selectedEmployeePayroll.account_name ||
                    "Not provided"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">
                  Account Number
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {selectedEmployeePayroll.account_number ||
                    "Not provided"}
                </p>
              </div>

            </div>

          </div>


          {/* PAYROLL DETAILS */}
          <div className="mt-8">

            <h3 className="mb-4 text-xl font-black text-slate-900">
              Payroll Details
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Payroll Period
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {selectedEmployeePayroll.payroll_month}{" "}
                  {selectedEmployeePayroll.payroll_year}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Basic Salary
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {money(
                    selectedEmployeePayroll.basic_salary
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Days Worked
                </p>

                <p className="mt-2 font-black text-slate-900">
                  {selectedEmployeePayroll.days_worked}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Salary Earned
                </p>

                <p className="mt-2 font-black text-blue-800">
                  {money(
                    selectedEmployeePayroll.salary_earned
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">
                  Deduction
                </p>

                <p className="mt-2 font-black text-red-600">
                  {money(
                    selectedEmployeePayroll.total_deduction
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-emerald-700">
                  Balance Payable
                </p>

                <p className="mt-2 text-xl font-black text-emerald-700">
                  {money(
                    selectedEmployeePayroll.balance_payable
                  )}
                </p>
              </div>

            </div>

          </div>


          {/* PAYMENT STATUS */}
          <div className="mt-8">

            <h3 className="mb-4 text-xl font-black text-slate-900">
              Payment Status
            </h3>

            {selectedEmployeePayroll.payment_status ===
            "Paid" ? (

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 font-black text-emerald-700">
                      🟢 PAID
                    </div>

                    {selectedEmployeePayroll.paid_at && (
                      <p className="mt-3 text-sm font-semibold text-emerald-700">
                        Paid on{" "}
                        {new Date(
                          selectedEmployeePayroll.paid_at
                        ).toLocaleString("en-NG", {
                          timeZone: "Africa/Lagos",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    )}

                  </div>

                </div>

              </div>

            ) : (

              <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 font-black text-yellow-700">
                      🟡 READY
                    </div>

                    <p className="mt-3 text-sm font-medium text-yellow-800">
                      Salary is ready to be processed.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      paySalary(
                        selectedEmployeePayroll.id
                      )
                    }
                    disabled={processingPayment}
                    className={`rounded-2xl px-6 py-4 font-black text-white shadow-lg transition ${
                      processingPayment
                        ? "cursor-not-allowed bg-slate-400"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {processingPayment
                      ? "Processing..."
                      : "✓ Mark Salary as Paid"}
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  )}

    </ProtectedRoute>
  );
}