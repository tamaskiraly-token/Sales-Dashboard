# Sales Dashboard – Data Structures Reference

Use these shapes to convert your data so it plugs into the dashboard. All monetary values are in **whole units** (e.g. $1,000 = `1000`). Segment values should match `SEGMENT_OPTIONS` if you use the segment filter.

**Segment options (for filter compatibility):**  
`Bank & Bank Tech` | `Fintechs` | `Gateways` | `Large Merchants` | `HVHM`

---

## 1. Overview tab

### 1.1 KPI cards (top row)

**Type:** `SalesKPIs`  
**Used by:** `OverviewKPICards`

```ts
interface SalesKPIs {
  forecastARR: number;           // $
  pipelineValue: number;         // $
  closedWon: number;             // count
  winRate: number;               // percentage (e.g. 34 for 34%)
  forecastARRDelta?: number;     // % change
  pipelineValueDelta?: number;   // % change
  closedWonDelta?: number;      // count change
  winRateDelta?: number;        // percentage point change
  // Optional: annual targets for "Cumulative Actual/Forecast vs Target" chart
  annualARRTarget?: number;      // $
  annualACVTarget?: number;     // $
  annualInYearRevenueTarget?: number;  // $
  annualClientWinsTarget?: number;     // count
}
```

**Example:**
```json
{
  "forecastARR": 2840000,
  "pipelineValue": 1920000,
  "closedWon": 12,
  "winRate": 34,
  "forecastARRDelta": 4.2,
  "pipelineValueDelta": -2.1,
  "closedWonDelta": 1,
  "winRateDelta": 2.5
}
```

---

### 1.2 Forecast over time (line chart)

**Type:** `ForecastPoint[]`  
**Used by:** `ForecastLineChart`

```ts
interface ForecastPoint {
  month: string;    // e.g. "Jul", "Aug", "Jan"
  forecast: number; // $
  target: number;   // $
}
```

**Example:**
```json
[
  { "month": "Jul", "forecast": 2100000, "target": 2400000 },
  { "month": "Aug", "forecast": 2210000, "target": 2448000 },
  { "month": "Sep", "forecast": 2350000, "target": 2496960 }
]
```

**With segment (for filtering):** use `ForecastPointBySegment[]` and aggregate by month before passing to the chart.

```ts
interface ForecastPointBySegment {
  month: string;
  segment: string;  // one of SEGMENT_OPTIONS
  forecast: number;
  target: number;
}
```

---

### 1.3 Pipeline by stage (bar chart)

**Type:** `PipelineStage[]`  
**Used by:** `PipelineBarChart`

```ts
interface PipelineStage {
  name: string;   // stage label, e.g. "Qualification", "Discovery"
  value: number; // $ total in that stage
  count: number; // number of deals
}
```

**Example:**
```json
[
  { "name": "Qualification", "value": 420000, "count": 18 },
  { "name": "Discovery", "value": 380000, "count": 12 },
  { "name": "Proposal", "value": 520000, "count": 8 },
  { "name": "Negotiation", "value": 350000, "count": 5 },
  { "name": "Closed Won", "value": 250000, "count": 4 }
]
```

---

### 1.4 Deal distribution (donut chart)

**Type:** `DealSegment[]`  
**Used by:** `DealDonutChart`

```ts
interface DealSegment {
  name: string;   // segment name (one of SEGMENT_OPTIONS)
  value: number;  // percentage share (0–100, should sum to 100)
  fill: string;   // CSS color, e.g. "#1e1b4b" or "var(--sales-primary)"
}
```

**Example:**
```json
[
  { "name": "Bank & Bank Tech", "value": 28, "fill": "#1e1b4b" },
  { "name": "Fintechs", "value": 24, "fill": "#3730a3" },
  { "name": "Gateways", "value": 18, "fill": "#0ea5e9" },
  { "name": "Large Merchants", "value": 18, "fill": "#38bdf8" },
  { "name": "HVHM", "value": 12, "fill": "#7dd3fc" }
]
```

---

## 2. Forecast tab

### 2.1 Stacked ARR per month (bar chart + modal)

**Chart type:** `ARRByMonthPoint[]`  
**Modal detail type:** `Record<string, ARRMonthDetail>` (key = month name, e.g. `"Jan"`)

```ts
interface ARRByMonthPoint {
  month: string;        // "Jan", "Feb", … "Dec"
  license: number;      // $
  minimum: number;      // $
  volumeDriven: number; // $
}

interface ARRMonthDetail {
  license: ARRLicenseItem[];
  minimum: ARRMinimumItem[];
  volumeDriven: ARRVolumeDrivenItem[];
}

interface ARRLicenseItem {
  clientName: string;
  amount: number;
  segment: string;
}

interface ARRMinimumItem {
  clientName: string;
  amount: number;
  segment: string;
}

interface ARRVolumeDrivenItem {
  clientName: string;
  transactions: number;
  pricePoint: number;   // $ per transaction
  amount: number;      // transactions × pricePoint
  segment: string;
}
```

**Chart example:**
```json
[
  { "month": "Jan", "license": 180000, "minimum": 80000, "volumeDriven": 45000 },
  { "month": "Feb", "license": 195000, "minimum": 72000, "volumeDriven": 52000 }
]
```

**Detail example (for one month, e.g. `detailsByMonth["Jan"]`):**
```json
{
  "license": [
    { "clientName": "Acme Corp", "amount": 90000, "segment": "Bank & Bank Tech" },
    { "clientName": "Beta Inc", "amount": 90000, "segment": "Fintechs" }
  ],
  "minimum": [
    { "clientName": "Gamma Ltd", "amount": 40000, "segment": "Gateways" },
    { "clientName": "Delta Solutions", "amount": 40000, "segment": "Large Merchants" }
  ],
  "volumeDriven": [
    {
      "clientName": "Epsilon Group",
      "transactions": 1200,
      "pricePoint": 25,
      "amount": 30000,
      "segment": "HVHM"
    }
  ]
}
```

Sums of `license`, `minimum`, and `volumeDriven` in the detail should equal the chart totals for that month.

---

## 3. Pipeline tab

### 3.1 Pipeline deals (source for ACV chart and modal)

**Type:** `PipelineDeal[]`  
**Used to derive:** `ACVByMonth[]` and `Record<string, PipelineDeal[]>` (deals by month key)

```ts
interface PipelineDeal {
  id: string;
  name: string;
  acv: number;           // $
  closeDate: string;     // "YYYY-MM", e.g. "2026-03"
  stage?: string;        // e.g. "Proposal", "Negotiation", "Closed Won"
  segment: string;       // one of SEGMENT_OPTIONS
}
```

**Example:**
```json
[
  {
    "id": "deal-1",
    "name": "Acme Corp – Platform",
    "acv": 120000,
    "closeDate": "2026-01",
    "stage": "Negotiation",
    "segment": "Bank & Bank Tech"
  },
  {
    "id": "deal-2",
    "name": "Beta Inc – Enterprise",
    "acv": 85000,
    "closeDate": "2026-02",
    "segment": "Fintechs"
  }
]
```

---

### 3.2 ACV by month (bar chart)

**Type:** `ACVByMonth[]`  
**Produced from:** `PipelineDeal[]` (e.g. via `getACVByMonth2026(deals)`)

```ts
interface ACVByMonth {
  month: string;    // display label, e.g. "Jan 2026"
  monthKey: string; // "YYYY-MM", e.g. "2026-01"
  totalACV: number; // $ sum of deal ACVs closing that month
}
```

**Example:**
```json
[
  { "month": "Jan 2026", "monthKey": "2026-01", "totalACV": 320000 },
  { "month": "Feb 2026", "monthKey": "2026-02", "totalACV": 185000 }
]
```

---

### 3.3 Client wins over time (line chart)

**Type:** `ClientWinsPoint[]`  
**Used by:** `ClientWinsLineChart`

```ts
interface ClientWinsPoint {
  period: string; // e.g. "Jan 2026", "Feb 2026"
  wins: number;   // count of closed-won in that period
}
```

**Example:**
```json
[
  { "period": "Jan 2026", "wins": 3 },
  { "period": "Feb 2026", "wins": 5 },
  { "period": "Mar 2026", "wins": 2 }
]
```

---

## 4. Accounts tab (table)

**Type:** `ClientDeal[]`

```ts
interface ClientDeal {
  id: string;
  dealName: string;
  closeDate: string;    // "YYYY-MM-DD"
  segment: string;      // one of SEGMENT_OPTIONS
  acv: number;          // $
  estimatedTransactionsPerMonth: number;
  dealOwner: string;
}
```

**Example:**
```json
[
  {
    "id": "client-deal-1",
    "dealName": "Acme Corp – Platform",
    "closeDate": "2025-03-15",
    "segment": "Bank & Bank Tech",
    "acv": 120000,
    "estimatedTransactionsPerMonth": 15000,
    "dealOwner": "Alex Morgan"
  }
]
```

---

## 5. Quarter tabs (2026 Q1–Q4)

**Type:** `QuarterDeal[]` (per quarter)

```ts
type QuarterId = '2026Q1' | '2026Q2' | '2026Q3' | '2026Q4';

interface QuarterDeal {
  id: string;
  clientName: string;
  dealName: string;
  closeDate: string;   // "YYYY-MM-DD"
  segment: string;      // one of SEGMENT_OPTIONS
  acv: number;
  arrForecast: number;
  annualizedTransactionForecast: number;
  dealOwner: string;
  targetAccount: boolean;
  latestNextSteps: string;
  confidenceQuarterClose: number; // 0–100
}
```

**Example:**
```json
[
  {
    "id": "quarter-deal-2026Q1-1",
    "clientName": "Acme Corp",
    "dealName": "Acme Corp – Platform",
    "closeDate": "2026-02-14",
    "segment": "Fintechs",
    "acv": 180000,
    "arrForecast": 165000,
    "annualizedTransactionForecast": 120000,
    "dealOwner": "Jordan Smith",
    "targetAccount": true,
    "latestNextSteps": "Follow-up call scheduled for next week.",
    "confidenceQuarterClose": 85
  }
]
```

---

### 5.1 Quarter targets (optional sheet)

**Type:** one row per quarter  
**Used by:** Quarter tab – target bar in the waterfall chart.

```ts
// Sheet name: QuarterTargets
// Columns: quarter, clientWins, acv, inYearRevenue
{ quarter: '2026Q1', clientWins: 10, acv: 600000, inYearRevenue: 550000 }
{ quarter: '2026Q2', clientWins: 12, acv: 720000, inYearRevenue: 660000 }
{ quarter: '2026Q3', clientWins: 14, acv: 840000, inYearRevenue: 770000 }
{ quarter: '2026Q4', clientWins: 16, acv: 960000, inYearRevenue: 880000 }
```

If you don’t use a QuarterTargets sheet, the dashboard uses built-in default targets. Set the sheet’s GID in `googleSheetsConfig.sheetGids.QuarterTargets` to use your own.

---

### 5.2 Cumulative chart from sheet (optional)

**Sheet name:** `CumulativeChartData`  
**Used by:** Overview – "Cumulative Actual/Forecast vs Target" chart when you want **per-month** Actual, Forecast, and **non-linear Target** from a grid.

**Layout:** Columns = `metric`, `type`, `Jan`, `Feb`, … `Dec`. One row per (metric × type). Values are **cumulative to end of that month**.

- **metric:** `ACV` | `In-year rev` or `In-year revenue` | `ARR` or `ARR target` | `Client wins`
- **type:** `Actual` | `Forecast` | `Target`
- **Jan … Dec:** numbers (cumulative for that month)

**Example (ACV – non-linear target ramp):**

| metric | type    | Jan   | Feb   | Mar   | … | Dec    |
|--------|---------|-------|-------|-------|---|--------|
| ACV    | Actual  | 100000| 250000| 400000| … |        |
| ACV    | Forecast| 100000| 250000| 400000| … | 2400000|
| ACV    | Target  | 200000| 450000| 750000| … | 3200000|

If you don't use this sheet (or leave its GID empty), the chart uses deal-derived Actual/Forecast and a **linear** target from SalesKPIs annual targets. Set `googleSheetsConfig.sheetGids.CumulativeChartData` to the sheet's GID to use your grid.

---

### 5.3 Quarter metric input (optional – metric × status grid with carry-over and filters)

**Sheet name:** `QuarterMetricInput`  
**Used by:** Quarter tabs – input data in a grid format (metric × status × months), with **carry-over from Q2 onwards** and **segment** / **deal_owner** columns so you can filter the quarter view by segment and deal owner.

**Columns:**

| Column | Description |
|--------|-------------|
| quarter | `2026Q1` \| `2026Q2` \| `2026Q3` \| `2026Q4` |
| metric | `Client wins` \| `ACV signed` \| `In-year revenue` |
| status | `Forecasted` \| `Signed` \| `Target` |
| segment | Optional. Leave **blank** for rollup (all segments); use e.g. `Bank & Bank Tech` to filter. |
| deal_owner | Optional. Leave **blank** for all owners; use e.g. `Alex Morgan` to filter. |
| carry_over | For **Q1**: use `0`. For **Q2+**: value carried from previous quarter(s). |
| month1, month2, month3 | Q1: Jan, Feb, Mar. Q2: Apr, May, Jun. Q3: Jul, Aug, Sep. Q4: Oct, Nov, Dec. |
| total_projected | Total projected for the quarter (e.g. month1 + month2 + month3 + carry_over for forecast). |
| quarter_target | Target for that quarter (e.g. Q1 Target, Q2 Target). |

**Example (Q1 – no carry-over):**

| quarter | metric | status | segment | deal_owner | carry_over | month1 | month2 | month3 | total_projected | quarter_target |
|---------|--------|--------|---------|------------|------------|--------|--------|--------|-----------------|----------------|
| 2026Q1 | Client wins | Forecasted | | | 0 | 2 | 3 | 4 | 9 | 10 |
| 2026Q1 | ACV signed | Signed | | | 0 | 80000 | 100000 | 50000 | 230000 | 600000 |

**Example (Q2 – with carry-over):**

| quarter | metric | status | segment | deal_owner | carry_over | month1 | month2 | month3 | total_projected | quarter_target |
|---------|--------|--------|---------|------------|------------|--------|--------|--------|-----------------|----------------|
| 2026Q2 | ACV signed | Forecasted | | | 230000 | 150000 | 200000 | 170000 | 750000 | 720000 |

Use one row per (quarter, metric, status). Add extra rows with **segment** and/or **deal_owner** filled to support filtering by segment and deal owner in the Quarter tab. The dashboard will use this sheet when its GID is set in config (and when the app is wired to read it).

---

## Quick reference: where to plug in your data

| Tab / chart              | Data type(s)              | File / function to replace or feed |
|--------------------------|---------------------------|-------------------------------------|
| Overview – KPIs          | `SalesKPIs`               | `getSalesKPIs()`                    |
| Overview – Forecast line | `ForecastPoint[]`         | `getForecastOverTime()`             |
| Overview – Pipeline bar  | `PipelineStage[]`         | `getPipelineByStage()`              |
| Overview – Donut         | `DealSegment[]`           | `getDealDistribution()`             |
| Forecast – Stacked ARR   | `ARRByMonthPoint[]` + details | `getForecastARRWithDetails()`  |
| Pipeline – ACV bars      | `PipelineDeal[]` → `ACVByMonth[]` | `getPipelineDeals2026()`, `getACVByMonth2026()` |
| Pipeline – Client wins   | `ClientWinsPoint[]`        | `getClientWinsOverTime()`           |
| Accounts – Table         | `ClientDeal[]`            | `getClientDeals()`                  |
| Quarter – Table + chart  | `QuarterDeal[]`           | `getDealsByQuarter(quarter)`        |
| Overview – Cumulative vs target | `SalesKPIs` annual* columns | `getAnnualTargets()` (from SalesKPIs or defaults) |
| Quarter – Target bar    | `QuarterTargets` sheet   | `getQuarterTargets(quarter)`        |
| Overview – Cumulative vs target (from sheet) | `CumulativeChartData` sheet | `getCumulativeChartData(metric)` (metric = acv, inYearRevenue, arrTarget, clientWins) |
| Quarter – metric × status input (optional) | `QuarterMetricInput` sheet | quarter, metric, status, segment, deal_owner, carry_over, month1–3, total_projected, quarter_target |

\* SalesKPIs optional columns: `annualARRTarget`, `annualACVTarget`, `annualInYearRevenueTarget`, `annualClientWinsTarget`.

All of these are in `src/data/salesMockData.ts` or loaded from Google Sheets. You can replace the mock functions with your own data loaders (e.g. API calls) that return the same shapes above.
