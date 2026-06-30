from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os

app = FastAPI(title="Smart Merchant ML Service", version="1.0")

# allow the Node backend (and direct testing) to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── model files ───────────────────────────────────────────────────────────────
FILES = {
    "credit":      "models/component1_sales_financial_model.pkl",
    "demand":      "models/component2_demand_forecast_model.pkl",
    "procurement": "models/component3_procurement_model.pkl",
    "anomaly":     "models/component4_banking_anomaly_model.pkl",
}

# demand is regression; the rest are classification
REGRESSION = {"demand"}

# load whatever exists at startup
MODELS = {}
for name, path in FILES.items():
    if os.path.exists(path):
        try:
            MODELS[name] = joblib.load(path)
            print(f"[ML] loaded '{name}' from {path}")
        except Exception as e:
            print(f"[ML] FAILED to load '{name}': {e}")
    else:
        print(f"[ML] missing file for '{name}': {path}")


def expected_columns(model):
    """Best-effort list of the feature columns a model was trained on."""
    # plain estimator
    cols = getattr(model, "feature_names_in_", None)
    if cols is not None:
        return list(cols)
    # Pipeline → look inside for a ColumnTransformer
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


# ── request schema ────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    component: str
    features: dict


# ── routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "loaded": list(MODELS.keys())}


@app.get("/features/{component}")
def features(component: str):
    """Inspect the exact columns a model expects (handy for building forms)."""
    if component not in MODELS:
        raise HTTPException(404, f"Model '{component}' not loaded")
    cols = expected_columns(MODELS[component])
    return {"component": component, "expected_features": cols}


@app.post("/predict")
def predict(req: PredictRequest):
    if req.component not in MODELS:
        raise HTTPException(404, f"Model '{req.component}' not loaded. Available: {list(MODELS.keys())}")

    model = MODELS[req.component]

    # check feature names BEFORE predicting so we return a clear 400, not a 500
    needed = expected_columns(model)
    if needed:
        missing = [c for c in needed if c not in req.features]
        if missing:
            raise HTTPException(
                422,
                {
                    "error": "Missing required features",
                    "missing": missing,
                    "expected": needed,
                    "received": list(req.features.keys()),
                },
            )

    # build a single-row DataFrame in the right column order
    try:
        X = pd.DataFrame([req.features])
        if needed:
            X = X[needed]  # reorder / drop extras to match training
    except Exception as e:
        raise HTTPException(400, f"Could not build input frame: {e}")

    try:
        if req.component in REGRESSION:
            value = float(model.predict(X)[0])
            return {"component": req.component, "prediction": round(value, 2)}

        # classification → prediction + probability score
        proba = float(model.predict_proba(X)[0, 1])
        return {
            "component": req.component,
            "prediction": int(proba >= 0.5),
            "score": round(proba * 100, 1),
        }
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")