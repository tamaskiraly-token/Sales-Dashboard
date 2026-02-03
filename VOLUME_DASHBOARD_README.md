# Total Volume Dashboard

A React-based dashboard for visualizing and analyzing total volume data with advanced filtering capabilities.

## Features

- **Interactive Line Chart**: Visualize total volume over time using Recharts
- **Advanced Filtering**: Filter data by multiple dimensions:
  - Client
  - Regulatory Type
  - Transaction Type
  - Merchant
  - Merchant Jurisdiction
  - Merchant Industry
  - Use Case
  - TPP (Third Party Provider)
  - Currency
  - Source Bank Jurisdiction
  - Transaction Category
  - Transaction Sub Type
- **Summary Statistics**: View key metrics including:
  - Total Volume
  - Total Transactions
  - Average Volume
  - Date Range
- **Real-time Updates**: Charts and statistics update automatically as you apply filters

## Getting Started

### 1. Parse Your Excel File

The dashboard includes a script to convert your Excel file to JSON format:

```bash
npm run parse-excel
```

This will:
- Read the Excel file from `C:\Users\TamasKiraly\OneDrive - Token.io Limited\Desktop\Total Volume.xlsx`
- Convert it to JSON format
- Save it to `src/data/volumeData.json`

### 2. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at [http://localhost:5173/](http://localhost:5173/)

### 3. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## How to Use the Dashboard

### Applying Filters

1. Scroll to the **Filters** section at the top of the dashboard
2. Each dropdown allows multi-select:
   - **Windows**: Hold `Ctrl` and click to select multiple options
   - **Mac**: Hold `Cmd` and click to select multiple options
3. The chart and statistics update automatically as you select filters
4. Click **Clear All Filters** to reset all filters

### Reading the Chart

- **X-Axis**: Transaction dates (YYYY-MM format)
- **Y-Axis**: Total volume (formatted with K for thousands, M for millions)
- **Hover**: Hover over data points to see exact values
- **Interactive**: The chart is fully interactive and responsive

### Understanding the Statistics

The dashboard displays four key metrics:

1. **Total Volume**: Sum of all transaction volumes in the filtered dataset
2. **Total Transactions**: Number of transactions in the filtered dataset
3. **Average Volume**: Average volume per transaction
4. **Date Range**: Date range of the filtered dataset

## Data Structure

The dashboard expects data with the following fields:

- `client`: Client identifier
- `regulatoryType`: Type of regulation (e.g., Type I)
- `transactionType`: Type of transaction (e.g., PIS - Payment Initiation)
- `merchant`: Merchant name
- `merchantJurisdiction`: Merchant's jurisdiction code
- `merchantIndustry`: Industry category
- `useCase`: Use case description
- `tpp`: Third party provider name
- `currency`: Currency code (e.g., EUR, USD)
- `sourceBankJurisdiction`: Source bank jurisdiction code
- `transactionCategory`: Transaction category
- `transactionSubType`: Transaction sub-type
- `totalVolume`: Numeric volume value
- `transactionDate`: Date in YYYY-MM format

## Technical Stack

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Recharts**: Charting library for data visualization
- **Vite**: Fast build tool and development server
- **XLSX**: Excel file parsing

## Known Issues

### OneDrive Permission Errors

If you encounter EPERM errors during `npm install`, this is due to OneDrive file locking on Windows. Solutions:

1. **Pause OneDrive sync** temporarily:
   - Right-click OneDrive icon in system tray
   - Click "Pause syncing"
   - Run `npm install`
   - Resume syncing

2. **Move project outside OneDrive**:
   - Copy the folder to a non-OneDrive location (e.g., `C:\Projects\`)
   - Update the Excel file path in `scripts/parseExcel.js`

3. **Run as Administrator**:
   - Open PowerShell or Command Prompt as Administrator
   - Navigate to the project folder
   - Run `npm install`

## Project Structure

```
src/
├── components/
│   ├── VolumeChart.tsx          # Line chart component
│   ├── VolumeFilters.tsx        # Multi-select filter component
│   └── VolumeSummary.tsx        # Summary statistics cards
├── data/
│   ├── processVolumeData.ts     # Data processing utilities
│   └── volumeData.json          # Generated from Excel file
├── VolumeApp.tsx                # Main dashboard component
└── main.tsx                     # Application entry point
scripts/
└── parseExcel.js                # Excel to JSON converter
```

## Customization

### Update Excel File Path

Edit `scripts/parseExcel.js` and change the `excelFilePath` variable:

```javascript
const excelFilePath = 'YOUR_PATH_HERE';
```

### Modify Chart Colors

Edit `src/components/VolumeChart.tsx` and update the `stroke` prop in the `<Line>` component:

```typescript
<Line stroke="#3b82f6" // Change this color
```

### Add More Filters

1. Add the new field to `FilterState` interface in `src/components/VolumeFilters.tsx`
2. Add it to the `filterConfig` array
3. Update `src/data/processVolumeData.ts` to include the new field

## Support

For issues or questions, please refer to the main project README or contact your development team.

## Data Privacy

This dashboard processes data client-side. No data is sent to external servers. All filtering and aggregation happens in your browser.
