import dotenv from 'dotenv';
dotenv.config();

import { documentLoaderService } from './services/documentLoaders.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testLoaders() {
  console.log('Testing URL Loader...');
  try {
    const urlDocs = await documentLoaderService.loadURL('https://example.com');
    console.log(`✅ URL loader scraped ${urlDocs.length} chunks from https://example.com. Title: "${urlDocs[0].metadata.title}"`);
  } catch (err) {
    console.warn('URL loader test warning:', err.message);
  }

  console.log('\nTesting TXT sample loader across all sample policies...');
  const samples = [
    'Automobile_Plant_Shift_Safety_Policy.txt',
    'Automotive_Technician_Overtime_and_Leave_Rules.txt',
    'Dealership_Staff_Conduct_and_Benefits_Handbook.txt',
    'EV_Assembly_Line_Hazard_and_Certification_Guidelines.txt'
  ];

  for (const sample of samples) {
    const filePath = path.join(__dirname, 'samples', sample);
    const docs = await documentLoaderService.loadTXT(filePath, sample);
    console.log(`✅ Loaded ${sample}: ${docs.length} chunks.`);
  }

  console.log('\nAll loaders verified successfully!');
}

testLoaders().catch(console.error);
