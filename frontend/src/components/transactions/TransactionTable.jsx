import Table from "@/components/ui/Table";

const columns = [
  {
    "key": "id",
    "label": "Id"
  },
  {
    "key": "type",
    "label": "Type"
  },
  {
    "key": "amount",
    "label": "Amount"
  },
  {
    "key": "status",
    "label": "Status"
  }
];

export default function TransactionTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}
