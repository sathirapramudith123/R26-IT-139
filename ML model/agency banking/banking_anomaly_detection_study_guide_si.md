# C4 Banking anomaly detection — සිංහල Study Guide

`banking_anomaly_detection_pipeline.ipynb` එක Part එකෙන් Part එකට තේරුම් ගන්න. හැම Part එකකම: **කරන්නේ මොකක්ද**, **ඇයි**, **ප්‍රතිඵලයේ තේරුම**, සහ panel එක අහන්න පුළුවන් ප්‍රශ්න.

## ප්‍රශ්නය එක වාක්‍යයකින්

> Agency banking transactions අතරින් **සැක සහිත ඒවා** අල්ලගන්න ML model එකක් සරල rules වලට වඩා හොඳද? CBSL rule එක ML එකත් එක්ක **එකතු කළ යුතුද**?

මේක **imbalanced binary classification** ප්‍රශ්නයක්: transactions වලින් **5%ක්** විතරයි anomalies. ඒ නිසා accuracy එක නොමඟ යවනවා — **කිසිම දෙයක් flag නොකරන** model එකකටත් 95% accuracy!

---

## Part A — Model එක train කිරීම

**A1–A3: Data සහ split.** `paysim.csv` — transactions 164,260, anomalies 5%. Duplicates සහ ID/date columns අයින් කරනවා. **Stratified 80/20 split එක මුලින්ම** — train 131,408, test 32,852 (anomalies 1,643). Test set එකෙන් කිසිම දෙයක් පස්සේ features හදන්න හෝ තෝරන්න පාවිච්චි කරන්නේ නෑ.

**A2: `is_high_zscore`** = amount එක ඒ transaction type එකේ සාමාන්‍යයට වඩා **std 2කට වඩා** ඈත නම් 1.

**A4: Isolation Forest** = labels නැතුව "අමුතු" points හොයන **unsupervised** algorithm එකක්. ඒකේ outlier flag එක XGBoost එකට **එක input එකක්** විදිහට යනවා. **Training data එකෙන් විතරක්** fit කරනවා.

**A5: `scale_pos_weight` ≈ 19** = normal 19කට anomaly 1යි. XGBoost එකට කියනවා anomaly එකක් වැරදීම 19 ගුණයක් බරපතලයි කියලා.

**A6 + A6b: Models 4 සහ champion එක තේරීම:**

| Model | CV PR-AUC (train) | Test PR-AUC | Test ROC-AUC |
|---|---|---|---|
| **XGBoost** | **0.522** | **0.517** | **0.914** |
| Decision Tree | 0.503 | 0.507 | 0.912 |
| Logistic Regression | 0.470 | 0.475 | 0.908 |
| Random Forest | 0.433 | 0.429 | 0.891 |

Original එක champion එක තේරුවේ **test** PR-AUC එකෙන් — test set එක පාවිච්චි කරන්න ඕන අන්තිමට එක පාරයි. ඒ නිසා **3-fold CV PR-AUC එකෙන්** (training set එක විතරයි) ආයෙත් තේරුවා → **XGBoost** (එකම තීරණය, නිවැරදි ක්‍රමය).

**PR-AUC ඇයි ROC-AUC නෙවෙයි?** Imbalanced data වල ROC-AUC එක ඉහළයි (0.91) — normal transactions ගොඩක් නිසා. **PR-AUC** precision සහ recall දෙකම anomalies මත විතරක් මනිනවා — rare class එකට වඩා සැබෑයි.

**A7 charts:** ROC/PR curves, confusion matrix, learning curve, **SHAP**. SHAP එකෙන් පේනවා **transaction type** සහ **amount** තමයි ප්‍රබලම; Isolation Forest flag එකේ බලපෑම **නැති තරම්**.

**A8:** Retrain කරපු model එක saved model එකට සමානයි (වෙනස 0.000000).

> **Panel ප්‍රශ්නය:** *"Isolation Forest එකතු කළේ ඇයි? ප්‍රයෝජනයක් තියෙනවද?"* → Labels නැති අලුත් ආකාරයේ වංචා අල්ලගන්න unsupervised signal එකක් එකතු කරන්න හැදුවා. ඒත් SHAP එකෙන් පේනවා ඒකේ බලපෑම නැති තරම් — මේක අවංක finding එකක්.

---

## Part B — Threshold එක තෝරගැනීම ⭐ (F1 score එක මෙතනයි)

Model එක දෙන්නේ **probability** එකක් (0–1). "Flag කරනවද නැද්ද" කියන්න **threshold** එකක් ඕන.

**0.5 (default) එකේ ප්‍රශ්නය:** `scale_pos_weight` නිසා probabilities ඉහළට යනවා → precision **0.23** — flag කරන 100න් **77ක්ම අවංක customers**. Normal 1000කට false alarms **136ක්**.

**Out-of-fold (OOF) ක්‍රමය:** Training data එක කොටස් 5කට බෙදලා, හැම පේළියකටම **ඒක දැකලා නැති** model එකකින් probability එකක් ගන්නවා. ඒ probabilities වලින් **F1 උපරිම වෙන threshold එක** තෝරනවා → **0.866 ≈ 0.87**. **Test set එක පාවිච්චි කරන්නේ නෑ.**

| Threshold | Precision | Recall | F1 | Normal 1000කට false alarms |
|---|---|---|---|---|
| 0.50 | 0.23 | 0.78 | 0.36 | 136 |
| **0.87** | **0.53** | **0.40** | **0.46** | **19** |
| 0.90 | 0.59 | 0.35 | 0.44 | 13 |
| 0.95 | 0.85 | 0.25 | 0.39 | 2 |

**F1 = 2 × Precision × Recall ÷ (Precision + Recall)** — දෙකම ඉහළ නම් විතරයි ඉහළ. Threshold එක ඉහළ දැම්මාම precision ↑, recall ↓ — F1 එකෙන් balance එක තෝරනවා.

**අතින් check කරන්න (0.87):** TP 664, FP 588 → precision = 664 ÷ 1,252 = **0.53** · FN 979 → recall = 664 ÷ 1,643 = **0.40**.

> **Panel ප්‍රශ්නය (PP2 එකේ ඇහුවේ මේක!):** *"F1 score එක කියන්නේ මොකක්ද?"*
> **උත්තරය:** Precision (flag කරපු ඒවායින් ඇත්ත anomalies %) සහ recall (ඇත්ත anomalies වලින් අල්ලගත් %) වල **harmonic mean** එක. Imbalanced data වල accuracy නොමඟ යවන නිසා අපි F1 පාවිච්චි කළා. Threshold එකත් තෝරගත්තේ OOF F1 උපරිම වෙන අගයට — 0.87.

> **Panel ප්‍රශ්නය:** *"0.86 ද 0.87 ද?"* → F1 curve එක 0.84–0.88 අතර **පැතලියි**, ඒ නිසා ප්‍රතිඵලය threshold එකේ පොඩි වෙනස්කම් වලට sensitive නෑ. App එකේ 0.87.

**B3 Real-time example:** එක test transaction එකකට risk **99.82%** → FLAG ("ask the agent to verify") — ඇත්තටම anomaly එකක්.

---

## Part C — Rules vs ML vs Hybrid ⭐ (ප්‍රධාන research finding එක)

Data එකේ anomalies තියෙන්නේ **cash_out (7%) සහ transfer (24%)** වල විතරයි. Methods 7ම **එකම test set** එකේ:

| Method | F1 | Normal 1000කට false alarms |
|---|---|---|
| **D. ML විතරක් (0.87)** | **0.459** | **18.8** |
| F. Hybrid: ML **AND** CBSL | 0.437 | 15.0 |
| C. ML (0.5) | 0.357 | 136 |
| N. Naive: හැම transfer එකක්ම | 0.327 | 81.7 |
| B. Z-score rule | 0.180 | 27.7 |
| E. Hybrid: ML **OR** CBSL | 0.147 | 582 |
| A. CBSL rule විතරක් | 0.142 | 579 |

**Bootstrap 95% CI (ML එක්ක සසඳලා):** OR-hybrid **−0.311 [−0.333, −0.289]** — 0 නෑ = ඇත්ත වෙනසක්.

**CBSL rule එක ML එකට එකතු කරන දේ:** අලුත් flags **18,499** — ඇත්ත anomalies **910**, අවංක customers **17,589**.

**Design තීරණය:** CBSL limit එක detector එකක් (OR) විදිහට පාවිච්චි කළොත් F1 0.46 → 0.15. ඒ නිසා app එකේ CBSL limits **block එකක්** (limit එක ඉක්මවන transaction එක database function එක **reject** කරනවා), ML එක **detector** එක.

**Data limitation:** PaySim amounts ගොඩක් ලොකුයි (cash_out median ~LKR 152,000) — ලංකාවේ ගම් agent කෙනෙක්ට ගැළපෙන්නේ නෑ. ඒ නිසා CBSL rule එක 60%කට fire වෙනවා. **Comparison එක valid**, absolute අංක ඇත්ත ලෝකය ගැන claim එකක් නෙවෙයි.

> **Panel ප්‍රශ්නය:** *"Model එක ඉගෙන ගන්නේ transaction type එක විතරද?"* → PaySim එකේ anomalies තියෙන්නේ types 2ක විතරයි — ඒ නිසා type එක ප්‍රබලයි. අපි "හැම transfer එකක්ම flag කරන" naive baseline එකත් compare කළා: ML (0.46) > naive (0.33) — ML එක type එකට වඩා දෙයක් ඉගෙන ගන්නවා.

---

## Part D — Training/serving check

Training data එකේ `amount_zscore` = amount එක **ඒ transaction type එක ඇතුළේ** standardise කරලා (100% තහවුරුයි). App එක කලින් **types ඔක්කොම මිශ්‍ර කරලා** ගණන් කළා → දැන් agent ගේ **ඒ type එකේම** transactions එක්ක විතරක් සසඳනවා.

උදාහරණය: agent ගේ withdrawals ~2,000, deposits ~50,000. **Withdrawal 20,000** — කලින් z ≈ −0.2 (සාමාන්‍යයි වගේ ❌) → දැන් z ≈ **2.0** (අසාමාන්‍යයි ✅).

---

## Part E — Model එක save කිරීම

Champion එක, Isolation Forest කොටස්, සහ threshold 0.87 → `banking_anomaly_model.pkl`. App එකේ තියෙන්නේ මේකේ copy එක.

**App එකේ:** probability ≥ 0.87 → flag + "What's affecting this" (SHAP). Agent ට "mark as safe" කරන්න පුළුවන්.

---

## Viva එකට ලෑස්ති වෙන්න — ඉක්මන් ප්‍රශ්න

1. **F1 score එක කියන්නේ මොකක්ද?** Precision, recall අතින් ගණන් කරලා පෙන්නන්න.
2. Imbalanced data වල accuracy නොමඟ යවන්නේ ඇයි? PR-AUC ඇයි?
3. `scale_pos_weight` කියන්නේ මොකක්ද?
4. Threshold එක 0.5 වෙනුවට 0.87 කළේ ඇයි? OOF කියන්නේ මොකක්ද?
5. Threshold එක test set එකෙන් නොතෝරුවේ ඇයි?
6. Isolation Forest කියන්නේ මොකක්ද? ඒකේ වටිනාකම මොකක්ද?
7. SHAP chart එකෙන් පේන්නේ මොකක්ද?
8. ML OR CBSL hybrid එක නරක ඇයි? App එකේ CBSL rule එක පාවිච්චි කරන්නේ කොහොමද?
9. Bootstrap CI එකක 0 නැති එකේ තේරුම මොකක්ද?
10. z-score එක transaction type එක අනුව ගණන් කරන්නේ ඇයි?

**ඊළඟ පියවර:** මේක කියවලා, notebook එකේ markdown cells **ඔයාගේ වචන වලින්** ලියන්න, Conclusion එක පුරවන්න.
