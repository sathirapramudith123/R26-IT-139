import Table from "@/components/ui/Table";

const columns = [
  { key: "id", label: "Id" },
  { key: "name", label: "Name" },
  { key: "supplier_name", label: "Supplier" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "status", label: "Status" }
];

export default function InventoryTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}