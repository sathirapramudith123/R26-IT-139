import warnings
warnings.filterwarnings("ignore")    

import os
os.environ["PYTHONWARNINGS"] = "ignore"  
import joblib
import traceback
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import __main__

# SHAP turns each prediction into "which inputs pushed it up or down".
# Optional at runtime: without it, predictions still work and explanation is [].
try:
    import shap
except ImportError:  # pragma: no cover
    shap = None
    print("[ML Engine] 'shap' not installed - predictions will have no explanation")

def add_domain_features(X_df):
    """Same feature engineering as training (ML model/sales & finance/digital legder.ipynb).
    The pickled credit pipeline calls this as its first step ('feat_eng')."""
    X_out = X_df.copy()
    rev = np.maximum(X_out['monthly_revenue_rs'], 1.0) if 'monthly_revenue_rs' in X_out.columns else 1.0
    exp = X_out['monthly_expenses_rs'] if 'monthly_expenses_rs' in X_out.columns else 0.0
    active_m = np.maximum(X_out['months_active'], 1.0) if 'months_active' in X_out.columns else 1.0
    dig_ratio = X_out['digital_payment_ratio'] if 'digital_payment_ratio' in X_out.columns else 0.0

    X_out['net_cash_flow'] = rev - exp
    X_out['debt_to_income_ratio'] = exp / rev
    X_out['digital_revenue_volume'] = rev * dig_ratio
    X_out['revenue_per_active_month'] = rev / active_m
    X_out['cash_flow_margin'] = X_out['net_cash_flow'] / rev
    return X_out

setattr(__main__, 'add_domain_features', add_domain_features)



app = FastAPI(
    title='Smart Merchant ML & Decision Engine API',
    version='2.0',
    description='Hybrid ML & Rule Engine Microservice for Credit & Procurement',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

FILES = {
    'credit': 'models/credit_readiness_model.pkl',
    'procurement': 'models/procurement_buy_wait_model.pkl',
    'demand': 'models/weekly_demand_forecast_model.pkl',
    'anomaly': 'models/banking_anomaly_model.pkl',
}

BUNDLES = {}


for name, path in FILES.items():
    if os.path.exists(path):
        try:
            BUNDLES[name] = joblib.load(path)
            print(f"[ML Engine] Successfully loaded '{name}' from {path}")
        except Exception as e:
            print(f"[ML Engine] FAILED to load '{name}': {e}")
    else:
        print(f"[ML Engine] Missing file for '{name}': {path}")


# Decision threshold for the banking anomaly model. 0.87 = highest F1 on out-of-fold
# training predictions (ML model/agency banking/banking_anomaly_detection_pipeline.ipynb, Part B):
# test precision 0.53 / recall 0.40, ~19 false alarms per 1000 normal transactions
# (the default 0.5 gave precision 0.23 and ~136 false alarms per 1000).
ANOMALY_THRESHOLD = float(os.getenv('ANOMALY_THRESHOLD', '0.87'))

_EXPLAINERS = {}  # one TreeExplainer per model object, built on first use


def explain(pipeline, X_raw, top=5, flip=False):
    """Top SHAP contributions for one row, mapped back to the input feature names.

    Returns [{'feature': name, 'impact': value}] sorted by |impact| - the shape the web
    (InfluenceChart) and mobile (InfluenceBars) apps render as "What's affecting this".
    Positive impact = pushes the prediction up (for classifiers: towards class 1).
    flip=True reverses the sign (used for anomaly, so "helping" = looks normal).
    One-hot columns (e.g. 'cat__txn_type_cash_out') are summed back into their input ('txn_type').
    Never raises: an explanation problem must not break the prediction.
    """
    if not hasattr(pipeline, 'steps'):
        return []
    try:
        pre, model = pipeline[:-1], pipeline.steps[-1][1]
        Xt = pre.transform(X_raw)
        Xt = Xt.toarray() if hasattr(Xt, 'toarray') else np.asarray(Xt)
        names = list(pre[-1].get_feature_names_out())

        if hasattr(model, 'coef_'):
            # Linear model on standardised inputs (training mean = 0): coef x value is the exact
            # SHAP value relative to the average shop, in log-odds - no shap library needed.
            sv = (np.asarray(model.coef_).reshape(1, -1) * Xt.astype(float))[:1]
        else:
            if shap is None:
                return []
            explainer = _EXPLAINERS.get(id(model))
            if explainer is None:
                explainer = _EXPLAINERS[id(model)] = shap.TreeExplainer(model)
            sv = explainer.shap_values(Xt.astype(float))
            sv = np.asarray(sv[1] if isinstance(sv, list) else sv)
            if sv.ndim == 3:      # (rows, features, classes)
                sv = sv[..., 1]

        raw_cols = sorted((str(c) for c in X_raw.columns), key=len, reverse=True)
        agg = {}
        for name, value in zip(names, sv[0]):
            base = name.split('__', 1)[-1]
            raw = next((c for c in raw_cols if base == c or base.startswith(c + '_')), base)
            agg[raw] = agg.get(raw, 0.0) + float(-value if flip else value)

        items = sorted(agg.items(), key=lambda kv: -abs(kv[1]))[:top]
        return [{'feature': k, 'impact': round(v, 4)} for k, v in items]
    except Exception:
        traceback.print_exc()
        return []


class PredictRequest(BaseModel):
    component: str = Field(
        ...,
        description="Component name: 'credit', 'procurement', 'demand', 'anomaly'",
    )
    features: dict = Field(
        ..., description='Key-value pairs of input feature values'
    )


def extract_expected_columns(model_or_bundle):
    """Extract expected column names from Estimator, Pipeline or Bundle Dict."""
    model = None
    if isinstance(model_or_bundle, dict):
        if 'raw_feature_names' in model_or_bundle:
            return model_or_bundle['raw_feature_names']
        if 'feature_names' in model_or_bundle:
            return model_or_bundle['feature_names']
        
        for v in model_or_bundle.values():
            if hasattr(v, 'predict') or hasattr(v, 'predict_proba'):
                model = v
                break
    else:
        model = model_or_bundle

    if model is None:
        return None

    cols = getattr(model, 'feature_names_in_', None)
    if cols is not None:
        return list(cols)

    steps = getattr(model, 'named_steps', {})
    for step in steps.values():
        transformers = getattr(step, 'transformers_', None) or getattr(
            step, 'transformers', None
        )
        if transformers:
            out = []
            for _, _, c in transformers:
                if isinstance(c, (list, tuple)):
                    out.extend(c)
                elif isinstance(c, str):
                    out.append(c)
            if out:
                return list(dict.fromkeys(out))
    return None


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'loaded_components': list(BUNDLES.keys()),
        'missing_components': [k for k in FILES if k not in BUNDLES],
        'explanations': shap is not None,
    }


@app.get('/features/{component}')
def features(component: str):
    comp_key = component.lower().strip()
    if comp_key not in BUNDLES:
        raise HTTPException(404, f"Model/Bundle '{component}' not loaded")
    cols = extract_expected_columns(BUNDLES[comp_key])
    return {'component': comp_key, 'expected_features': cols}


@app.post('/predict')
@app.post('/predict/')
def predict(req: PredictRequest):
    comp_key = req.component.lower().strip()

    
    alias_map = {'sales': 'credit', 'pricing': 'procurement', 'inventory': 'demand'}
    comp_key = alias_map.get(comp_key, comp_key)

    if comp_key not in BUNDLES:
        raise HTTPException(
            404,
            f"Component '{req.component}' not found. Available: {list(BUNDLES.keys())}",
        )

    bundle_or_model = BUNDLES[comp_key]
    features_dict = req.features.copy()

    try:
        
        for k, v in features_dict.items():
            if isinstance(v, str):
                try:
                    features_dict[k] = float(v) if '.' in v else int(v)
                except ValueError:
                    pass

    
        curr = float(features_dict.get('current_price_rs', 0) or 0)
        hist = float(features_dict.get('historical_avg_price_rs', 0) or 0)
        features_dict['price_variance_pct'] = ((curr - hist) / (hist + 1e-5)) * 100

        # Credit engineered features (net_cash_flow, debt_to_income_ratio, ...) are
        # computed inside the credit pipeline by add_domain_features — the model only
        # needs the raw columns. Copy the list so the loaded bundle is never mutated.
        needed = list(extract_expected_columns(bundle_or_model) or [])

    
        for col in needed:
            if (
                col not in features_dict
                or features_dict[col] is None
                or features_dict[col] == ''
            ):
                # numeric -> NaN: each pipeline's SimpleImputer fills the training median
                # (0 would mean e.g. "no credit sales" or "price did not change")
                features_dict[col] = 'general' if col in ['item', 'category'] else np.nan

    
        X = pd.DataFrame([features_dict])
        if needed:
            X = X[needed]

        # 4. EXECUTION BY COMPONENT TYPE

    
        if comp_key == 'credit':
            cls_model = bundle_or_model.get('classifier_pipeline') or bundle_or_model.get('classifier_model')

            prob_score = round(float(cls_model.predict_proba(X)[0, 1]) * 100, 1)

            eng = add_domain_features(X).iloc[0]   # same values the model saw

            # Loan limit: the training target was exactly max(0, 3.5 x monthly net cash flow),
            # so the rule itself is used - exact and explainable (digital_ledger_review.ipynb).
            net_cash_flow = float(eng['net_cash_flow']) if pd.notna(eng['net_cash_flow']) else 0.0
            pred_limit = max(0.0, 3.5 * net_cash_flow) if prob_score >= 50 else 0.0

            hard_blocks = []
            if float(eng['debt_to_income_ratio']) > 0.85:
                hard_blocks.append('CRITICAL: Debt-to-Income Ratio exceeds 85%.')
            if features_dict.get('months_active', 100) < 3:
                hard_blocks.append(
                    'HIGH RISK: Business active history is less than 3 months.'
                )

            # Advisory only: as a hard block (digital legder.ipynb) it would reject ~66% of shops
            notices = []
            stockout = eng.get('stockout_rate')
            if pd.notna(stockout) and float(stockout) > 0.25:
                notices.append('NOTICE: Stockout rate is above 25% - keeping items in stock improves the score.')

            if hard_blocks:
                status, max_loan = 'REJECTED_BY_RULE_ENGINE', 0.0
            elif prob_score >= 70:
                status, max_loan = 'APPROVED_PRIME', round(pred_limit, -3)
            elif prob_score >= 50:
                status, max_loan = 'APPROVED_CONDITIONAL', min(
                    round(pred_limit, -3), 250000.0
                )
            else:
                status, max_loan = 'REJECTED_LOW_SCORE', 0.0

            return {
                'component': 'credit',
                'credit_score': prob_score,
                'status': status,
                'max_loan_limit_lkr': max_loan,
                'loan_limit_basis': f'3.5 x monthly net cash flow (LKR {net_cash_flow:,.0f})',
                'rule_alerts': (hard_blocks + notices) if (hard_blocks or notices) else ['None'],
                'explanation': explain(cls_model, X),
            }

    
        elif comp_key == 'procurement':
            cls_model = bundle_or_model.get('classifier_pipeline') or bundle_or_model.get('classifier_model')
            reg_model = bundle_or_model.get('regressor_pipeline') or bundle_or_model.get('regressor_model')

            buy_score = round(float(cls_model.predict_proba(X)[0, 1]) * 100, 1)
            predicted_4w_price = float(reg_model.predict(X)[0])

            rule_alerts = []
            if (
                features_dict.get('shelf_life_days', 30) <= 3
                and features_dict.get('current_stock_kg', 0) > 50
            ):
                rule_alerts.append('HIGH PERISHABILITY: Stock risk detected.')
            if features_dict.get('current_stock_kg', 0) >= 400:
                rule_alerts.append('OVERSTOCK: Stock level exceeds capacity.')

            if any('OVERSTOCK' in a for a in rule_alerts):
                action = 'HOLD'
            elif buy_score >= 75:
                action = 'BULK_BUY_NOW'
            elif buy_score >= 50:
                action = 'MODERATE_BUY'
            else:
                action = 'WAIT_DO_NOT_BUY'

            return {
                'component': 'procurement',
                'buy_confidence_score': buy_score,
                'current_price_lkr': curr,
                'predicted_4w_price_lkr': round(predicted_4w_price, 2),
                'recommended_action': action,
                'rule_alerts': rule_alerts if rule_alerts else ['None'],
                'explanation': explain(cls_model, X),
            }

        # Hybrid anomaly: Isolation Forest flag (training Step 4) feeds the champion model
        elif comp_key == 'anomaly' and isinstance(bundle_or_model, dict) and 'iso_forest' in bundle_or_model:
            champion = bundle_or_model['champion_model']
            iso_cols = list(bundle_or_model['iso_num_cols'])

            for c in iso_cols:
                if features_dict.get(c) in (None, ''):
                    features_dict[c] = 0.0
            iso_X = pd.DataFrame([features_dict])[iso_cols]
            iso_imp = bundle_or_model['iso_imputer'].transform(iso_X)
            iso_flag = int(bundle_or_model['iso_forest'].predict(iso_imp)[0] == -1)
            features_dict['unsupervised_anomaly_score'] = iso_flag

            cols = list(getattr(champion, 'feature_names_in_', [])) or needed
            X = pd.DataFrame([features_dict])[cols]
            prob = float(champion.predict_proba(X)[0, 1])
            is_anomaly = prob >= ANOMALY_THRESHOLD

            return {
                'component': 'anomaly',
                'prediction': int(is_anomaly),
                'is_anomaly': is_anomaly,
                'score': round(prob * 100, 1),
                'threshold': ANOMALY_THRESHOLD,
                'isolation_forest_flag': iso_flag,
                # flip: positive = makes the transaction look normal ("helping")
                'explanation': explain(champion, X, flip=True),
            }

        else:
            model = None
            if isinstance(bundle_or_model, dict):
                for k, v in bundle_or_model.items():
                    if hasattr(v, 'predict') or hasattr(v, 'predict_proba'):
                        model = v
                        break
            else:
                model = bundle_or_model

            if model is None:
                raise ValueError(f"No valid model object found inside component bundle: '{comp_key}'")

            if hasattr(model, 'predict_proba'):
                prob = float(model.predict_proba(X)[0, 1])
                return {
                    'component': comp_key,
                    'prediction': int(prob >= 0.5),
                    'score': round(prob * 100, 1),
                    'explanation': explain(model, X),
                }
            else:
                val = float(model.predict(X)[0])
                return {'component': comp_key, 'prediction': round(val, 2),
                        'explanation': explain(model, X)}

    except Exception as e:
        print("\n================ PREDICTION ERROR TRACEBACK ================")
        traceback.print_exc()
        print("============================================================\n")
        raise HTTPException(status_code=500, detail=f'Prediction execution failed: {e}')