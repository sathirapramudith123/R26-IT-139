import os
import joblib

FILES = {
    'credit': 'models/component1_sales_financial_model.pkl',
    'procurement': 'models/component2_procurement_model.pkl',
    'demand': 'models/component3_demand_forecast_model.pkl',
    'anomaly': 'models/component4_banking_anomaly_model.pkl',
}


def extract_expected_columns(model_or_bundle):
    """Recursively extracts feature column names safely from Estimators, Pipelines, or Bundle Dicts."""
    # 1. Handle Dictionary Bundles (Joblib saved dicts)
    if isinstance(model_or_bundle, dict):
        if 'raw_feature_names' in model_or_bundle:
            return model_or_bundle['raw_feature_names']
        if 'feature_names' in model_or_bundle:
            return model_or_bundle['feature_names']
        
        # Check contained estimators inside dict
        target_estimator = (
            model_or_bundle.get('classifier_pipeline')
            or model_or_bundle.get('classifier_model')
            or model_or_bundle.get('regressor_pipeline')
            or model_or_bundle.get('regressor_model')
        )
        if target_estimator:
            return extract_expected_columns(target_estimator)

    model = model_or_bundle

    # 2. Direct feature_names_in_ check
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)

    # 3. Inspect steps if model is a Pipeline
    if hasattr(model, "named_steps"):
        for step in model.named_steps.values():
            cols = extract_expected_columns(step)
            if cols:
                return cols

    # 4. Inspect ColumnTransformer
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
        model_or_bundle = joblib.load(path)
        cols = extract_expected_columns(model_or_bundle)

        if cols:
            print(f" ✅ Detected {len(cols)} expected feature columns:")
            for c in cols:
                print(f"    • {c}")
        else:
            print(" ⚠️ Model loaded, but could not determine columns automatically.")
    except Exception as e:
        print(f" ❌ Error loading model: {e}")