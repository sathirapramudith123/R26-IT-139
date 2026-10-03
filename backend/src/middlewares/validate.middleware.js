const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateId = (req, res, next) => {
  if (!UUID_RE.test(req.params.id))
    return res.status(400).json({ error: "Invalid ID format" });
  next();
};

// Validates req.body against a Joi schema (src/validation/schemas.js).
// Unknown keys are allowed — the forms send aliases such as name/item_name, and each
// controller's toDb() still picks only the columns it knows.
export const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body ?? {}, {
    abortEarly: false,   // report every problem at once
    convert: true,       // "1500" -> 1500 (mobile / form inputs send strings)
    allowUnknown: true,
  });
  if (error) {
    // one message per field (a field can fail more than one rule)
    const byField = new Map();
    for (const d of error.details) {
      const field = d.path.join(".");
      if (!byField.has(field)) byField.set(field, d.message.replace(/"/g, ""));
    }
    return res.status(400).json({
      error: [...byField.values()].join("; "),
      fields: [...byField.keys()],
    });
  }
  req.body = value;
  next();
};
