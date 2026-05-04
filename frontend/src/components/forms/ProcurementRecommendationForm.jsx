"use client";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ProcurementRecommendationForm({ onSubmit }) {
  function handleSubmit(e) {
    e.preventDefault();

    const values = Object.fromEntries(new FormData(e.currentTarget).entries());

    values.quantity = Number(values.quantity);
    values.expected_selling_price = Number(values.expected_selling_price);

    // convert date → ISO format
    values.required_delivery_date = new Date(
      values.required_delivery_date
    ).toISOString();

    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated space-y-4">
      <Input name="item_name" label="Item Name" required />

      <Input
        name="quantity"
        label="Quantity"
        type="number"
        required
      />

      <Input
        name="delivery_location"
        label="Delivery Location"
        required
      />

      <Input
        name="required_delivery_date"
        label="Required Delivery Date"
        type="date"
        required
      />

      <Input
        name="expected_selling_price"
        label="Expected Selling Price (LKR)"
        type="number"
        required
      />

      <Button type="submit">Get Recommendations</Button>
    </form>
  );
}