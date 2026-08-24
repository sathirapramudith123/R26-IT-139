import os
import joblib

FILES = {
        'credit': 'models/component1_sales_financial_model.pkl',
        'procurement': 'models/component2_procurement_model.pkl',
        'demand': 'models/component3_demand_forecast_model.pkl',
        'anomaly': 'models/component4_banking_anomaly_model.pkl',
}


def expected_columns(model):
    """Extracts feature column names safely from Estimators, ColumnTransformers, or Pipelines."""
    # 1. Direct feature_names_in_ check (Most common in modern scikit-learn)
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)

    # 2. If model is a Pipeline, inspect steps
    if hasattr(model, "named_steps"):
        for step in model.named_steps.values():
            cols = expected_columns(step)
            if cols:
                return cols

    # 3. If object is a ColumnTransformer
    transformers = getattr(model, "transformers_", None) or getattr(model, "transformers", None)
    if transformers:
        out = []
        for name, transformer, cols in transformers:
            if name == "remainder" and transformer == "drop":
                continue
            if isinstance(cols, (list, tuple)):
                out.extend(cols)
            elif isinstance(cols, str):
                out.append(cols)
        if out:
            # Deduplicate preserving order
            return list(dict.fromkeys(out))

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