# ML models

Each component folder has **one notebook to read** (data → models → evaluation → research result → saved model),
the model it saves, and its chart. The app uses a copy of each model from `ml_service/models/`.

| Component | Notebook | Model (also in `ml_service/models/`) | Data |
|---|---|---|---|
| C1 Credit readiness | `sales & finance/credit_readiness_pipeline.ipynb` | `credit_readiness_model.pkl` | `sales & financial.csv` |
| C2 Procurement (buy now / wait) | `procument/procurement_buy_wait_pipeline.ipynb` | `procurement_buy_wait_model.pkl` | `from_rice_veg_2023_2026.csv` |
| C3 Weekly demand forecast | `inventory/weekly_demand_forecast_pipeline.ipynb` | `weekly_demand_forecast_model.pkl` | `demand_forecast_weekly.csv` |
| C4 Banking anomaly detection | `agency banking/banking_anomaly_detection_pipeline.ipynb` | `banking_anomaly_model.pkl` | `paysim.csv` |

Each folder also has a **model card** (`README.md`: what the model does, its data, how it was evaluated, the
results, how the app uses it and its limitations) and a Sinhala study guide (`*_study_guide_si.md`).

Run a notebook from its own folder (Jupyter or VS Code → Run All). The notebooks only **read** the CSV files.

`archive/` in each folder keeps the original notebooks, the earlier review/experiment notebooks and the
older models. They are not needed to run anything. Do not run `archive/digital legder.ipynb`: its first
cell regenerates the dataset.
