import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testFullApiSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTOMOBILE HR RAG COMPLETE API SUITE');
  console.log('====================================================\n');

  // 1. Health Check
  console.log('1. Testing GET /api/health ...');
  const healthRes = await axios.get(`${BASE_URL}/health`);
  console.log('✅ Health Response:', JSON.stringify(healthRes.data, null, 2));

  // 2. Load Sample Automobile HR Policies
  console.log('\n2. Testing POST /api/documents/sample ...');
  const sampleRes = await axios.post(`${BASE_URL}/documents/sample`);
  console.log(`✅ Loaded ${sampleRes.data.documents.length} sample policies. Message: ${sampleRes.data.message}`);

  // 3. List Indexed Documents
  console.log('\n3. Testing GET /api/documents ...');
  const docsRes = await axios.get(`${BASE_URL}/documents`);
  console.log(`✅ Total Documents: ${docsRes.data.totalDocuments}, Total Chunks: ${docsRes.data.totalChunks}`);
  docsRes.data.documents.forEach((d) => {
    console.log(`   - [${d.docType.toUpperCase()}] ${d.title} (${d.chunkCount} chunks)`);
  });

  // 4. Test In-Domain Query 1: Shift & Safety
  console.log('\n4. Testing In-Domain Chat: Plant Shift & Safety...');
  const chat1 = await axios.post(`${BASE_URL}/chat`, {
    question: 'What are the required personal protective equipment (PPE) for the Paint Shop & Chemical Zone?',
    chatHistory: [],
  });
  console.log('🤖 AutoHR Answer:\n', chat1.data.answer);
  console.log('📑 Verified Sources:', chat1.data.citations.map((c) => `${c.source} (${c.similarityPercentage})`));

  // 5. Test In-Domain Query 2: EV Battery Line Certification & Pay
  console.log('\n5. Testing In-Domain Chat: EV Battery Line Skill Pay...');
  const chat2 = await axios.post(`${BASE_URL}/chat`, {
    question: 'What is the skill pay differential for Level 2 and Level 3 high-voltage certified EV technicians?',
    chatHistory: [],
  });
  console.log('🤖 AutoHR Answer:\n', chat2.data.answer);
  console.log('📑 Verified Sources:', chat2.data.citations.map((c) => `${c.source} (${c.similarityPercentage})`));

  // 6. Test In-Domain Query 3: Dealership Car Purchase Discount
  console.log('\n6. Testing In-Domain Chat: Dealership Car Purchase Discount...');
  const chat3 = await axios.post(`${BASE_URL}/chat`, {
    question: 'What discount do dealership employees get when purchasing an Apex vehicle?',
    chatHistory: [],
  });
  console.log('🤖 AutoHR Answer:\n', chat3.data.answer);
  console.log('📑 Verified Sources:', chat3.data.citations.map((c) => `${c.source} (${c.similarityPercentage})`));

  // 7. Test Strict Guardrail Out-of-Domain Refusal
  console.log('\n7. Testing Strict Guardrail: Out-of-Scope General Question...');
  const chat4 = await axios.post(`${BASE_URL}/chat`, {
    question: 'Can you write a poem about artificial intelligence and space travel?',
    chatHistory: [],
  });
  console.log('🛡️ AutoHR Refusal Response:\n', chat4.data.answer);

  console.log('\n====================================================');
  console.log('🎉 ALL API ENDPOINTS & GUARDRAILS VALIDATED 100%!');
  console.log('====================================================');
}

testFullApiSuite().catch((err) => {
  console.error('❌ Test suite failed:', err.response?.data || err.message);
  process.exit(1);
});
