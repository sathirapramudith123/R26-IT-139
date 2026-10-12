# ML service (FastAPI)

Serves the four trained models to the backend and explains every prediction (SHAP).

## Run

```bash
pip install -r requirements.txt
python -m uvicorn app:app --port 8000
```

`GET /health` lists the loaded models · `GET /features/{component}` lists a model's inputs ·
`POST /predict` with `{"component": "...", "features": {...}}`.

## Models (`models/`)

| Component | File | Trained in |
|---|---|---|
| `credit` | `credit_readiness_model.pkl` | `ML model/sales & finance/credit_readiness_pipeline.ipynb` |
| `procurement` | `procurement_buy_wait_model.pkl` | `ML model/procument/procurement_buy_wait_pipeline.ipynb` |
| `demand` | `weekly_demand_forecast_model.pkl` | `ML model/inventory/weekly_demand_forecast_pipeline.ipynb` |
| `anomaly` | `banking_anomaly_model.pkl` | `ML model/agency banking/banking_anomaly_detection_pipeline.ipynb` |

Each file is a copy of the model saved by its notebook. Model cards: `ML model/<component>/README.md`.

## What `/predict` returns

- **credit** — score 0–100, status (prime ≥ 70, conditional 50–69, otherwise rejected; hard blocks for
  debt-to-income > 85 % or under 3 months), loan limit = 3.5 × monthly net cash flow.
- **procurement** — buy confidence, the price in 4 weeks, recommended action.
- **demand** — units expected next week.
- **anomaly** — probability and flag at `ANOMALY_THRESHOLD` (default 0.87, set by the notebook).

Every response includes `explanation`: the inputs that pushed the prediction up or down.

## Files

- `app.py` — loads the models, fills missing inputs, runs the prediction and the SHAP explanation.
- `check_features.py` — prints the input columns each saved model expects (a quick check after retraining).
