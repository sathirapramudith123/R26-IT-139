import { apiClient } from "./client";
export const predictionApi = {
  predict: (component, features) => apiClient.post(`/predict/${component}`, { features }),
};