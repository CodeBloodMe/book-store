import fs from 'fs';

// simple .env.local parser
const envFile = fs.readFileSync('.env.local', 'utf8');
let groqKey = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('GROQ_API_KEY=')) {
    groqKey = line.split('=')[1].trim();
  }
}

async function testGroq() {
  console.log('Testing Groq with key:', groqKey.substring(0, 10) + '...');
  
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: 'Say hello' }]
      })
    });
    
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch(e) {
    console.error('Error:', e);
  }
}

testGroq();
