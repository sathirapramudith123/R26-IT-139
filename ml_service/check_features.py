import joblib
import os

FILES = {
    "credit":      "models/component1_sales_financial_model.pkl",
    "demand":      "models/component2_demand_forecast_model.pkl",
    "procurement": "models/component3_procurement_model.pkl",
    "anomaly":     "models/component4_banking_anomaly_model.pkl",
}


def expected_columns(model):
    cols = getattr(model, "feature_names_in_", None)
    if cols is not None:
        return list(cols)
    steps = getattr(model, "named_steps", {})
    for step in steps.values():
        transformers = getattr(step, "transformers_", None) or getattr(step, "transformers", None)
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


for name, path in FILES.items():
    print(f"\n=== {name} ===")
    if not os.path.exists(path):
        print(f"  (missing file: {path})")
        continue
    model = joblib.load(path)
    cols = expected_columns(model)
    if cols:
        for c in cols:
            print(f"  - {c}")
    else:
        print("  (could not determine columns automatically)")