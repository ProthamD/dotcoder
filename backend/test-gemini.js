import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testGemini() {
    console.log('Testing Gemini API...');
    console.log('API Key:', process.env.GEMINI_API_KEY);
    console.log('Key length:', process.env.GEMINI_API_KEY?.length);
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
        console.error('\n❌ Invalid API key detected!');
        console.error('Please get a valid API key from: https://aistudio.google.com/app/apikey');
        return;
    }
    
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = 'Say hello in one sentence.';
        console.log('\nSending test prompt to Gemini...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('\n✅ Success! Gemini API is working.');
        console.log('Response:', text);
    } catch (error) {
        console.error('\n❌ Error testing Gemini API:');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        
        if (error.status === 404) {
            console.error('\n🔑 The API key appears to be INVALID or EXPIRED.');
            console.error('❗ 404 error means the API key does not have access to the model.');
            console.error('\n📝 Please:');
            console.error('   1. Go to: https://aistudio.google.com/app/apikey');
            console.error('   2. Create a NEW API key (the old one may be expired)');
            console.error('   3. Update GEMINI_API_KEY in backend/.env');
            console.error('   4. Restart the backend server');
        } else if (error.status === 400) {
            console.error('\n🔑 The API key format is invalid.');
        } else if (error.status === 429) {
            console.error('\n⏰ Rate limit exceeded. Wait a moment and try again.');
        } else {
            console.error('\nFull error:', error);
        }
    }
}

testGemini();
