// Navigation items — agency-banking is filtered per role in Sidebar.jsx
export const NAV_ITEMS = [
  { label: "Dashboard",      href: "/dashboard",                icon: "🏠", group: "overview"    },
  { label: "Inventory",      href: "/dashboard/inventory",      icon: "📦", group: "finance"     },
  { label: "Ledger",         href: "/dashboard/ledger",         icon: "📒", group: "finance"     },
  { label: "Transactions",   href: "/dashboard/transactions",   icon: "💳", group: "finance"     },
  { label: "Procurement",    href: "/dashboard/procurement",    icon: "🛒", group: "finance"     },
  { label: "Agency Banking", href: "/dashboard/agency-banking", icon: "🏦", group: "finance",    roleRequired: "bank_agent" },
  { label: "Suppliers",      href: "/dashboard/suppliers",      icon: "🤝", group: "operations"  },
  { label: "Notifications",  href: "/dashboard/notifications",  icon: "🔔", group: "operations"  },
  { label: "Profile",        href: "/dashboard/profile",        icon: "👤", group: "account"     },
];

// Sidebar group labels
export const NAV_GROUPS = {
  overview:   "Overview",
  finance:    "Finance",
  operations: "Operations",
  account:    "Account",
};

// Roles
export const ROLES = {
  MERCHANT:     "merchant",
  BANK_AGENT:   "bank_agent",
  ADMIN:        "admin",
};

// Transaction types
export const TRANSACTION_TYPES = [
  { label: "Sale",     value: "sale"     },
  { label: "Purchase", value: "purchase" },
  { label: "Expense",  value: "expense"  },
  { label: "Deposit",  value: "deposit"  },
  { label: "Transfer", value: "transfer" },
];

// Payment methods
export const PAYMENT_METHODS = [
  { label: "Cash",    value: "cash"    },
  { label: "Bank",    value: "bank"    },
  { label: "Digital", value: "digital" },
];

// Ledger entry types
export const LEDGER_ENTRY_TYPES = [
  { label: "Income",  value: "income"  },
  { label: "Expense", value: "expense" },
];

// Ledger categories
export const LEDGER_CATEGORIES = [
  { label: "Sales",            value: "sales"            },
  { label: "Agency Banking",   value: "agency_banking"   },
  { label: "Supplier Payment", value: "supplier_payment" },
  { label: "Utilities",        value: "utilities"        },
  { label: "Rent",             value: "rent"             },
  { label: "General",          value: "general"          },
];

// Inventory units
export const INVENTORY_UNITS = [
  { label: "Kilogram (kg)",  value: "kg"     },
  { label: "Gram (g)",       value: "g"      },
  { label: "Liter (l)",      value: "l"      },
  { label: "Milliliter (ml)",value: "ml"     },
  { label: "Unit",           value: "unit"   },
  { label: "Box",            value: "box"    },
  { label: "Carton",         value: "carton" },
];

// Supplier statuses
export const SUPPLIER_STATUSES = [
  { label: "Active",   value: "active"   },
  { label: "Pending",  value: "pending"  },
  { label: "Inactive", value: "inactive" },
];

// Agency banking transaction types
export const AGENCY_TRANSACTION_TYPES = [
  { label: "Cash Deposit",    value: "cash_deposit"    },
  { label: "Cash Withdrawal", value: "cash_withdrawal" },
  { label: "Fund Transfer",   value: "fund_transfer"   },
  { label: "Balance Inquiry", value: "balance_inquiry" },
];

// Procurement statuses
export const PROCUREMENT_STATUSES = [
  { label: "Pending",   value: "pending"   },
  { label: "Approved",  value: "approved"  },
  { label: "Ordered",   value: "ordered"   },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// Notification priorities
export const NOTIFICATION_PRIORITIES = [
  { label: "High",   value: "high"   },
  { label: "Medium", value: "medium" },
  { label: "Low",    value: "low"    },
];

// Offline cache TTL (ms)
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// CBSL agency banking daily limits (LKR)
export const CBSL_LIMITS = {
  cash_deposit:    50000,
  cash_withdrawal: 25000,
  fund_transfer:   100000,
  balance_inquiry: null,   // no monetary limit
};

// API base URL (read once, used in api/client.js)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
