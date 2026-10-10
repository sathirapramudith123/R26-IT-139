# C1 Credit readiness — සිංහල Study Guide

`credit_readiness_pipeline.ipynb` එක Part එකෙන් Part එකට තේරුම් ගන්න. හැම Part එකකම: **කරන්නේ මොකක්ද**, **ඇයි**, **ප්‍රතිඵලයේ තේරුම**, සහ panel එක අහන්න පුළුවන් ප්‍රශ්න. Notebook එකේ markdown එක ඔයාගේ වචන වලින් ලියන්න කලින් මේක කියවන්න.

## ප්‍රශ්නය එක වාක්‍යයකින්

> කුඩා කඩයක digital ledger එකේ තියෙන දත්ත (විකුණුම්, වියදම්, stock, digital payments) වලින්, ඒ කඩේ ණයක් ගන්න සුදුසුද කියලා **0–100 score එකක්** දෙන්න පුළුවන්ද? ඒක බැංකු පාවිච්චි කරන සරල rules වලට වඩා හොඳද?

මේක **binary classification** ප්‍රශ්නයක්: උත්තරය "සුදුසුයි (1)" හෝ "සුදුසු නෑ (0)". Model එක දෙන **probability** එක × 100 = credit score එක.

---

## Part A — Data

**කරන්නේ:** `sales & financial.csv` කියවනවා (කඩ 2,500, columns 13). **කියවනවා විතරයි**, file එක වෙනස් කරන්නේ නෑ.

**වැදගත්ම දේ — data එක synthetic:**
- හැම කඩේකම අගයන් random විදිහට generate කරලා, label එක (`target_credit_ready`) **දන්නා formula එකකින්** + random noise එකකින් හදලා තියෙනවා.
- Formula එක: months active, profit margin, digital payments → score එක **වැඩි කරනවා**; stock-outs, credit sales, sales volatility → **අඩු කරනවා**.
- Revenue, expenses, profit, daily transactions formula එකේ **නෑ**.

**Oracle කියන්නේ මොකක්ද?** Formula එක අපි දන්න නිසා, "කිසිම model එකකට ගන්න පුළුවන් **උපරිම** score එක" ගණන් කරන්න පුළුවන්. ඒක **oracle ceiling** එක: **AUC 0.840**. Label එකේ random noise තියෙන නිසා 1.0 වෙන්නේ නෑ.

**Effect table එක:** formula එකේ බර × ඒ column එකේ std. Months active (0.94) තමයි ප්‍රබලම factor එක, ඊට පස්සේ profit margin (0.76), stock-outs (−0.71).

> **Panel ප්‍රශ්නය:** *"Formula එක දන්නවා නම් ML ඇයි?"*
> **උත්තරය:** ඇත්ත ලෝකයේ formula එක දන්නේ නෑ. Synthetic data එක පාවිච්චි කළේ pipeline එක **validate** කරන්න — model එකට hidden formula එක කොච්චර හොයාගන්න පුළුවන්ද කියලා oracle එක එක්ක මනින්න. ඇත්ත loan repayment data ලැබුණාම මේ pipeline එකම retrain කරන්න පුළුවන්.

---

## Part B — Features සහ split

**Domain features 5ක්** pipeline එක ඇතුළේ ගණන් කරනවා: net cash flow (revenue − expenses), debt-to-income (expenses ÷ revenue), digital revenue volume, revenue per active month, cash-flow margin. App එක යවන්නේ raw values විතරයි, features 5 model එක ඇතුළේ හැදෙනවා. ඒ නිසා app එකේ formula එකක් වැරදෙන්න බෑ.

**80/20 stratified split:** කඩ 2,000ක් train, 500ක් test. *Stratified* කියන්නේ කොටස් දෙකේම credit-ready % එක එකම (48%) වෙන්න බෙදන එක.

**හොයාගත්ත bug එක (`months_active`):** Original notebook එක numeric columns තෝරුවේ `int64` / `float64` විතරයි. Data එක memory එකේ `np.random.randint` එකෙන් හැදුවම Windows වල ඒක **int32** — ඒ නිසා ප්‍රබලම factor එක (`months_active`) model එකට **කිසිදා ගියේ නෑ**. `select_dtypes('number')` එකෙන් ඒක හැදුවා.

> **Panel ප්‍රශ්නය:** *"Stratified split ඇයි?"* → Test set එකේ ready/not-ready අනුපාතය train set එකට සමාන වෙන්න; නැත්නම් test ප්‍රතිඵල අහම්බයෙන් වෙනස් වෙන්න පුළුවන්.

---

## Part C — Model comparison

**Models 5:** Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost.

**5-fold cross-validation (CV):** Training කඩ 2,000 කොටස් 5කට බෙදලා, හතරකින් train කරලා පස්වෙනි එකෙන් test කරනවා — 5 පාරක්. සාමාන්‍යය තමයි CV score එක. **Test set එක model එක තෝරන්න පාවිච්චි කරන්නේ නෑ.** ඒක අන්තිමට **එක පාරයි**.

| Model | CV ROC-AUC |
|---|---|
| **Logistic Regression** | **0.815** |
| Gradient Boosting | 0.787 |
| XGBoost | 0.786 |
| Random Forest | 0.785 |
| Decision Tree | 0.711 |

**Logistic Regression දිනුවේ ඇයි?** Label formula එක weighted sum එකක් (linear). Linear model එකකට ඒක හරියටම අල්ලගන්න පුළුවන්. Trees වලට කෙළින් රේඛාවක් splits ගොඩකින් approximate කරන්න වෙනවා.

**Test ප්‍රතිඵල (කඩ 500):**

| | ROC-AUC | Accuracy | Precision | Recall | F1 |
|---|---|---|---|---|---|
| **අපේ model එක** | **0.839** | 0.758 | 0.739 | 0.767 | **0.753** |
| Oracle | 0.840 | 0.760 | 0.738 | 0.775 | 0.756 |
| Original (bug එක්ක) | 0.816 | 0.686 | 0.827 | 0.438 | 0.572 |

අපේ model එක oracle එකෙන් **99.9%** — හැකි උපරිමයටම ආසන්නයි.

**Metrics මතක තියාගන්න (confusion matrix එකෙන්):**
- **TP** = ඇත්තටම ready, model එකත් ready කිව්වා · **FP** = ready නෑ, ඒත් ready කිව්වා · **FN** = ready, ඒත් reject කළා · **TN** = ready නෑ, reject කළා
- **Precision** = TP ÷ (TP + FP) — approve කරපු අයගෙන් ඇත්තටම හොඳ අය කීයද (**lender ට වැදගත්**)
- **Recall** = TP ÷ (TP + FN) — ණය ලැබිය යුතු අයගෙන් කීයදෙනෙක්ට ලැබුණද (**කඩකාරයාට / inclusion එකට වැදගත්**)
- **F1** = 2 × P × R ÷ (P + R) — දෙකම balance කරන එක අංකයක්
- **ROC-AUC** = random ready කඩයකට, random not-ready කඩයකට වඩා වැඩි score එකක් දෙන්න තියෙන සම්භාවිතාව (0.5 = coin toss, 1.0 = perfect). Threshold එකක් මත රඳා පවතින්නේ නෑ.

> **Panel ප්‍රශ්නය:** *"Original model එකේ precision 0.827, ඔයාලගේ 0.739 — original එක හොඳ නැද්ද?"*
> **උත්තරය:** Original එකේ recall 0.438යි — ණය ලැබිය යුතු අයගෙන් අඩකටත් වඩා reject කළා. ඒක ගොඩක් පරිස්සම් වෙලා ටික දෙනෙක්ට විතරක් approve කළා. F1 (0.572 vs 0.753) සහ AUC (0.816 vs 0.839) දෙකෙන්ම අපේ එක හොඳයි.

---

## Part D — Score එකට බලපාන්නේ මොනවද

Logistic regression **coefficients** chart එක (inputs standardise කරලා): දකුණට = score එක වැඩි කරනවා, වමට = අඩු කරනවා.

- **ප්‍රබලම:** months active (+), stock-out rate (−), digital payments (+), profit margin (+)
- Revenue, expenses, daily transactions ≈ 0 — formula එකේ නැති නිසා.
- **Profit margin තුන් පාරක් පේනවා:** `profit_margin_pct`, `cash_flow_margin`, `debt_to_income_ratio` (= 1 − margin) කියන්නේ එකම තොරතුර. ඒ නිසා බර තුනකට බෙදිලා යනවා (**collinearity**).

App එකේ "What's affecting this" bars (SHAP) එකම අදහස — **එක කඩයකට** ඇයි ඒ score එක ආවේ කියලා පෙන්නනවා.

---

## Part E — Loan limit

Original notebook එක loan limit එක predict කරන්න Random Forest එකක් train කළා. ඒත් ඒකේ target එක **හරියටම** `3.5 × net cash flow` කියන formula එක. Model එක R² 0.980 (MAE LKR 2,070) — formula එක R² 1.000, error 0. **ඒ නිසා app එක formula එකම පාවිච්චි කරනවා**: exact, ඒ වගේම කඩකාරයාට පැහැදිලි කරන්න ලේසියි.

> **Panel ප්‍රශ්නය:** *"ML ඇයි loan limit එකට පාවිච්චි නොකළේ?"* → Formula එකක් හරියටම දන්නවා නම්, ඒක approximate කරන ML model එකකට වඩා formula එක හොඳයි. ML ඕන වෙන්නේ rule එක **නොදන්න** තැන්වලට.

---

## Part F — Bank rules vs ML vs live system ⭐ (ප්‍රධාන research finding එක)

| Policy | Approve % | Precision | Recall | F1 | Reject වුණු සුදුසු කඩ |
|---|---|---|---|---|---|
| Bank rules (DTI ≤ 85%, මාස ≥ 3) | 67% | 0.583 | 0.817 | 0.681 | 44 |
| Strict rules (+ stock-out ≤ 25%) | 24% | 0.739 | **0.367** | 0.490 | **152** |
| **ML විතරක්** | 50% | 0.739 | 0.767 | **0.753** | 56 |
| Live system (rules AND ML) | 42% | 0.755 | 0.654 | 0.701 | 83 |

**තේරුම:**
1. Bank rules **ලිහිල් වැඩියි** — 67%කට approve කරනවා, ඒත් සුදුසු නැති 140කටත් approve වෙනවා (precision 0.58).
2. Strict stock-out rule එක **සුදුසු කඩ 240න් 152ක් (63%) reject කරනවා** → financial exclusion. ඒ නිසා app එකේ ඒක **notice** එකක් විතරයි, block එකක් නෙවෙයි.
3. ML එක හොඳම balance එක දෙනවා.
4. Live system එකේ **trade-off එකක්**: hard rules නිසා precision ටිකක් වැඩියි (0.755), ඒත් සුදුසු කඩ 27ක් වැඩිපුර reject වෙනවා.

**Bootstrap 95% CI කියන්නේ මොකක්ද?** Test කඩ 500 1,000 පාරක් random විදිහට (replacement එක්ක) නැවත තෝරලා, හැම පාරකම F1 වෙනස ගණන් කරනවා. ඒ අගයන් වලින් 95%ක් තියෙන පරාසය = CI. **CI එකේ 0 නැත්නම්**, වෙනස අහම්බයක් නෙවෙයි.
- ML − bank rules: **+0.071 [+0.024, +0.122]** → ML ඇත්තටම හොඳයි ✅
- ML − strict rules: +0.262 [+0.193, +0.335] ✅
- Live − ML: −0.051 [−0.081, −0.023] → hard rules F1 එක අඩු කරනවා (trade-off එක)

> **Panel ප්‍රශ්නය:** *"F1 අඩු වෙනවා නම් hard rules ඇයි තියන්නේ?"* → Lender කෙනෙක්ට නරක ණය (FP) වියදම් වැඩියි; DTI > 85% සහ මාස 3ට අඩු කඩ සම්ප්‍රදායිකවම අවදානම්. ඒක **දැනුවත්ව කරපු design තීරණයක්** — precision එකට ප්‍රමුඛත්වය දෙනවා.

---

## Part G — කඩ කීයක data ඕනද (learning curve)

| Training කඩ | සාමාන්‍ය AUC | නරකම 5% | Oracle එකෙන් % |
|---|---|---|---|
| 25 | 0.716 | 0.538 | 85% |
| 50 | 0.769 | 0.686 | 92% |
| **100** | 0.806 | 0.786 | **96%** |
| 400 | 0.831 | 0.816 | 99% |
| 2,000 | 0.839 | 0.839 | 100% |

**තේරුම:** Microfinance ආයතනයකට **කඩ ~100–200ක** data එකතු කළාම model එක විශ්වාස කරන්න පුළුවන්. කඩ 25ක් නම් සමහර runs වල AUC 0.54 — coin toss එකක් වගේ.

**ඇයි "මාස කීයක data ඕනද" කියන learning curve එක නොකළේ?** `months_active` label formula එක ඇතුළෙම තියෙනවා — ඒ analysis එකෙන් ලැබෙන්නේ අපි දාපු formula එකමයි (**circular**).

---

## Part H — Training/serving check

App එක (`backend/src/utils/features.js`) inputs ගණන් කරන්නේ කඩේ ඇත්ත ledger එකෙන්. Inputs දෙකක් training data එකට සමාන නෑ:
- **`sales_volatility`:** training එකේ 0.1–5.0 random අංකයක් (unit එකක් නෑ); app එකේ දෛනික විකුණුම් වල coefficient of variation (0–1.5). ඒ නිසා app එකේ කඩ ටිකක් "ස්ථාවර" වගේ පේනවා. Test එකේ **කඩ 5.6%ක තීරණය** වෙනස් වෙනවා (සාමාන්‍ය score 49.3 → 52.8).
- **`credit_sales_ratio`:** app එකේ "credit එකට විකුණුවා" කියන payment method එකක් නැති නිසා මනින්න බෑ — training median (0.25) පාවිච්චි වෙනවා.

මේ දෙක **limitations** විදිහට අවංකව document කරලා තියෙනවා.

> **Panel ප්‍රශ්නය:** *"Training/serving skew කියන්නේ මොකක්ද?"* → Model එක train කරපු inputs වල අර්ථය / scale එක, app එක යවන inputs වලට වඩා වෙනස් වීම. Model එකේ accuracy එක notebook එකේ තිබ්බට, app එකේ වැරදෙන්න පුළුවන්. අපි ඒක මැනලා (5.6%) document කළා.

---

## Part I — Model එක save කිරීම

Champion එක **කඩ 2,500ම** යොදාගෙන නැවත train කරලා `credit_readiness_model.pkl` විදිහට save කරනවා. App එකේ තියෙන model එකට සසඳලා — **වෙනස 0.000000** (එකම model එක).

**App එක score එක පාවිච්චි කරන විදිහ (`ml_service/app.py`):**
- Score ≥ 70 → **APPROVED_PRIME** · 50–69 → **CONDITIONAL** (ණය LKR 250,000ට සීමා) · < 50 → **REJECTED**
- Hard blocks: DTI > 85% හෝ මාස 3ට අඩු
- Loan limit = **3.5 × මාසික net cash flow**

---

## Viva එකට ලෑස්ති වෙන්න — ඉක්මන් ප්‍රශ්න

1. Precision සහ recall අතර වෙනස මොකක්ද? Lender ට වැදගත් මොකක්ද, කඩකාරයාට වැදගත් මොකක්ද?
2. Accuracy වෙනුවට F1 / AUC පාවිච්චි කළේ ඇයි?
3. Cross-validation කියන්නේ මොකක්ද? Test set එක model එක තෝරන්න පාවිච්චි නොකළේ ඇයි?
4. Oracle ceiling එක ගණන් කරන්න පුළුවන් වුණේ ඇයි? ඒකෙන් අපිට කියන්නේ මොකක්ද?
5. `months_active` bug එක මොකක්ද, ඒක හොයාගත්තේ කොහොමද?
6. Logistic regression එක trees වලට වඩා හොඳ වුණේ ඇයි?
7. Bootstrap CI එකක 0 තිබ්බොත් / නැත්නම් තේරුම මොකක්ද?
8. Strict stock-out rule එක block එකක් නොකළේ ඇයි?
9. Data synthetic නම්, ඔයාලගේ results වල වටිනාකම මොකක්ද?
10. Volatility mismatch එක app එකට කොච්චර බලපානවද?

**ඊළඟ පියවර:** මේක කියවලා, notebook එකේ markdown cells **ඔයාගේ වචන වලින්** ලියන්න, Conclusion එක පුරවන්න.
