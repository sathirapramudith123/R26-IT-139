"use client";

import { useState } from "react";

export function useSupplierStore(initialData = []) {
  const [items, setItems] = useState(initialData);
  const [loading, setLoading] = useState(false);

  return {
    items,
    loading,
    setItems,
    setLoading
  };
}