import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Excel file
const excelFilePath = 'C:\\Users\\TamasKiraly\\OneDrive - Token.io Limited\\Desktop\\Total Volume.xlsx';

try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Excel file parsed successfully!');
  console.log(`Found ${jsonData.length} rows`);
  console.log('Sample row:', JSON.stringify(jsonData[0], null, 2));
  
  // Save to JSON file
  const outputPath = join(__dirname, '..', 'src', 'data', 'volumeData.json');
  writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
  
  console.log(`Data saved to: ${outputPath}`);
  
  // Print column names
  if (jsonData.length > 0) {
    console.log('\nColumn names:');
    Object.keys(jsonData[0]).forEach(key => console.log(`  - ${key}`));
  }
} catch (error) {
  console.error('Error parsing Excel file:', error);
  process.exit(1);
}
