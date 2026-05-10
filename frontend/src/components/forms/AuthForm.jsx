"use client";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AuthForm({ onSubmit, submitLabel = "Submit", mode = "login" }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    onSubmit?.(values);
  }

  return (
    <form onSubmit={handleSubmit} className="card-elevated space-y-4">
      {mode === "register" && (
        <Input label="Full Name" name="full_name" type="text" placeholder="Your full name" required />
      )}
      <Input label="Email Address" name="email" type="email" placeholder="you@example.com" required />
      <Input label="Password" name="password" type="password" placeholder={mode === "register" ? "Create a password" : "Your password"} required />
      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );
}
