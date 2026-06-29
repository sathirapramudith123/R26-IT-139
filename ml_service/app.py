from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib, pandas as pd, os

app = FastAPI(title="Smart Merchant ML Service")

FILES = {
    "credit":      "models/component1_sales_financial_model.pkl",
    "demand":      "models/component2_demand_forecast_model.pkl",
    "procurement": "models/component3_procurement_model.pkl",
    "anomaly":     "models/component4_banking_anomaly_model.pkl",
}
MODELS = {k: joblib.load(v) for k, v in FILES.items() if os.path.exists(v)}

class Req(BaseModel):
    component: str
    features: dict

@app.get("/health")
def health():
    return {"status": "ok", "loaded": list(MODELS.keys())}

@app.post("/predict")
def predict(req: Req):
    if req.component not in MODELS:
        raise HTTPException(404, f"Model '{req.component}' not loaded")
    model = MODELS[req.component]
    X = pd.DataFrame([req.features])
    if req.component == "demand":                       # regression
        return {"prediction": float(model.predict(X)[0])}
    proba = float(model.predict_proba(X)[0, 1])         # classification
    return {"prediction": int(proba >= 0.5), "score": round(proba * 100, 1)}