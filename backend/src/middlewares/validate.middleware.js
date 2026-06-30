// existing body validator
export default (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details.map((d) => d.message) });
  req.body = value;
  next();
};

// NEW: validate the :id URL param is a valid UUID
export const validateId = (req, res, next) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(req.params.id))
    return res.status(400).json({ error: "Invalid id format" });
  next();
};