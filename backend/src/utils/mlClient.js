import axios from "axios";

export async function predict(component, features) {
  const { data } = await axios.post(
    `${process.env.ML_URL}/predict`,
    { component, features },
    { timeout: 10000 }
  );
  return data;
}