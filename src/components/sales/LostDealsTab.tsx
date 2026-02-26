import { useMemo } from 'react';
import { useSalesData } from '../../contexts/SalesDataContext';

const normalizeHeaderKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]+/g, '');

function parseConfidence(raw: string): number {
  const s = String(raw ?? '').trim().replace(/%/g, '');
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? (n <= 1 ? n * 100 : n) : 0;
}

type LostDealRow = {
  source: 'Q1' | 'Q2';
  dealName: string;
  segment: string;
  dealOwner: string;
  acv: string;
  reasonForLost: string;
};

function filterDataRows<T extends Record<string, string>>(
  table: T[],
  allColumns: string[]
): T[] {
  const subHeaderPatterns = ['y/n', 'yes/no', 'latest', 'next steps', 'steps', 'header', 'sub-header', 'subheader'];
  return table.filter((row) => {
    const matchingColumns = allColumns.filter((col) => {
      const rowValue = (row[col] ?? '').toLowerCase().trim();
      const colName = col.toLowerCase().trim();
      return rowValue === colName || rowValue === colName.replace(/_/g, ' ');
    });
    if (matchingColumns.length > allColumns.length * 0.5) return false;
    const rowValues = allColumns.map((col) => (row[col] ?? '').toLowerCase().trim()).join(' ');
    const hasSubHeaderPattern = subHeaderPatterns.some((p) => rowValues.includes(p));
    if (hasSubHeaderPattern) {
      const numericValues = allColumns.filter((col) => {
        const v = (row[col] ?? '').trim();
        return v !== '' && !Number.isNaN(Number(v.replace(/[,$%]/g, '')));
      });
      if (numericValues.length < allColumns.length * 0.2) return false;
    }
    return true;
  });
}

export function LostDealsTab() {
  const { getQ1DetailsTable, getQ2DetailsTable } = useSalesData();
  const q1Table = useMemo(() => getQ1DetailsTable(), [getQ1DetailsTable]);
  const q2Table = useMemo(() => getQ2DetailsTable(), [getQ2DetailsTable]);

  const lostDeals = useMemo((): LostDealRow[] => {
    const rows: LostDealRow[] = [];

    if (q1Table && q1Table.length > 0) {
      const allColumns = Object.keys(q1Table[0]);
      const dataRows = filterDataRows(q1Table, allColumns);
      const confidenceCol = allColumns.find((col) => normalizeHeaderKey(col) === 'confidenceq1close');
      const dealNameCol = allColumns.find((col) => normalizeHeaderKey(col) === 'q1pipeline')
        ?? allColumns.find((col) => normalizeHeaderKey(col) === 'dealname')
        ?? allColumns.find((col) => { const n = normalizeHeaderKey(col); return n.includes('deal') && n.includes('name'); });
      const segmentCol = allColumns.find((col) => normalizeHeaderKey(col) === 'segment');
      const dealOwnerCol = allColumns.find((col) => { const n = normalizeHeaderKey(col); return n === 'dealowner' || (n.includes('deal') && n.includes('owner')); });
      const acvCol = allColumns.find((col) => normalizeHeaderKey(col) === 'acv');
      const latestNextStepsCol = allColumns.find((col) => {
        const n = col.toLowerCase().replace(/[\s_\/]+/g, '');
        return (n.includes('latest') && (n.includes('nextstep') || n.includes('nextsteps'))) || n === 'latestnextsteps';
      });

      if (confidenceCol) {
        for (const row of dataRows) {
          const conf = parseConfidence(String(row[confidenceCol] ?? ''));
          if (conf === 0) {
            rows.push({
              source: 'Q1',
              dealName: (dealNameCol ? (row[dealNameCol] ?? '') : '').trim() || '—',
              segment: (segmentCol ? (row[segmentCol] ?? '') : '').trim(),
              dealOwner: (dealOwnerCol ? (row[dealOwnerCol] ?? '') : '').trim(),
              acv: (acvCol ? (row[acvCol] ?? '') : '').trim(),
              reasonForLost: (latestNextStepsCol ? (row[latestNextStepsCol] ?? '') : '').trim() || '—',
            });
          }
        }
      }
    }

    if (q2Table && q2Table.length > 0) {
      const allColumns = Object.keys(q2Table[0]);
      const dataRows = filterDataRows(q2Table, allColumns);
      const confidenceCol = allColumns.find((col) => normalizeHeaderKey(col) === 'confidenceq2close');
      const dealNameCol = allColumns.find((col) => normalizeHeaderKey(col) === 'q1pipeline')
        ?? allColumns.find((col) => { const n = normalizeHeaderKey(col); return n === 'q2pipeline' || (n.includes('q2') && n.includes('pipeline')); })
        ?? allColumns.find((col) => normalizeHeaderKey(col) === 'dealname')
        ?? allColumns.find((col) => { const n = normalizeHeaderKey(col); return n.includes('deal') && n.includes('name'); });
      const segmentCol = allColumns.find((col) => normalizeHeaderKey(col) === 'segment');
      const dealOwnerCol = allColumns.find((col) => { const n = normalizeHeaderKey(col); return n === 'dealowner' || (n.includes('deal') && n.includes('owner')); });
      const acvCol = allColumns.find((col) => normalizeHeaderKey(col) === 'acv');
      const latestNextStepsCol = allColumns.find((col) => {
        const n = col.toLowerCase().replace(/[\s_\/]+/g, '');
        return (n.includes('latest') && (n.includes('nextstep') || n.includes('nextsteps'))) || n === 'latestnextsteps';
      });

      if (confidenceCol) {
        for (const row of dataRows) {
          const conf = parseConfidence(String(row[confidenceCol] ?? ''));
          if (conf === 0) {
            rows.push({
              source: 'Q2',
              dealName: (dealNameCol ? (row[dealNameCol] ?? '') : '').trim() || '—',
              segment: (segmentCol ? (row[segmentCol] ?? '') : '').trim(),
              dealOwner: (dealOwnerCol ? (row[dealOwnerCol] ?? '') : '').trim(),
              acv: (acvCol ? (row[acvCol] ?? '') : '').trim(),
              reasonForLost: (latestNextStepsCol ? (row[latestNextStepsCol] ?? '') : '').trim() || '—',
            });
          }
        }
      }
    }

    return rows;
  }, [q1Table, q2Table]);

  return (
    <div className="sales-tab-content sales-lost-deals-tab">
      <div className="sales-chart-card">
        <h2 className="sales-chart-title">Lost Deals (0% confidence)</h2>
        <p className="sales-chart-subtitle">
          Deals marked with 0% confidence close are considered lost. Reasons are from the Latest / Next Steps column.
        </p>
        {lostDeals.length === 0 ? (
          <p className="sales-lost-deals-empty">No lost deals (no rows with 0% confidence in Q1 or Q2 details).</p>
        ) : (
          <div className="sales-accounts-table-scroll sales-q1-table-scroll">
            <table className="sales-accounts-table sales-lost-deals-table">
              <thead>
                <tr>
                  <th className="sales-q1-details-th">Deal Name</th>
                  <th className="sales-q1-details-th">Source</th>
                  <th className="sales-q1-details-th">Segment</th>
                  <th className="sales-q1-details-th">Deal Owner</th>
                  <th className="sales-q1-details-th">ACV</th>
                  <th className="sales-q1-details-th">Reason for lost</th>
                </tr>
              </thead>
              <tbody>
                {lostDeals.map((row, i) => (
                  <tr key={`${row.source}-${i}-${row.dealName}`} className="sales-details-row-lost">
                    <td className="sales-q1-details-td">{row.dealName}</td>
                    <td className="sales-q1-details-td">{row.source}</td>
                    <td className="sales-q1-details-td">{row.segment}</td>
                    <td className="sales-q1-details-td">{row.dealOwner}</td>
                    <td className="sales-q1-details-td">{row.acv}</td>
                    <td className="sales-q1-details-td" style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{row.reasonForLost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
