import dotenv from 'dotenv';

dotenv.config();

async function testOpenRouter() {
    console.log('Testing OpenRouter API (raw fetch)...');
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': '.coder'
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1-0528:free',
                messages: [{ role: 'user', content: 'Say hello in one short sentence.' }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error);
        } else {
            console.log('\n✅ Success!');
            console.log('Response:', data.choices?.[0]?.message?.content);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testOpenRouter();
