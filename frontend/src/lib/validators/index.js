export function isRequired(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

export function isValidEmail(str = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export function isValidPhone(str = "") {
  return /^\d{7,15}$/.test(str.replace(/\s/g, ""));
}

export function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

export function isPositiveNumber(value) {
  return isNumeric(value) && Number(value) > 0;
}

export function isNonNegativeNumber(value) {
  return isNumeric(value) && Number(value) >= 0;
}

export function isValidScore(value) {
  return isNumeric(value) && Number(value) >= 0 && Number(value) <= 100;
}

export function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function isFutureDate(value) {
  if (!isValidDate(value)) return false;
  return new Date(value) > new Date();
}

export function validateInventory(values) {
  const errors = {};
  if (!isRequired(values.name))        errors.name        = "Item name is required.";
  if (!isRequired(values.supplier_id)) errors.supplier_id = "Please select a supplier.";
  if (!isNonNegativeNumber(values.quantity))      errors.quantity      = "Enter a valid quantity (0 or more).";
  if (!isNonNegativeNumber(values.reorder_level)) errors.reorder_level = "Enter a valid reorder level (0 or more).";
  if (!isPositiveNumber(values.unit_price))        errors.unit_price    = "Enter a price greater than 0.";
  return errors;
}

export function validateTransaction(values) {
  const errors = {};
  if (!isRequired(values.transaction_type)) errors.transaction_type = "Select a transaction type.";
  if (!isPositiveNumber(values.amount))     errors.amount           = "Enter an amount greater than 0.";
  if (!isRequired(values.description))      errors.description      = "Description is required.";
  return errors;
}

export function validateLedger(values) {
  const errors = {};
  if (!isRequired(values.title))        errors.title      = "Title is required.";
  if (!isPositiveNumber(values.amount)) errors.amount     = "Enter an amount greater than 0.";
  if (!isRequired(values.entry_type))   errors.entry_type = "Select an entry type.";
  return errors;
}

export function validateAgencyBanking(values) {
  const errors = {};
  if (!isRequired(values.customer_name))        errors.customer_name     = "Customer name is required.";
  if (!isRequired(values.customer_phone))       errors.customer_phone    = "Customer phone is required.";
  else if (!isValidPhone(values.customer_phone))errors.customer_phone    = "Enter a valid phone number (7–15 digits).";
  if (!isRequired(values.transaction_type))     errors.transaction_type  = "Select a transaction type.";
  if (!isPositiveNumber(values.amount))         errors.amount            = "Enter an amount greater than 0.";
  return errors;
}

export function validateProcurement(values) {
  const errors = {};
  if (!isRequired(values.item_name))               errors.item_name              = "Item name is required.";
  if (!isPositiveNumber(values.quantity))           errors.quantity               = "Enter a quantity greater than 0.";
  if (!isRequired(values.delivery_location))        errors.delivery_location      = "Delivery location is required.";
  if (!isValidDate(values.required_delivery_date))  errors.required_delivery_date = "Select a valid delivery date.";
  if (!isPositiveNumber(values.expected_selling_price)) errors.expected_selling_price = "Enter a selling price greater than 0.";
  return errors;
}

export function validateSupplier(values) {
  const errors = {};
  if (!isRequired(values.name))          errors.name          = "Supplier name is required.";
  if (!isRequired(values.company_name))  errors.company_name  = "Company name is required.";
  if (!isRequired(values.contact_number))errors.contact_number= "Contact number is required.";
  if (!isRequired(values.email))         errors.email         = "Email is required.";
  else if (!isValidEmail(values.email))  errors.email         = "Enter a valid email address.";
  if (!isNonNegativeNumber(values.unit_price)) errors.unit_price = "Enter a valid unit price.";
  ["price_score","reliability_score","delivery_score"].forEach(k => {
    if (values[k] !== "" && !isValidScore(values[k]))
      errors[k] = "Score must be between 0 and 100.";
  });
  return errors;
}


