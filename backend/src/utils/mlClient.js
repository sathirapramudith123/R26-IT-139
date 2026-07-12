import axios from "axios";

const ML_URL = process.env.ML_URL || "http://localhost:8000";

export async function predict(component, features) {
  const { data } = await axios.post(`${ML_URL}/predict`, { component, features });
  return data;
}