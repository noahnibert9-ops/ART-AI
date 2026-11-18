const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Master ART AI API Key (Set this in Railway Variables later)
const ART_MASTER_KEY = process.env.ART_API_KEY || "art_default_key_12345";

// Health Check Endpoint
app.get('/v1/art/health', (req, res) => {
  res.json({ 
    status: 'online', 
    api: 'ART AI', 
    assistant: 'ART', 
    timestamp: new Date() 
  });
});

// ART AI Chat Endpoint
app.post('/v1/art/chat', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const providedKey = authHeader && authHeader.split(' ')[1];

  // Validate ART API Key
  if (!providedKey || providedKey !== ART_MASTER_KEY) {
    return res.status(401).json({ error: { message: 'Invalid or missing ART API Key.', type: 'auth_error' } });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: { message: 'Prompt is required.' } });
  }

  const upstreamApiKey = process.env.GEMINI_API_KEY;
  if (!upstreamApiKey) {
    return res.status(500).json({ error: { message: 'Server missing GEMINI_API_KEY configuration.' } });
  }

  try {
    // Proxy securely to the upstream AI model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${upstreamApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "System Instruction: You are ART, an expert software developer and script assistant. Keep answers practical and precise." }]
          },
          {
            role: "model",
            parts: [{ text: "Understood. I am ART." }]
          },
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const reply = data.candidates[0].content.parts[0].text;
      
      res.json({
        id: "art-" + Date.now(),
        model: "ART-v1",
        choices: [{
          message: { role: "assistant", content: reply }
        }]
      });
    } else {
      res.status(502).json({ error: { message: 'Invalid response from upstream AI service.' } });
    }
  } catch (err) {
    console.error('ART AI Server Error:', err);
    res.status(500).json({ error: { message: 'Internal server error while contacting ART AI engine.' } });
  }
});

// Start Server binding to Railway's dynamic port
app.listen(PORT, () => {
  console.log(`🤖 ART AI API Server running on port ${PORT}`);
});
