import os
import joblib

FILES = {
    "credit": "models/component1_credit_model.pkl",
    "pricing": "models/component2_price_model.pkl",
    "demand": "models/component3_demand_forecast_model.pkl",
    "anomaly": "models/component4_banking_anomaly_model.pkl",
}


def expected_columns(model):
  """Extracts feature column names from plain estimators or Pipelines safely."""
  cols = getattr(model, "feature_names_in_", None)
  if cols is not None:
    return list(cols)

  steps = getattr(model, "named_steps", {})
  for step in steps.values():
    transformers = getattr(step, "transformers_", None) or getattr(
        step, "transformers", None
    )
    if transformers:
      out = []
      for _, _, c in transformers:
        if isinstance(c, (list, tuple)):
          out.extend(c)
      if out:
        return out
    sub = getattr(step, "feature_names_in_", None)
    if sub is not None:
      return list(sub)
  return None


print("==========================================================")
print("=== INSPECTING MODEL FEATURE COLUMNS FROM SAVED PIPELINES ===")
print("==========================================================")

for name, path in FILES.items():
  print(f"\n=== Model Component: [{name.upper()}] ===")
  if not os.path.exists(path):
    print(f" ⚠️ Missing file at path: '{path}'")
    continue

  try:
    model = joblib.load(path)
    cols = expected_columns(model)

    if cols:
      print(f" ✅ Detected {len(cols)} expected feature columns:")
      for c in cols:
        print(f"    • {c}")
    else:
      print(" ⚠️ Model loaded, but could not determine columns automatically.")
  except Exception as e:
    print(f" ❌ Error loading model: {e}")