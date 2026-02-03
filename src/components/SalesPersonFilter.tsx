import { SalesPerson } from '../types';

interface SalesPersonFilterProps {
  salesPeople: SalesPerson[];
  selectedSalesPerson: string | null;
  onSelect: (salesPerson: string | null) => void;
}

export function SalesPersonFilter({ salesPeople, selectedSalesPerson, onSelect }: SalesPersonFilterProps) {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
    }}>
      <label style={{ 
        fontWeight: 'bold', 
        fontSize: '16px',
        color: '#1f2937',
      }}>
        Filter by Sales Person:
      </label>
      <select
        value={selectedSalesPerson || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        style={{
          padding: '10px 15px',
          fontSize: '14px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          backgroundColor: 'white',
          cursor: 'pointer',
          minWidth: '200px',
        }}
      >
        <option value="">All Sales People</option>
        {salesPeople.map((person) => (
          <option key={person.id} value={person.name}>
            {person.name}
          </option>
        ))}
      </select>
      {selectedSalesPerson && (
        <button
          onClick={() => onSelect(null)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ef4444',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Clear Filter
        </button>
      )}
    </div>
  );
}
