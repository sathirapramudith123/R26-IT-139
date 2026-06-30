import { predict } from "../utils/mlClient.js";

const VALID = ["credit", "demand", "procurement", "anomaly"];

export const runPrediction = async (req, res) => {
  try {
    const { component } = req.params;
    if (!VALID.includes(component))
      return res.status(400).json({ error: `component must be one of ${VALID.join(", ")}` });

    const result = await predict(component, req.body.features);
    res.json({ component, ...result });
  } catch (e) {
    // pass the ML service's real status + detail through, instead of a blanket 502
    const status = e.response?.status || 502;
    const detail = e.response?.data?.detail || e.response?.data || e.message;
    res.status(status).json({ error: "ML service error", detail });
  }
};