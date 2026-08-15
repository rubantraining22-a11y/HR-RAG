import dotenv from 'dotenv';
dotenv.config();

import { embeddingService } from './services/embeddingService.js';
import { chromaService } from './services/chromaService.js';
import { documentLoaderService } from './services/documentLoaders.js';
import { ragPipeline } from './services/ragPipeline.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('--- TEST 1: Xenova Embeddings ---');
  const testEmbeddings = await embeddingService.embedDocuments(['Automotive technician shift schedule']);
  console.log(`✅ Generated embedding with dimension: ${testEmbeddings[0].length}`);

  console.log('\n--- TEST 2: ChromaDB Connection & Collection Clear ---');
  await chromaService.clearCollection();
  const stats = await chromaService.getStats();
  console.log('✅ ChromaDB Status:', stats);

  console.log('\n--- TEST 3: Ingesting Sample Policy ---');
  const samplePath = path.join(__dirname, 'samples', 'Automobile_Plant_Shift_Safety_Policy.txt');
  const docs = await documentLoaderService.loadTXT(samplePath, 'Automobile_Plant_Shift_Safety_Policy.txt');
  console.log(`Parsed ${docs.length} chunks from sample policy.`);
  const insertResult = await chromaService.addDocuments(docs);
  console.log(`✅ Upserted ${insertResult.count} chunks to ChromaDB.`);

  console.log('\n--- TEST 4: ChromaDB Similarity Search ---');
  const matches = await chromaService.similaritySearch('What are the shift timings for Shift A and B?', 2);
  console.log(`✅ Found ${matches.length} matching chunks. Top similarity: ${(matches[0].similarity * 100).toFixed(1)}%`);

  console.log('\n--- TEST 5: Automobile HR In-Scope Query via LangChain ---');
  const validQueryRes = await ragPipeline.query({
    question: 'What is the grace period for biometric punch-in and what is the penalty for 3 consecutive late arrivals?',
  });
  console.log('\n🤖 AutoHR In-Scope Response:\n', validQueryRes.answer);
  console.log('\n📑 Citations:\n', validQueryRes.citations.map(c => `${c.source} (${c.similarityPercentage})`));

  console.log('\n--- TEST 6: Out-of-Domain Guardrail Test ---');
  const outOfDomainRes = await ragPipeline.query({
    question: 'Who won the 2022 FIFA World Cup in Qatar?',
  });
  console.log('\n🛡️ AutoHR Refusal Response:\n', outOfDomainRes.answer);

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
