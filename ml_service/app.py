import os
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel, Field

app = FastAPI(title="Smart Merchant ML Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FILES = {
    "credit": "models/component1_sales_financial_model.pkl",
    "pricing": "models/component2_price_model.pkl",
    "demand": "models/component3_demand_forecast_model.pkl",
    "anomaly": "models/component4_banking_anomaly_model.pkl",
}

REGRESSION = {"pricing", "demand"}

MODELS = {}
for name, path in FILES.items():
    if os.path.exists(path):
        try:
            MODELS[name] = joblib.load(path)
            print(f"[ML Engine] Successfully loaded '{name}' from {path}")
        except Exception as e:
            print(f"[ML Engine] FAILED to load '{name}': {e}")
    else:
        print(f"[ML Engine] Missing file for '{name}': {path}")


def expected_columns(model):
    """Extract required feature names from a trained model/pipeline safely."""
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


class PredictRequest(BaseModel):
    component: str = Field(..., description="Target model component name")
    features: dict = Field(..., description="Input key-value feature pair")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "loaded_components": list(MODELS.keys()),
        "missing_components": [k for k in FILES if k not in MODELS],
    }


@app.get("/features/{component}")
def features(component: str):
    """Inspect expected columns for a specific component model."""
    if component not in MODELS:
        raise HTTPException(404, f"Model '{component}' not loaded")
    cols = expected_columns(MODELS[component])
    return {"component": component, "expected_features": cols}


@app.post("/predict")
@app.post("/predict/")
def predict(req: PredictRequest):
    comp_key = req.component.lower().strip()
    
    # Map common aliases from frontend
    alias_map = {
        "procurement": "demand",
        "inventory": "demand",
        "sales": "credit",
    }
    comp_key = alias_map.get(comp_key, comp_key)

    if comp_key not in MODELS:
        raise HTTPException(
            404,
            detail=f"Model '{req.component}' not found. Available models: {list(MODELS.keys())}"
        )

    model = MODELS[comp_key]
    features_dict = req.features.copy()

    # Automatic Type Coercion for numbers passed as strings
    for k, v in features_dict.items():
        if isinstance(v, str):
            try:
                features_dict[k] = float(v) if "." in v else int(v)
            except ValueError:
                pass

    # Dynamic Feature Calculation for Demand model
    if comp_key == "demand":
        if (
            "sales_momentum" not in features_dict
            and "lag1_units" in features_dict
            and "lag2_units" in features_dict
        ):
            features_dict["sales_momentum"] = (
                features_dict["lag1_units"] - features_dict["lag2_units"]
            )

    needed = expected_columns(model)
    if needed:
        # Missing features තිබේ නම් Auto-fill කරගැනීම (422 Error එන එක නවත්වයි)
        for col in needed:
            if col not in features_dict or features_dict[col] is None or features_dict[col] == "":
                if col in ["item", "category"]:
                    features_dict[col] = "general"
                else:
                    features_dict[col] = 0

    try:
        X = pd.DataFrame([features_dict])
        if needed:
            X = X[needed]
    except Exception as e:
        raise HTTPException(400, f"Could not construct feature frame: {e}")

    try:
        if comp_key in REGRESSION:
            val = float(model.predict(X)[0])
            return {"component": comp_key, "prediction": round(val, 2)}

        proba = float(model.predict_proba(X)[0, 1])
        return {
            "component": comp_key,
            "prediction": int(proba >= 0.5),
            "score": round(proba * 100, 1),
        }
    except Exception as e:
        raise HTTPException(500, f"Prediction processing failed: {e}")