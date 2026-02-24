// server.js - Fixed for Vercel Deployment
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API configuration
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    // Don't exit on Vercel, just log error
}

const genAI = new GoogleGenerativeAI(API_KEY || 'dummy-key');
const MODEL_NAME = "gemini-1.5-flash"; // Using stable version

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message required' });
        }

        if (!API_KEY || API_KEY === 'dummy-key') {
            return res.status(500).json({ 
                response: "❌ API Key not configured. Please set GEMINI_API_KEY in environment variables.",
                error: true
            });
        }

        console.log(`📨 User: ${message.substring(0, 50)}...`);

        // Build context from history
        let prompt = message;
        if (history.length > 0) {
            const context = history.slice(-5).map(h => 
                `User: ${h.user}\nAssistant: ${h.bot}`
            ).join('\n\n');
            prompt = `Previous conversation:\n${context}\n\nNew question: ${message}`;
        }

        // Generate response
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ 
            response: text,
            model: MODEL_NAME,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({ 
            response: `**Error:** ${error.message}\n\nPlease try again.`,
            error: true
        });
    }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        if (!API_KEY || API_KEY === 'dummy-key') {
            return res.json({ 
                status: '⚠️ No API Key', 
                message: 'Set GEMINI_API_KEY in environment variables'
            });
        }
        
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent('Say "Server is working!"');
        const response = await result.response;
        const text = response.text();
        
        res.json({ 
            status: '✅ Working', 
            model: MODEL_NAME,
            response: text 
        });
    } catch (error) {
        res.json({ 
            status: '❌ Error', 
            error: error.message 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        model: MODEL_NAME,
        apiKeyConfigured: !!API_KEY && API_KEY !== 'dummy-key',
        timestamp: new Date().toISOString()
    });
});

// Vercel export
module.exports = app;

// Start server (only for local development)
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log("=================================");
        console.log("🚀 Nous Server LIVE");
        console.log(`🌍 Running on port ${PORT}`);
        console.log("=================================");
    });
}