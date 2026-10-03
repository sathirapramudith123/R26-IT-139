import { t } from "@/lib/i18n";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const NAV_GROUPS = {
  overview: "Overview",
  finance: "Finance",
  operations: "Operations",
  account: "Account",
};

export const NAV_ITEMS = [
  {
    get label() {
      return t("Dashboard");
    },
    href: "/dashboard",
    icon: "LayoutDashboard",
    group: "overview",
  },
  {
    get label() {
      return t("Transactions");
    },
    href: "/dashboard/transactions",
    icon: "CreditCard",
    group: "finance",
  },
  {
    get label() {
      return t("Journal");
    },
    href: "/dashboard/journal",
    icon: "BookOpen",
    group: "finance",
  },
  {
    get label() {
      return t("Inventory");
    },
    href: "/dashboard/inventory",
    icon: "Package",
    group: "finance",
  },
  {
    get label() {
      return t("Procurement");
    },
    href: "/dashboard/procurement",
    icon: "ShoppingCart",
    group: "finance",
  },
  {
    get label() {
      return t("Agency Banking");
    },
    href: "/dashboard/agency-banking",
    icon: "Landmark",
    group: "finance",
  },
  {
    get label() {
      return t("My Banks");
    },
    href: "/dashboard/my-banks",
    icon: "Building2",
    group: "finance",
  },
  {
    get label() {
      return t("Suppliers");
    },
    href: "/dashboard/suppliers",
    icon: "Handshake",
    group: "operations",
  },
  {
    get label() {
      return t("Predictions");
    },
    href: "/dashboard/predictions",
    icon: "Bot",
    group: "operations",
  },
  {
    get label() {
      return t("Profile");
    },
    href: "/dashboard/profile",
    icon: "User",
    group: "account",
  },
];

export const TRANSACTION_TYPES = [
  {
    get label() {
      return t("Sale");
    },
    value: "sale",
  },
  {
    get label() {
      return t("Purchase");
    },
    value: "purchase",
  },
  {
    get label() {
      return t("Expense");
    },
    value: "expense",
  },
  {
    get label() {
      return t("Deposit");
    },
    value: "deposit",
  },
  {
    get label() {
      return t("Transfer");
    },
    value: "transfer",
  },
];
export const PAYMENT_METHODS = [
  {
    get label() {
      return t("Cash");
    },
    value: "cash",
  },
  {
    get label() {
      return t("Bank");
    },
    value: "bank",
  },
  {
    get label() {
      return t("Digital");
    },
    value: "digital",
  },
];
export const INVENTORY_UNITS = [
  {
    get label() {
      return t("Kilogram (kg)");
    },
    value: "kg",
  },
  {
    get label() {
      return t("Gram (g)");
    },
    value: "g",
  },
  {
    get label() {
      return t("Liter (l)");
    },
    value: "l",
  },
  {
    get label() {
      return t("Milliliter (ml)");
    },
    value: "ml",
  },
  {
    get label() {
      return t("Unit");
    },
    value: "unit",
  },
  {
    get label() {
      return t("Box");
    },
    value: "box",
  },
  {
    get label() {
      return t("Carton");
    },
    value: "carton",
  },
];
export const SUPPLIER_STATUSES = [
  {
    get label() {
      return t("Active");
    },
    value: "active",
  },
  {
    get label() {
      return t("Pending");
    },
    value: "pending",
  },
  {
    get label() {
      return t("Inactive");
    },
    value: "inactive",
  },
];
// Balance Inquiry removed — no switch to validate it against (rural agent build)
export const AGENCY_TRANSACTION_TYPES = [
  {
    get label() {
      return t("Cash Deposit");
    },
    value: "cash_deposit",
  },
  {
    get label() {
      return t("Cash Withdrawal");
    },
    value: "cash_withdrawal",
  },
  {
    get label() {
      return t("Fund Transfer");
    },
    value: "fund_transfer",
  },
];
export const PROCUREMENT_STATUSES = [
  {
    get label() {
      return t("Pending");
    },
    value: "pending",
  },
  {
    get label() {
      return t("Ordered");
    },
    value: "ordered",
  },
  {
    get label() {
      return t("Received");
    },
    value: "received",
  },
  {
    get label() {
      return t("Cancelled");
    },
    value: "cancelled",
  },
];
export const CBSL_LIMITS = {
  cash_deposit: 500000,
  cash_withdrawal: 200000,
  fund_transfer: 1000000,
};
