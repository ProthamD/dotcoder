import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';

dotenv.config();

async function testMistral() {
    console.log('Testing Mistral API...');
    console.log('API Key:', process.env.MISTRAL_API_KEY);
    console.log('Key length:', process.env.MISTRAL_API_KEY?.length);
    
    if (!process.env.MISTRAL_API_KEY) {
        console.error('\n❌ No API key found!');
        console.error('Please set MISTRAL_API_KEY in backend/.env');
        return;
    }
    
    try {
        const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
        
        console.log('\nSending test prompt to Mistral...');
        const chatResponse = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
        });

        console.log('\n✅ Success! Mistral API is working.');
        console.log('Response:', chatResponse.choices[0].message.content);
    } catch (error) {
        console.error('\n❌ Error testing Mistral API:');
        console.error('Message:', error.message);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('\n🔑 The API key appears to be INVALID.');
            console.error('\n📝 Please:');
            console.error('   1. Go to: https://console.mistral.ai/');
            console.error('   2. Create a new API key');
            console.error('   3. Update MISTRAL_API_KEY in backend/.env');
            console.error('   4. Restart the backend server');
        } else {
            console.error('\nFull error:', error);
        }
    }
}

testMistral();
