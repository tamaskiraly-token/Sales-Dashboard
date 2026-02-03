import { useState } from 'react';
import { DashboardData } from './types';
import { generateMockData } from './data/generateData';
import { SalesPersonFilter } from './components/SalesPersonFilter';
import { KPICards } from './components/KPICards';
import { PipelineDevelopmentChart } from './components/PipelineDevelopmentChart';
import { PipelineSizeChart } from './components/PipelineSizeChart';
import { DealActivityChart } from './components/DealActivityChart';

function App() {
  const [dashboardData] = useState<DashboardData>(generateMockData());
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string | null>(null);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ 
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '10px',
          }}>
            Commercial KPI Dashboard
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#6b7280',
          }}>
            Pipeline Development & Sales Performance Analytics
          </p>
        </header>

        <SalesPersonFilter
          salesPeople={dashboardData.salesPeople}
          selectedSalesPerson={selectedSalesPerson}
          onSelect={setSelectedSalesPerson}
        />

        <KPICards
          data={dashboardData.pipelineData}
          selectedSalesPerson={selectedSalesPerson}
        />

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <PipelineDevelopmentChart
              data={dashboardData.pipelineData}
              selectedSalesPerson={selectedSalesPerson}
            />
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <PipelineSizeChart
              data={dashboardData.pipelineData}
              selectedSalesPerson={selectedSalesPerson}
            />
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <DealActivityChart
            data={dashboardData.pipelineData}
            selectedSalesPerson={selectedSalesPerson}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
