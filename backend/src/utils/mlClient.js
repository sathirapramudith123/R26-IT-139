import axios from "axios";

const ML_URL = process.env.ML_URL || "http://localhost:8000";

// Axios instance for the ML service, with a request timeout
const mlClient = axios.create({
  baseURL: ML_URL,
  // abort if the ML service does not answer in time (5 s locally; a free hosted ML service can take
  // ~1 minute to wake up, so hosting sets ML_TIMEOUT_MS higher)
  timeout: Number(process.env.ML_TIMEOUT_MS) || 5000,
});

export async function predict(component, features) {
  try {
    const { data } = await mlClient.post("/predict", { component, features });
    return data;
  } catch (error) {
    if (error.response) {
      throw {
        status: error.response.status,
        message: error.response.data?.detail || "ML Service Prediction Error",
      };
    }
    throw {
      status: 503,
      message: "ML Microservice is unreachable or offline",
    };
  }
}
