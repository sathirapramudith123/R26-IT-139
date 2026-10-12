# C3 Weekly demand forecast — සිංහල Study Guide

`weekly_demand_forecast_pipeline.ipynb` එක Part එකෙන් Part එකට තේරුම් ගන්න. හැම Part එකකම: **කරන්නේ මොකක්ද**, **ඇයි**, **ප්‍රතිඵලයේ තේරුම**, සහ panel එක අහන්න පුළුවන් ප්‍රශ්න.

## ප්‍රශ්නය එක වාක්‍යයකින්

> කඩේ සතිපතා විකුණුම් සහ ලංකාවේ **උත්සව කාලය (Avurudu)** යොදාගෙන, **ලබන සතියේ item එකකින් units කීයක් විකුණෙයිද** කියලා සරල ක්‍රම වලට වඩා හොඳට කියන්න පුළුවන්ද? ඒක වැදගත් වෙන්නේ කවදද?

මේක **regression** ප්‍රශ්නයක්: උත්තරය අංකයක් (units). Error එක මනින්නේ **MAE** (සාමාන්‍යයෙන් units කීයකින් වැරදෙනවද).

---

## Part A — Original monthly data එකේ leakage එක ⭐

Original `inventory.ipynb` එක `shop inventory.csv` එකෙන් train කරලා **R² 0.931** කිව්වා. ඒත්:
- `rolling4_mean_units` = අන්තිම periods 4ේ සාමාන්‍යය — **predict කරන period එකත් ඇතුළුව** (100% ගැළපෙනවා). ඒ කියන්නේ උත්තරයෙන් කොටසක් input එක ඇතුළේ!
- පේළි අතර සති 4–5ක් (monthly) — ඒත් app එක forecast කරන්නේ **සතිපතා**.

| | MAE | R² |
|---|---|---|
| Leak එක්ක (original) | 21.56 | **0.931** |
| **Leak අයින් කළාම** | 26.92 | **0.889** |

**0.931 කියන්නේ inflated අංකයක්** — report කරන්න බෑ.

> **Panel ප්‍රශ්නය:** *"Target leakage කියන්නේ මොකක්ද? ඔයාලා ඒක හොයාගත්තේ කොහොමද?"* → Training වලදී model එකට, ඇත්ත ලෝකයේ prediction කරන මොහොතේ **නොලැබෙන** තොරතුරක් (මෙතන predict කරන සතියේම විකුණුම්) ලැබීම. `rolling4_mean_units` එක, target එක ඇතුළත් සාමාන්‍යයක් එක්ක සහ නැති සාමාන්‍යයක් එක්ක සසඳලා හොයාගත්තා (1.000 vs 0.044).

---

## Part B — Weekly dataset එක

`demand_forecast_weekly.csv` — පේළි 5,434, items 26, 2022-06 සිට 2026-06, **හැම පේළියක්ම සතියකින් සතියට**.

**Lag features 3ම අතීතයෙන් විතරයි** (100% check කළා):
- `lag1_units` = පහුගිය සතියේ විකුණුම්
- `lag4_units` = සති 4කට කලින්
- `rolling4_mean_units` = **පහුගිය** සති 4ේ සාමාන්‍යය (මේ සතිය නැතුව)

App එකත් මේ definitions වලටම ගණන් කරනවා. `weekend_share` එක 99.5%ක්ම 0.29 — කිසිම තොරතුරක් දෙන්නේ නෑ.

---

## Part C — Time split + සති 4ක gap

- **Train:** 2025-06 දක්වා (පේළි 4,056) · **Gap:** පේළි 104 · **Test:** 2025-07 → 2026-06 (පේළි 1,274)
- **Expanding-window CV** folds 4 — හැම එකකම අතීතයෙන් train කරලා ඊළඟ මාස 6න් validate.

> **Panel ප්‍රශ්නය:** *"Forecasting වලට random split එකක් ඇයි පාවිච්චි නොකළේ?"* → Forecast කරන්නේ අනාගතය; test එකත් අනාගතයෙන් වෙන්න ඕන. Random split එකේ "අද" දැනගෙන "ඊයේ" predict කරනවා වගේ දෙයක් වෙනවා.

---

## Part D — Model comparison සහ naive forecasts

| Model | Time-CV MAE |
|---|---|
| **Random Forest** | **9.88** |
| Decision Tree | 9.96 |
| Gradient Boosting | 10.03 |
| XGBoost | 10.19 |
| Linear Regression | 11.43 |

**Test (අනාගතය):**

| | MAE | RMSE | R² |
|---|---|---|---|
| **ML (Random Forest)** | **10.89** | 24.79 | 0.908 |
| Naive: පහුගිය සතිය වගේමයි | 13.90 | 30.49 | 0.861 |
| Naive: පහුගිය සති 4 සාමාන්‍යය | 14.15 | 31.16 | 0.855 |

ML එක හොඳම naive එකට වඩා **21.7%** හොඳයි.

**MAE vs RMSE:** MAE = සාමාන්‍ය error එක (units). RMSE = ලොකු errors වලට වැඩි බරක් දෙන error එක. RMSE > MAE නම් සමහර සති වල ලොකු errors තියෙනවා (උදා: festival).

> **Panel ප්‍රශ්නය:** *"Naive baseline එකක් එක්ක compare කරන්නේ ඇයි?"* → R² 0.908 තනියම කිසිවක් කියන්නේ නෑ — naive එකටත් 0.861. ML එකට **ඇත්ත වටිනාකමක්** තියෙනවද කියලා දැනගන්නේ සරලම ක්‍රමයට වඩා කොච්චර හොඳද කියලා බලලා.

---

## Part E — ML වටින්නේ කවදද? ⭐ (ප්‍රධාන research finding එක)

Test සති කොටස් 3ට: **festival** (2026 Avurudu සති 3), **festival එකට පස්සේ** (සති 2), **සාමාන්‍ය**.

| කාලය | ML MAE | පහුගිය සතිය | ML කොච්චර හොඳද | 95% CI (units/සතිය) |
|---|---|---|---|---|
| සාමාන්‍ය | 9.89 | 11.99 | 15% | [1.0, 2.5] ✅ |
| Festival | 25.98 | 32.54 | 20% | [−1.9, 15.3] (indicative) |
| **Festival එකට පස්සේ** | **10.16** | **28.04** | **64%** | **[9.7, 27.3]** ✅ |
| මුළු කාලය | 10.89 | 13.90 | 21.7% | [1.9, 4.1] ✅ |

**ඇයි Avurudu එකට පස්සේ ML මෙච්චර හොඳ?** "පහුගිය සතිය වගේමයි" කියන naive ක්‍රමය festival එකේ ඉහළ ගිය විකුණුම් **ඊළඟ සතියටත්** predict කරනවා. ML එක `days_to_avurudu` හරහා festival එක ඉවරයි කියලා දන්නවා.

**Festival CI එකේ 0 තියෙන්නේ ඇයි?** සති 3ක් විතරයි — sample එක පොඩියි. ඒ නිසා "indicative" කියලා අවංකව කියනවා.

---

## Part F — Stock වලට බලපෑම

Forecast එකේ ප්‍රමාණයම stock කළොත්:

| | Lost sales (අඩු) | Left over (ඉතුරු) |
|---|---|---|
| **ML** | 9.3% | **7.0%** |
| Naive: පහුගිය සතිය | 9.9% | 10.9% |

- ML එකෙන් overstock එක **11% → 7%** අඩු වෙනවා, lost sales වැඩි වෙන්නේ නැතුව.
- Festival සති වල naive ක්‍රමයෙන් ඉල්ලුමෙන් **23%ක් ලබාදෙන්න බෑ** (ML 11%).
- Festival එකට පස්සේ naive ක්‍රමයෙන් **40%ක් ඉතුරු වෙනවා** (ML 7%).

> **Viva කතාව:** *"Avurudu ට කලින් බඩු මදි වෙනවා, Avurudu ට පස්සේ බඩු ඉතුරු වෙනවා — ML එකෙන් ප්‍රශ්න දෙකම අඩු වෙනවා."*

---

## Part G — Reorder point (app එකේ Buy/Wait)

**Reorder point = forecast × lead time (සති) + 1.65 × RMSE × √(lead time සති)**

- **Safety stock** = forecast එකේ error එකට එරෙහිව ආරක්ෂිත ප්‍රමාණය. **Z = 1.65** කියන්නේ delivery එක එනකම් බඩු ඉවර නොවෙන්න **~95%** සම්භාවිතාවක්.
- RMSE 24.79 → lead time දවස් 1/3/7/14 → safety stock 15/27/41/58.
- App එකේ Buy/Wait: stock ≤ reorder point → **BUY**. මේක තමයි C3 → C2 integration එක.

---

## Part H — Training/serving check

Festival season definition එක: මේ data එකේ = Avurudu ට **දවස් 0–21**. Backend එක කලින් දවස් 30 පාවිච්චි කළා → දවස් 22–30 model එකට "festival" ලෙස ගියා (training එකේ ඒවා normal). දැන් **21** — හැදුවා.

---

## Part I — Model එක save කිරීම

Champion එක සති ඔක්කොම වලින් retrain කරලා `weekly_demand_forecast_model.pkl` — app එකේ model එකට **වෙනස 0.000000**.

---

## Limitations

- Test කාලයේ Avurudu **එකයි** (festival සති 3, පස්සේ 2) — festival ප්‍රතිඵල indicative.
- Weekly series එක එක ඇත්ත කඩේක විකුණුම් නෙවෙයි.
- Safety stock එකට items ඔක්කොටම එකම error අගයක් — ටිකක් විකුණෙන items වලට safety stock ලොකු වෙනවා.

---

## Viva එකට ලෑස්ති වෙන්න — ඉක්මන් ප්‍රශ්න

1. Target leakage කියන්නේ මොකක්ද? R² 0.931 වැරදි ඇයි?
2. MAE සහ RMSE අතර වෙනස මොකක්ද? ඔයාලා MAE තෝරගත්තේ ඇයි?
3. Naive baseline එකක් ඇයි ඕන?
4. Time split එකක් ඇයි? සති 4ක gap එක ඇයි?
5. Random Forest ඇයි, ARIMA / Prophet වගේ time-series models ඇයි නැත්තේ? *(items 26ම එක model එකකින්, festival වගේ external features ලේසියෙන් එකතු කරන්න පුළුවන්, naive time-series baselines එක්ක compare කළා)*
6. Festival එකට පස්සේ ML 64%ක් හොඳ වුණේ ඇයි?
7. Festival CI එකේ 0 තියෙන එකේ තේරුම මොකක්ද?
8. Safety stock formula එකේ Z = 1.65 කියන්නේ මොකක්ද?
9. Demand forecast එක procurement (C2) එකට සම්බන්ධ වෙන්නේ කොහොමද?
10. Festival definition mismatch එක මොකක්ද, ඒක හැදුවේ කොහොමද?

**ඊළඟ පියවර:** මේක කියවලා, notebook එකේ markdown cells **ඔයාගේ වචන වලින්** ලියන්න, Conclusion එක පුරවන්න.
