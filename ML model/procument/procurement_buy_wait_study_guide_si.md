# C2 Procurement (Buy now / Wait) — සිංහල Study Guide

`procurement_buy_wait_pipeline.ipynb` එක Part එකෙන් Part එකට තේරුම් ගන්න. හැම Part එකකම: **කරන්නේ මොකක්ද**, **ඇයි**, **ප්‍රතිඵලයේ තේරුම**, සහ panel එක අහන්න පුළුවන් ප්‍රශ්න.

## ප්‍රශ්නය එක වාක්‍යයකින්

> පහුගිය වෙළඳපොළ මිල ගණන් වලින්, කඩකාරයෙකුට බඩුවක් **දැන්ම ගන්නද, සති 4ක් ඉන්නද** කියලා කියන්න පුළුවන්ද? ඒ උපදෙස අනුගමනය කළොත් **සල්ලි කීයක් ඉතුරු වෙනවද** — අද කරන දේට සහ සරල rules වලට සාපේක්ෂව?

Models දෙකක් තියෙනවා: **classifier** එකක් (සති 4කින් මිල ඉහළ යයිද → buy/wait) සහ **regressor** එකක් (සති 4කින් මිල කීයද).

---

## Part A — Data

**කරන්නේ:** `from_rice_veg_2023_2026.csv` කියවනවා — පේළි 7,964, items 67, සති 131 (2023-01 සිට 2026-06). Public market price data (සහල්, එළවළු, පලතුරු). ISO year + week → දිනයක් කරලා **කාල පිළිවෙළට** sort කරනවා.

**Data ප්‍රශ්නයක්:** අවුරුද්දකට පේළි — 2023: 3,237 · 2024: 3,056 · **2025: 127 විතරයි** (සති 2යි) · 2026: 1,544. ඒ කියන්නේ මාස ~7ක **හිඩැසක්** තියෙනවා.

**Label එකේ තේරුම:** `target_buy_now` = 1 **හරියටම** "සති 4කින් මිල අදට වඩා වැඩිනම්" (100% ගැළපෙනවා). ශත 1ක් වැඩි වුණත් "buy". `expected_price_next_4wk_rs` කියන්නේ ඒ අනාගත මිල — ඒක model එකට **input එකක් විදිහට කවදාවත් දෙන්නේ නෑ** (දුන්නොත් ඒක leakage).

> **Panel ප්‍රශ්නය:** *"Future price එක data එකේ තියෙනවා නම් ඒක feature එකක් කරන්නේ නැත්තේ ඇයි?"* → ඒක අපි predict කරන්න හදන උත්තරයමයි. Input එකක් කළොත් model එකට උත්තරය කලින්ම ලැබෙනවා (**target leakage**). App එකේ ඒ අගය කවදාවත් ලැබෙන්නේත් නෑ.

---

## Part B — Features සහ time split

**Inputs 9:** item, category, ISO year, ISO week, අද මිල, **සති 4ක මිල වෙනස %**, **මාස 3 සාමාන්‍යයට සාපේක්ෂව අද මිල %**, Avurudu ට දවස් ගණන, festival season.

**Time split ඇයි?** App එකේදී model එකට තියෙන්නේ **අතීතය විතරයි**. ඒ නිසා test කරන්නත් ඕන **අනාගතයෙන්**:
- **Development (train):** 2024-12 දක්වා — පේළි 6,104
- **සති 4ක gap:** පේළි 252 අයින් කරනවා. Label එක සති 4ක් ඉස්සරහට බලන නිසා, gap එකක් නැත්නම් අන්තිම training labels වල test කාලයේ මිල ගණන් ඇතුළත් වෙනවා.
- **Test:** 2025-08 → 2026-06 — පේළි 1,608 (අනාගතය)

**Expanding-window CV:** Development කාලය ඇතුළේ folds 4ක් — හැම fold එකකම **අතීතයෙන් train කරලා ඊළඟ කොටසෙන් validate** කරනවා (ඒකටත් සති 4ක gap එක).

---

## Part C — Random split එක results වැඩියෙන් පෙන්නුවේ ඇයි

Original `procument.ipynb` එක පේළි ඔක්කොම **shuffle කරලා** 80/20 බෙදුවා. එතකොට එකම item එකේ **එක ළඟ සති** train එකේයි test එකේයි දෙකේම තියෙනවා — model එක test කරන්නේ ඇත්තටම "දැකලා තියෙන" කාලයකින්.

| Split එක | AUC |
|---|---|
| Random split (original, XGBoost) | 0.817 |
| **Time split (අවංක)** | **0.795** |

**+0.022කින් වැඩියෙන් පෙන්නුවා.** Report කරන්න ඕන time split අගය.

> **Panel ප්‍රශ්නය:** *"Time series data වලට random split වැරදි ඇයි?"* → අනාගතය ගැන තොරතුරු (ළඟ සති) training එකට යනවා. ඇත්ත ලෝකයේ model එකට අනාගතය පේන්නේ නෑ — ඒ නිසා random split එකේ score එක app එකේ ලැබෙන්නේ නෑ.

---

## Part D — Model comparison (time-CV)

| Model | Time-CV ROC-AUC |
|---|---|
| **Random Forest** | **0.794** |
| XGBoost | 0.789 |
| Gradient Boosting | 0.782 |
| Logistic Regression | 0.769 |
| Decision Tree | 0.763 |

**Test (අනාගත සති):** Random Forest — **AUC 0.795**, accuracy 0.734, **F1 0.753**.

> **Panel ප්‍රශ්නය:** *"ROC-AUC 0.795 කියන්නේ මොකක්ද?"* → Random "මිල ඉහළ යන" week එකකට, random "ඉහළ නොයන" week එකකට වඩා වැඩි probability එකක් model එක දෙන්න තියෙන සම්භාවිතාව 79.5%. 0.5 = coin toss.

---

## Part E — ML vs සරල rules ⭐

| ක්‍රමය | AUC | Accuracy | F1 |
|---|---|---|---|
| හැමදාම BUY | 0.500 | 0.533 | 0.695 |
| **Rule: සති 4 ඇතුළත මිල වැටුණා නම් ගන්න** | **0.786** | 0.736 | 0.748 |
| Rule: මාස 3 සාමාන්‍යයට අඩු නම් ගන්න | 0.755 | 0.700 | 0.718 |
| **ML (Random Forest)** | **0.795** | 0.734 | **0.753** |

**තේරුම:** ලංකාවේ එළවළු මිල **mean reversion** එකක් පෙන්නනවා — මිල වැටුණාට පස්සේ සාමාන්‍යයෙන් ආයෙත් ඉහළ යනවා. ඒ නිසා එක පේළියක rule එකකටත් ML එකට ආසන්නම ප්‍රතිඵලයක් එනවා.

---

## Part F — මිල forecast එක

| | MAE (LKR) | R² |
|---|---|---|
| **Random Forest regressor** | **13.56** | 0.968 |
| Naive: "මිල එහෙමම තියෙයි" | 15.88 | 0.957 |

Naive එකට වඩා **14.6%** හොඳයි. R² දෙකම ඉහළයි — මිල සතියෙන් සතියට ලොකුවට වෙනස් වෙන්නේ නැති නිසා. ඒ නිසා **වැදගත් අංකය MAE වැඩි දියුණුව**.

> **Panel ප්‍රශ්නය:** *"R² 0.968 නම් ගොඩක් හොඳ නැද්ද?"* → Naive forecast එකෙත් R² 0.957. R² ඉහළ වෙන්නේ data එකේ ගුණාංගය නිසා (autocorrelation). Model එකේ ඇත්ත වටිනාකම naive එකට වඩා MAE 14.6% අඩු වීම.

---

## Part G — සල්ලි ඉතුරු වෙනවද? (cost simulation) ⭐

**Simulation එක:** Test කාලයේ හැම item/week තීරණයකටම (1,608) — **"දැන් ගන්නවා"** = අද මිල ගෙවනවා; **"ඉන්නවා"** = සති 4කට පස්සේ ඇත්ත මිල ගෙවනවා. එක තීරණයකට unit 1යි.

| Policy | ඉතුරු (LKR) | ඉතුරු % | හැකි උපරිමයෙන් % |
|---|---|---|---|
| හැමදාම දැන්ම ගන්නවා (අද කරන විදිහ) | 0 | 0% | 0% |
| Rule: මිල වැටුණා | 8,312 | 2.23% | 67% |
| **ML classifier (app එකේ)** | **8,371** | **2.25%** | **68%** |
| අනාගතය හරියටම දන්නවා (උපරිම) | 12,345 | 3.31% | 100% |

**Bootstrap (සති අනුව 1,000 පාරක්):**
- ML ඉතුරුව: 2.25% [1.17, 3.53] → **0 නෑ = ඇත්තටම සල්ලි ඉතුරු වෙනවා** ✅
- ML − rule: +0.05% [−1.77, +1.77] → **0 ඇතුළේ = වෙනසක් ඔප්පු වෙන්නේ නෑ**

**Rows නෙවෙයි සති resample කළේ ඇයි?** එකම සතියේ තීරණ ඔක්කොටම එකම වෙළඳපොළ තත්ත්වය බලපානවා (ඒවා independent නෑ). සති මුළුමනින් resample කරන එක අවංකයි.

**Category අනුව:** Up Country එළවළු 3.8%, Low Country 3.4%, පලතුරු 1.8%, Grocery/Staple 1.0% (සහල් වගේ — මිල ස්ථාවරයි).

> **Panel ප්‍රශ්නය (අනිවාර්යයෙන් එයි):** *"Rule එකක් මෙච්චර හොඳ නම් ML ඇයි?"*
> **උත්තරය:** (1) අපි ඒක **අවංකව test කරලා පෙන්නුවා** — ML ≈ rule. (2) ML එක **මිල forecast** එකකුත් දෙනවා (naive එකට වඩා 14.6% හොඳයි). (3) Item / season effects සහ **explanations** දෙනවා. (4) Future work: කාලගුණය, ඉන්ධන මිල වගේ features එකතු කරන එක.

---

## Part H — Training/serving check

App එක (`features.js`) **කඩේම purchase price history** එකෙන් price features දෙක ගණන් කරනවා — training data එකේ definitions වලටම.

**Price history නැත්නම්:** Test AUC **0.795 → 0.582** — coin toss එකට ටිකක් හොඳයි. ඒ කියන්නේ model එක පාවිච්චි කරන්නේ මිල trend එක.

**Festival definition:** මේ data එකේ festival season = Avurudu ට **දවස් 1–43** (ISO weeks 10–16). Backend එක කලින් දවස් 30 පාවිච්චි කළා — දැන් **45** (ගැළපෙන්න හැදුවා).

---

## Part I — Model එක save කිරීම සහ app එක

Classifier + regressor දෙකම **ඔක්කොම පේළි** වලින් retrain කරලා `procurement_buy_wait_model.pkl` විදිහට save කරනවා. App එකේ තියෙන්නේ මේ model එකේ copy එක (පරණ random-split model එක replace කළා).

**App එකේ පාවිච්චි වෙන විදිහ:**
- **Buy / Wait තීරණය** = stock එක ≤ **demand forecast එකෙන් (C3) හදන reorder point** එක → BUY
- මේ model එක එකතු කරන්නේ **price context** එක: buy probability ≥ 75% → "Good price right now" (bulk buy), 50–74% → moderate buy, අඩු නම් → "Prices may improve soon"

---

## Viva එකට ලෑස්ති වෙන්න — ඉක්මන් ප්‍රශ්න

1. Time split එකක් සහ random split එකක් අතර වෙනස මොකක්ද? මේ data එකට random split වැරදි ඇයි?
2. සති 4ක gap එකක් දැම්මේ ඇයි?
3. Expanding-window CV කියන්නේ මොකක්ද?
4. Mean reversion කියන්නේ මොකක්ද? ඒක rule එකට උදව් වුණේ කොහොමද?
5. ML ≈ rule නම් ඔයාලගේ contribution එක මොකක්ද?
6. Cost simulation එකේ assumptions මොනවද (unit 1, storage, spoilage)?
7. Bootstrap එකේදී සති resample කළේ ඇයි?
8. R² 0.968 ඉහළ වුණත් ඒක ලොකු දෙයක් නොවෙන්නේ ඇයි?
9. Price history නැති item එකකට model එක කොච්චර විශ්වාස කරන්න පුළුවන්ද?
10. App එකේ Buy/Wait තීරණය ගන්නේ කොහොමද, මේ model එකේ කොටස මොකක්ද?

**ඊළඟ පියවර:** මේක කියවලා, notebook එකේ markdown cells **ඔයාගේ වචන වලින්** ලියන්න, Conclusion එක පුරවන්න.
