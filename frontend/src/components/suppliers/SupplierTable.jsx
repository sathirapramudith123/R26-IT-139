import Table from "@/components/ui/Table";

const columns = [
  { key: "id", label: "Id" },
  { key: "name", label: "Name" },
  { key: "company_name", label: "Company" },
  { key: "contact_number", label: "Contact" },
  { key: "status", label: "Status" }
];

export default function SupplierTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}