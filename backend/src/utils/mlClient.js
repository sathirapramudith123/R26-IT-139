import axios from "axios";

const ML_URL = process.env.ML_URL || "http://localhost:8000";

// Axios instance for the ML service, with a request timeout
const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 5000, // abort if the ML service does not answer within 5 seconds
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
