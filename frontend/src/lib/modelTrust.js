// How each model was tested — shown next to its prediction so the merchant (and examiner) can see
// how far to trust it. Numbers are from the model cards in "ML model/<component>/README.md".
import { t } from "@/lib/i18n";

export const MODEL_TRUST = {
  credit: {
    get model() {
      return t("Logistic Regression");
    },
    get headline() {
      return t("Beats the usual bank rules: F1 0.75 vs 0.68");
    },
    get detail() {
      return t("ROC-AUC 0.839 on shops it never saw — 99.9% of the best possible on this data.");
    },
  },
  demand: {
    get model() {
      return t("Random Forest");
    },
    get headline() {
      return t("21.7% more accurate than “same as last week”");
    },
    get detail() {
      return t("64% better right after Avurudu. Usually off by about 11 units a week.");
    },
  },
  procurement: {
    get model() {
      return t("Random Forest");
    },
    get headline() {
      return t("Following it saves about 2.2% of the purchase bill");
    },
    get detail() {
      return t("ROC-AUC 0.795, tested on later weeks than it learned from.");
    },
  },
  anomaly: {
    get model() {
      return t("XGBoost + Isolation Forest");
    },
    get headline() {
      return t("False alarms down from 136 to 19 per 1,000 honest customers");
    },
    get detail() {
      return t("CBSL limits are always enforced; the model catches what the limits cannot.");
    },
  },
};

// typical weekly forecast error (test MAE, units) — the shaded band on the forecast chart
export const DEMAND_MAE = 11;
