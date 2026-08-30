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

def add_domain_features(X):
    return X

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
    'credit': 'models/component1_sales_financial_model.pkl',
    'procurement': 'models/component2_procurement_model.pkl',
    'demand': 'models/component3_demand_forecast_model.pkl',
    'anomaly': 'models/component4_banking_anomaly_model.pkl',
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

    
        rev = float(features_dict.get('monthly_revenue_rs', 0) or 0)
        exp = float(features_dict.get('monthly_expenses_rs', 0) or 0)
        months = float(features_dict.get('months_active', 1) or 1)
        curr = float(features_dict.get('current_price_rs', 0) or 0)
        hist = float(features_dict.get('historical_avg_price_rs', 0) or 0)

        
        features_dict['net_cash_flow'] = rev - exp
        features_dict['debt_to_income_ratio'] = exp / (rev + 1e-5)
        features_dict['cash_flow_margin'] = (rev - exp) / (rev + 1e-5)
        features_dict['revenue_per_active_month'] = rev / (months + 1e-5)
        features_dict['digital_revenue_volume'] = float(
            features_dict.get('digital_payments_rs', rev * 0.4) or 0
        )
        features_dict['price_variance_pct'] = ((curr - hist) / (hist + 1e-5)) * 100

        
        needed = extract_expected_columns(bundle_or_model) or []
        
    
        if comp_key == 'credit':
            dynamic_cols = [
                'net_cash_flow', 
                'debt_to_income_ratio', 
                'cash_flow_margin', 
                'revenue_per_active_month', 
                'digital_revenue_volume'
            ]
            for dc in dynamic_cols:
                if dc not in needed:
                    needed.append(dc)

    
        for col in needed:
            if (
                col not in features_dict
                or features_dict[col] is None
                or features_dict[col] == ''
            ):
                features_dict[col] = (
                    'general' if col in ['item', 'category'] else 0.0
                )

    
        X = pd.DataFrame([features_dict])
        if needed:
            X = X[needed]

        # 4. EXECUTION BY COMPONENT TYPE

    
        if comp_key == 'credit':
            cls_model = bundle_or_model.get('classifier_pipeline') or bundle_or_model.get('classifier_model')
            reg_model = bundle_or_model.get('regressor_pipeline') or bundle_or_model.get('regressor_model')

            prob_score = round(float(cls_model.predict_proba(X)[0, 1]) * 100, 1)
            pred_limit = float(reg_model.predict(X)[0]) if prob_score >= 50 else 0.0

            hard_blocks = []
            if features_dict.get('debt_to_income_ratio', 0) > 0.85:
                hard_blocks.append('CRITICAL: Debt-to-Income Ratio exceeds 85%.')
            if features_dict.get('months_active', 100) < 3:
                hard_blocks.append(
                    'HIGH RISK: Business active history is less than 3 months.'
                )

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
                'rule_alerts': hard_blocks if hard_blocks else ['None'],
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
                }
            else:
                val = float(model.predict(X)[0])
                return {'component': comp_key, 'prediction': round(val, 2)}

    except Exception as e:
        print("\n================ PREDICTION ERROR TRACEBACK ================")
        traceback.print_exc()
        print("============================================================\n")
        raise HTTPException(status_code=500, detail=f'Prediction execution failed: {e}')