export default (err, req, res, next) => {
  console.error("[error]", err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
};