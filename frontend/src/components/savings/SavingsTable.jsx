import Table from "@/components/ui/Table";

const columns = [
  {
    "key": "id",
    "label": "Id"
  },
  {
    "key": "target",
    "label": "Target"
  },
  {
    "key": "balance",
    "label": "Balance"
  },
  {
    "key": "status",
    "label": "Status"
  }
];

export default function SavingsTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}
