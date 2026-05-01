import Table from "@/components/ui/Table";

const columns = [
  { key: "item_name", label: "Item" },
  { key: "recommended_supplier_name", label: "Supplier" },
  { key: "recommended_quantity", label: "Recommended Qty" },
  { key: "supplier_score", label: "Supplier Score" },
  { key: "status", label: "Status" },
];

export default function ProcurementTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}