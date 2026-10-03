// Postgres error codes that mean "bad input", not "server broken".
// Anything the Joi validation (validation/schemas.js) misses and the DB rejects
// becomes a clear 400 instead of a 500 with the raw constraint / table name.
const PG_BAD_INPUT = {
  23514: "A value is outside the allowed range.", // CHECK constraint
  23502: "A required field is missing.", // NOT NULL
  "22P02": "A field has an invalid value.", // bad enum / uuid / number text
  22003: "A number is too large.",
  23505: "This record already exists.", // UNIQUE
  23503: "A linked record does not exist.", // FOREIGN KEY
};

export default (err, req, res, next) => {
  console.error("[error]", err.code || "", err.message); // full detail stays in the server log
  const pgMessage = PG_BAD_INPUT[err.code];
  const status = err.status || (pgMessage ? 400 : 500);
  const message =
    pgMessage ||
    (status < 500 || process.env.NODE_ENV !== "production" ? err.message : "Internal server error");
  res.status(status).json({ error: message || "Internal server error" });
};
