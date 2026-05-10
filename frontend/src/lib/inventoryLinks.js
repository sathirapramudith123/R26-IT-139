// Inventory management links for dashboard navigation


export const INVENTORY_LINKS = [
  { title: "Add Item",        description: "Add a new stock item.",           href: "/dashboard/inventory/create", icon: "➕" },
  { title: "All Inventory",   description: "View and search all items.",      href: "/dashboard/inventory",        icon: "📦" },
  { title: "Low Stock Alerts",description: "Items that need restocking.",     href: "/dashboard/inventory/alerts", icon: "⚠️" },
  { title: "Suppliers",       description: "Manage your supplier list.",      href: "/dashboard/suppliers",        icon: "🤝" },
  { title: "Compare Suppliers",description: "Score and rank suppliers.",      href: "/dashboard/suppliers/compare",icon: "📊" },
];
