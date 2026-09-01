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
      // sale → stock deducts (FIFO) | purchase → stock adds as a batch
      FieldConfig("item_name", "Item (sale deducts / purchase adds stock)",
          type: "select", optionsSource: "/inventory", optionsLabelKey: "name"),
      FieldConfig("quantity", "Units", type: "number"),
      // PURCHASE එකකදි batch cost එකට. (SALE එකකදි හිස්ව තියන්න — COGS FIFO වලින්.)
      FieldConfig("unit_price", "Cost / Selling Price per Unit (LKR)", type: "number"),
      FieldConfig("category", "Category"),
      FieldConfig("description", "Description"),
    ],
  ),
  ModuleConfig(
    title: "Inventory", path: "/inventory", icon: "📦",
    // unit_price -> cost_price (weighted average cost පෙන්නන්න)
    listColumns: ["name", "quantity", "cost_price"],
    fields: [
      FieldConfig("name", "Item Name", required: true),
      // AI Demand Forecasting සඳහා category එකතු කළා (web එකට ගැලපෙන්න)
      FieldConfig("category", "Category", type: "select", required: true, options: [
        "Rice & Grains", "Beverages", "Dairy & Bakery", "Snacks & Sweets",
        "Canned & Packaged Food", "Household & Cleaning", "Personal Care",
        "Spices & Cooking Essentials", "Other",
      ]),
      FieldConfig("supplier_name", "Supplier",
          type: "select", optionsSource: "/suppliers", optionsLabelKey: "name"),
      FieldConfig("quantity", "Quantity", type: "number", required: true),
      FieldConfig("reorder_level", "Reorder Level", type: "number"),
      FieldConfig("unit", "Unit", type: "select",
          options: ["kg", "g", "l", "ml", "unit", "box", "carton"]),
      // selling price අයින් — දැන් cost එක විතරයි
      FieldConfig("cost_price", "Unit Cost (LKR)", type: "number"),
    ],
  ),
  ModuleConfig(
    title: "Suppliers", path: "/suppliers", icon: "🤝",
    // unit_price -> delivery_location (list එකේ පෙන්නන්න)
    listColumns: ["name", "contact_number", "delivery_location"],
    fields: [
      FieldConfig("name", "Supplier Name", required: true),
      FieldConfig("company_name", "Company"),
      FieldConfig("contact_number", "Contact Number", required: true),
      FieldConfig("email", "Email"),
      // unit_price + status අයින් — delivery_location dropdown එකතු කළා
      FieldConfig("delivery_location", "Delivery Location", type: "select", options: [
        "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
        "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
        "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
        "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
        "Monaragala", "Ratnapura", "Kegalle",
      ]),
      FieldConfig("delivery_cost", "Delivery Cost (LKR)", type: "number"),
    ],
  ),
  ModuleConfig(
    title: "Procurement", path: "/procurement", icon: "🛒",
    listColumns: ["item_name", "quantity", "status"],
    fields: [
      FieldConfig("item_name", "Item Name",
          type: "select", optionsSource: "/inventory", optionsLabelKey: "name", required: true),
      FieldConfig("quantity", "Quantity", type: "number", required: true),
      FieldConfig("delivery_location", "Delivery Location", type: "select", options: [
        "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
        "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
        "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
        "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
        "Monaragala", "Ratnapura", "Kegalle",
      ]),
      FieldConfig("expected_selling_price", "Expected Selling Price (LKR)", type: "number"),
      FieldConfig("selected_supplier_name", "Selected Supplier",
          type: "select", optionsSource: "/suppliers", optionsLabelKey: "name"),
      FieldConfig("total_cost", "Total Cost (LKR)", type: "number"),
      FieldConfig("estimated_profit", "Estimated Profit (LKR)", type: "number"),
      // marking this RECEIVED adds the quantity to inventory (නියම cost එකට batch)
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