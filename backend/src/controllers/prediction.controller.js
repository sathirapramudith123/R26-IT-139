import { predict } from "../utils/mlClient.js";

const VALID = ["credit", "pricing", "demand", "anomaly"];

export const run = async (req, res) => {
  try {
    const { component } = req.params;

    if (!VALID.includes(component)) {
      return res.status(400).json({
        error: `Invalid component. Must be one of: ${VALID.join(", ")}`,
      });
    }

    const features = req.body.features || req.body;

    const result = await predict(component, features);
    return res.json({ component, ...result });
  } catch (e) {
    const status = e.status || e.response?.status || 502;
    const detail = e.message || e.response?.data?.detail || e.response?.data;

    return res.status(status).json({
      error: "ML service error",
      detail,
    });
  }
};