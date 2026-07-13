const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateId = (req, res, next) => {
  if (!UUID_RE.test(req.params.id))
    return res.status(400).json({ error: "Invalid ID format" });
  next();
};