import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';

dotenv.config();

async function testOpenRouter() {
    console.log('Testing OpenRouter API...');
    console.log('API Key:', process.env.OPENROUTER_API_KEY?.substring(0, 20) + '...');
    
    if (!process.env.OPENROUTER_API_KEY) {
        console.error('\n❌ No API key found!');
        return;
    }
    
    try {
        const openrouter = new OpenRouter({
            apiKey: process.env.OPENROUTER_API_KEY
        });
        
        console.log('\nSending test prompt to OpenRouter...');
        
        const completion = await openrouter.chat.send({
            model: 'google/gemma-3-1b-it:free',
            messages: [{ role: 'user', content: 'Say hello in one sentence.' }],
        });

        console.log('\n✅ Success! OpenRouter API is working.');
        console.log('Response:', completion.choices[0].message.content);
    } catch (error) {
        console.error('\n❌ Error testing OpenRouter API:');
        console.error('Message:', error.message);
        console.error('Full error:', error);
    }
}

testOpenRouter();
