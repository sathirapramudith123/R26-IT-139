import '../models/field_config.dart';
import '../models/module_config.dart';

const modules = <ModuleConfig>[
  ModuleConfig(
    title: "Transactions", path: "/transactions", icon: "💳",
    listColumns: ["transaction_type", "amount", "payment_method"],
    fields: [
      FieldConfig("transaction_type", "Type", type: "select", required: true,
          options: ["sale", "purchase", "expense", "deposit", "transfer"]),
      FieldConfig("payment_method", "Payment Method", type: "select", required: true,
          options: ["cash", "bank", "digital"]),
      FieldConfig("amount", "Amount (LKR)", type: "number", required: true),
      FieldConfig("category", "Category"),
      FieldConfig("description", "Description"),
    ],
  ),
  ModuleConfig(
    title: "Inventory", path: "/inventory", icon: "📦",
    listColumns: ["name", "quantity", "unit_price"],
    fields: [
      FieldConfig("name", "Item Name", required: true),
      // supplier dropdown — loads names from /suppliers
      FieldConfig("supplier_name", "Supplier",
          type: "select",
          optionsSource: "/suppliers",
          optionsLabelKey: "name"),
      FieldConfig("quantity", "Quantity", type: "number", required: true),
      FieldConfig("reorder_level", "Reorder Level", type: "number"),
      FieldConfig("unit", "Unit", type: "select",
          options: ["kg", "g", "l", "ml", "unit", "box", "carton"]),
      FieldConfig("unit_price", "Unit Price (LKR)", type: "number"),
    ],
  ),
  ModuleConfig(
    title: "Suppliers", path: "/suppliers", icon: "🤝",
    listColumns: ["name", "contact_number", "unit_price"],
    fields: [
      FieldConfig("name", "Supplier Name", required: true),
      FieldConfig("company_name", "Company"),
      FieldConfig("contact_number", "Contact Number", required: true),
      FieldConfig("email", "Email"),
      FieldConfig("unit_price", "Unit Price (LKR)", type: "number"),
      FieldConfig("delivery_cost", "Delivery Cost (LKR)", type: "number"),
      FieldConfig("status", "Status", type: "select",
          options: ["active", "pending", "inactive"]),
    ],
  ),
  ModuleConfig(
    title: "Procurement", path: "/procurement", icon: "🛒",
    listColumns: ["item_name", "quantity", "status"],
    fields: [
      FieldConfig("item_name", "Item Name", required: true),
      FieldConfig("quantity", "Quantity", type: "number", required: true),
      FieldConfig("delivery_location", "Delivery Location"),
      FieldConfig("expected_selling_price", "Expected Selling Price (LKR)", type: "number"),
      // supplier dropdown — loads names from /suppliers
      FieldConfig("selected_supplier_name", "Selected Supplier",
          type: "select",
          optionsSource: "/suppliers",
          optionsLabelKey: "name"),
      FieldConfig("total_cost", "Total Cost (LKR)", type: "number"),
      FieldConfig("estimated_profit", "Estimated Profit (LKR)", type: "number"),
      FieldConfig("status", "Status", type: "select",
          options: ["pending", "ordered", "received", "cancelled"]),
    ],
  ),
  ModuleConfig(
    title: "Agency Banking", path: "/agency-banking", icon: "🏦",
    listColumns: ["customer_name", "transaction_type", "amount"],
    fields: [
      FieldConfig("customer_name", "Customer Name", required: true),
      FieldConfig("customer_phone", "Customer Phone", required: true),
      FieldConfig("transaction_type", "Type", type: "select", required: true,
          options: ["cash_deposit", "cash_withdrawal", "fund_transfer", "balance_inquiry"]),
      FieldConfig("amount", "Amount (LKR)", type: "number", required: true),
      FieldConfig("service_fee", "Service Fee (LKR)", type: "number"),
      FieldConfig("commission", "Commission (LKR)", type: "number"),
    ],
  ),
];