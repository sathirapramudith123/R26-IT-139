import { predict } from "../utils/mlClient.js";

const VALID = ["credit", "demand", "procurement", "anomaly"];

export const runPrediction = async (req, res, next) => {
  try {
    const { component } = req.params;
    if (!VALID.includes(component))
      return res.status(400).json({ error: `component must be one of ${VALID.join(", ")}` });
    const result = await predict(component, req.body.features);
    res.json({ component, ...result });
  } catch (e) {
    res.status(502).json({ error: "ML service error: " + (e.response?.data?.detail || e.message) });
  }
};