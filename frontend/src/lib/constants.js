export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export const NAV_GROUPS = {
  overview: "Overview", finance: "Finance", operations: "Operations", account: "Account",
};

export const NAV_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",                icon: "LayoutDashboard", group: "overview"   },
  { label: "Transactions",   href: "/dashboard/transactions",   icon: "CreditCard",      group: "finance"    },
  { label: "Journal",        href: "/dashboard/journal",        icon: "BookOpen",        group: "finance"    },
  { label: "Inventory",      href: "/dashboard/inventory",      icon: "Package",         group: "finance"    },
  { label: "Procurement",    href: "/dashboard/procurement",    icon: "ShoppingCart",    group: "finance"    },
  { label: "Agency Banking", href: "/dashboard/agency-banking", icon: "Landmark",        group: "finance"    },
  { label: "My Banks",       href: "/dashboard/my-banks",       icon: "Building2",       group: "finance"    },
  { label: "Suppliers",      href: "/dashboard/suppliers",      icon: "Handshake",       group: "operations" },
  { label: "Predictions",    href: "/dashboard/predictions",    icon: "Bot",             group: "operations" },
  { label: "Profile",        href: "/dashboard/profile",        icon: "User",            group: "account"    },
];

export const TRANSACTION_TYPES = [
  { label: "Sale", value: "sale" }, { label: "Purchase", value: "purchase" },
  { label: "Expense", value: "expense" }, { label: "Deposit", value: "deposit" },
  { label: "Transfer", value: "transfer" },
];
export const PAYMENT_METHODS = [
  { label: "Cash", value: "cash" }, { label: "Bank", value: "bank" }, { label: "Digital", value: "digital" },
];
export const INVENTORY_UNITS = [
  { label: "Kilogram (kg)", value: "kg" }, { label: "Gram (g)", value: "g" },
  { label: "Liter (l)", value: "l" }, { label: "Milliliter (ml)", value: "ml" },
  { label: "Unit", value: "unit" }, { label: "Box", value: "box" }, { label: "Carton", value: "carton" },
];
export const SUPPLIER_STATUSES = [
  { label: "Active", value: "active" }, { label: "Pending", value: "pending" }, { label: "Inactive", value: "inactive" },
];
// Balance Inquiry removed — no switch to validate it against (rural agent build)
export const AGENCY_TRANSACTION_TYPES = [
  { label: "Cash Deposit", value: "cash_deposit" },
  { label: "Cash Withdrawal", value: "cash_withdrawal" },
  { label: "Fund Transfer", value: "fund_transfer" },
];
export const PROCUREMENT_STATUSES = [
  { label: "Pending", value: "pending" }, { label: "Ordered", value: "ordered" },
  { label: "Received", value: "received" }, { label: "Cancelled", value: "cancelled" },
];
export const CBSL_LIMITS = {
  cash_deposit: 500000, cash_withdrawal: 200000, fund_transfer: 1000000,
};