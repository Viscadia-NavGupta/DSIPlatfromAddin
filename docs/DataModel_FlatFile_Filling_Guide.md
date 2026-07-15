# DataModel → Flat File: How to Fill the DataModel (Team Guide)

This guide explains exactly how to fill the **DataModel** sheet so that the
Flat File generator (`generateLongFormData` in
`src/taskpane/components/Middleware/ExcelConnection.jsx`) produces correct output.

Follow these rules precisely. Most "missing data / blank levels / misaligned
values" bugs come from breaking **one** of the rules below.

---

## 1. The DataModel columns

Each DataModel row defines **one metric**. The columns are fixed:

| Excel Col | Field | Meaning |
|-----------|-------|---------|
| **A** | Model Metric Name | Name of the metric (e.g. `Demand Vials`). Becomes `output_name`. |
| **B** | Input/Outputs | `Outputs` = processed. `Inputs` = **skipped entirely**. |
| **C** | Timeline (range) | Horizontal range of timeline points (or blank). |
| **D** | Data (range) | The block of numbers to export. **This defines everything.** |
| **E** | Level 1 – Country | |
| **F** | Level 2 – Indication Name | |
| **G** | Level 3 – Patients Pool | |
| **H** | Level 4 – Lines of Therapy | |
| **I** | Level 5 – Class | |
| **J** | Level 6 – Patient Segment | |
| **K** | Level 7 – Treatment History | |
| **L** | Level 8 – Regimen | |
| **M** | Level 9 – Product | |
| **N** | Level 10 – SKU Type | |
| **O** | Level 11 – Placeholder 1 | |
| **P** | Level 12 – Placeholder 2 | |
| **Q** | Level 13 – Event/Curves Names | |
| **R** | Level 14 – Yes/No Switch | |
| **S** | Level 15 – Metric Sub-Sections | |

The generated Flat File has these columns:

```
flow_name | region | output_name | input_output | level_1 … level_15 | timeline | value | serial_number
```

---

## 2. What you can put in each Level cell

Every Level cell (columns **E–S**) must contain **one** of these three things:

| Type | Example | Behaviour in output |
|------|---------|---------------------|
| **Literal label** | `US`, `FL`, `ALL`, `1L` | Used as-is. Repeated on **every** output row for this metric. |
| **Single-cell reference** | `=Control!B738` | Resolves to one value. Repeated on **every** output row (broadcast). |
| **Vertical range reference** | `=Control!F38:F53` | Each value becomes a **separate combination (row)**. |

> ⛔ **Never leave a Level cell blank.** A blank cell shifts every following
> level one position to the left and corrupts the whole row. If a level does
> not apply, write **`ALL`**.

---

## 3. The single most important rule

> **The Data range drives everything.**
> **Rows of the Data range = combinations. Columns of the Data range = timeline points.**

- **Rows** → how many "combinations" (output blocks) this metric produces.
- **Columns** → how many timeline points each combination has.

Everything else must line up with the Data range:

1. **Every vertical Level range must have exactly the same number of rows as the Data range.**
   - If `Data = G64:Z79` (16 rows), then `Level 5 = Control!F38:F53` (16 rows), `Level 8 = ...` (16 rows), etc. **All 16.**
2. **The Timeline range must be 1 row × (number of Data columns).**
   - If `Data = H14:JW14` has 276 columns, then `Timeline = 1 × 276`.
   - Timeline may be left blank (then the `timeline` column is empty).
3. **Row order must match.** Row *i* of every vertical Level range must correspond to row *i* of the Data range. Lay the ranges out so they are physically row-aligned.

---

## 4. The two supported patterns

### ✅ Pattern 1 — Time series by combination (the normal case)

Use this for almost everything (demand, patients, revenue, share over time…).

```
Data range     = R rows  ×  T columns      (combinations × timeline)
Timeline range = 1 row   ×  T columns
Vertical levels= R rows each (the ones that vary by combination)
Other levels   = literal or single-cell (broadcast to all R rows)
```

**Worked example — `Demand Vials`:**

| Field | Value | Shape |
|-------|-------|-------|
| Data (range) | `='Dosage and Revenue'!DX921:OM922` | 2 rows × ~276 cols |
| Timeline (range) | `='Output Dump'!H14:JW14` | 1 × 276 |
| Level 6 – Patient Segment | `='Dosage and Revenue'!D125:D126` | **2 rows** (the 2 combos) |
| Level 4 – Lines of Therapy | `='Dosage and Revenue'!D899` | single cell → repeated |
| Level 5 – Class | `=Control!B753` | single cell → repeated |
| Levels 1,2,3,7,10–15 | `US`, `FL`, `ALL`, … | literals → repeated |

Result: **2 combinations × 276 timeline points = 552 rows.** Every single-cell
and literal level is automatically repeated down all 552 rows.

### ✅ Pattern 2 — Single snapshot across a horizontal axis (no combinations)

Use this when the Data is a **single horizontal row** and each column is a
separate item (e.g. a list of events). Here — and **only** here — you may use
**horizontal (wide) ranges** as level labels.

```
Data range = 1 row × N columns
Levels that vary across the axis = 1 row × N columns (wide)
Other levels = literal or single-cell
Timeline = blank, or 1 × N if the axis is time
```

**Worked example — `Event Assumptions / Event Name`:**

| Field | Value | Shape |
|-------|-------|-------|
| Data (range) | `='ACE (Base)'!G59:Z59` | **1 × 20** |
| Level 13 – Event/Curves Names | `='ACE (Base)'!G59:Z59` | 1 × 20 (wide) |
| Level 14 – Yes/No Switch | `='ACE (Base)'!G62:Z62` | 1 × 20 (wide) |
| Level 4 – Lines of Therapy | `=Control!B738` | single cell |
| Others | `US`, `FL`, `ALL` | literals |

Result: the 20 columns transpose into **20 output rows**, one per event.

---

## 5. ⛔ Pattern 3 — The UNSUPPORTED case (this is the bug you hit)

**Do NOT mix vertical multi-row ranges AND horizontal multi-column ranges in the same metric.**

That describes a **2-D matrix** (rows = one dimension, columns = another
dimension, both with their own labels). The generator supports only **one**
expansion dimension, so it cannot do this. It will flatten the wide ranges into
extra rows, they won't line up with the Data rows, and you get **blank levels
and misaligned values**.

**Broken example — `Event Assumptions / Peak Share`:**

| Field | Value | Shape | Problem |
|-------|-------|-------|---------|
| Data (range) | `='ACE (Base)'!G64:Z79` | **16 rows × 20 cols** | 2-D matrix |
| Level 5 / 8 / 9 | `Control!F38:F53`, `E64:E79`, `D38:D53` | 16 rows (vertical) | row dimension |
| Level 13 / 14 | `G59:Z59`, `G62:Z62` | 1 × 20 (wide) | column dimension |

The tool builds 16 rows from the vertical levels, then the wide Level 13 forces
**20** rows → 20 ≠ 16 → rows 17–20 get blank Class/Regimen/Product and the
values shift. **This is an input problem, not a code bug.**

### How to fix a Pattern 3 metric → convert it to Pattern 1

Pre-expand the matrix into a single list of combinations in a helper area of the
workbook, then point the DataModel at that list.

If you have **16 combos × 20 events = 320 rows**:

1. Build a helper block with **320 rows**. Each row holds one full combination:
   `Class_i, Regimen_i, Product_i, EventName_j, Switch_j` for every (i, j) pair.
2. Put the 320 share values into a **320 × 1** column (flattened in the same order).
3. Fill the DataModel row like this:

   | Field | Value |
   |-------|-------|
   | Data (range) | helper `Values` column — **320 × 1** |
   | Level 5 – Class | helper `Class` column — 320 rows |
   | Level 8 – Regimen | helper `Regimen` column — 320 rows |
   | Level 9 – Product | helper `Product` column — 320 rows |
   | Level 13 – Event Name | helper `EventName` column — 320 rows |
   | Level 14 – Switch | helper `Switch` column — 320 rows |
   | Timeline | blank (or 320 × 1 if each row has a date) |

Now there is exactly **one** dimension (320 rows), everything is row-aligned, and
it generates correctly.

> **Important — the tool does NOT compute a cross product.** It pairs row *i* of
> each vertical range with row *i* of the Data range (element-wise). If two
> dimensions should be crossed (e.g. 16 × 20), **you** must lay out all 320
> pre-crossed rows yourself.

---

## 6. Pre-flight checklist (run before generating the Flat File)

For **every** metric row:

- [ ] **Input/Outputs** is set. Use `Outputs` for anything you want exported (`Inputs` are skipped).
- [ ] **All 15 level cells are filled.** No blanks anywhere — use `ALL` where a level doesn't apply.
- [ ] Count Data range **rows** = `R`. **Every** vertical level range has exactly `R` rows.
- [ ] Count Data range **columns** = `T`. Timeline range is `1 × T`, or blank.
- [ ] The metric does **not** mix vertical multi-row ranges with horizontal multi-column ranges (that's Pattern 3 — pre-expand it).
- [ ] Horizontal (wide) level ranges are used **only** when the Data range is a single row (Pattern 2).
- [ ] All vertical ranges and the Data range are **physically row-aligned** (row *i* everywhere means the same combination).
- [ ] References resolve (named range exists, or the `='Sheet'!A1:B2` address is valid). Sheet names with spaces must be quoted: `='Dosage and Revenue'!A1`.

---

## 7. Troubleshooting — symptom → cause

| Symptom in the Flat File | Likely cause |
|--------------------------|--------------|
| A single-cell level is filled in the first block but **blank in later blocks** | (Fixed in code.) If it recurs, a vertical range row count doesn't match the Data range rows. |
| **Blank Class / Regimen / Product** in the last few rows of a metric, values look shifted | Pattern 3 — the metric mixes vertical + wide ranges. Pre-expand it (Section 5). |
| Level values **shifted one column over** | A level cell was left **blank**. Fill every level with `ALL`. |
| Whole metric **missing** from output | `Input/Outputs` is set to `Inputs`, or all levels are blank. |
| `timeline` column blank when you expected dates | Timeline (range) cell is empty, or its column count doesn't match the Data columns. |
| Values export as scientific notation text | (Handled in code — numbers are coerced automatically.) |

---

## 8. Quick mental model

```
              ┌─────────────────────────────────────────────┐
              │  Data range  =  R rows  ×  T columns          │
              │                                               │
   R rows  ───┤  each ROW    → one combination (a Flat File   │
 (combos)     │                 block of T timeline rows)     │
              │  each COLUMN → one timeline point             │
              └─────────────────────────────────────────────┘
                     ▲                         ▲
                     │                         │
        Vertical level ranges          Timeline range
        (R rows, one per combo)        (1 × T)

   Single-cell & literal levels → copied onto every output row.
   Wide (1×N) level ranges → ONLY when the Data range is a single row.
```

Keep every metric to **one** expansion dimension and everything row-aligned, and
the Flat File will always be correct.
