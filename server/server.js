const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

const PORT = process.env.PORT || 8080;

// Simple in-memory + file-backed reports store
const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
let reports = [];
if (fs.existsSync(REPORTS_FILE)) {
  try { reports = JSON.parse(fs.readFileSync(REPORTS_FILE)); } catch (e) { reports = []; }
}

function saveReports() {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Verify endpoint - calls Google Generative AI or uses a simple heuristic fallback
app.post('/api/verify', async (req, res) => {
  const { text, sourceUrl } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing `text` in body' });

  // If GOOGLE_API_KEY is set, attempt a call to Google Generative Language API (REST)
  if (process.env.GOOGLE_API_KEY) {
    try {
      const prompt = `You are an assistant that evaluates whether a piece of content is likely to be misinformation. For the following content, provide:\n1) a short verdict: \"Likely True\" / \"Likely Misleading\" / \"Unverified\" / \"Likely False\";\n2) a confidence score 0-100;\n3) 3 concise reasons explaining why;\n4) suggestions for sources to verify (short list).\n\nContent:\n${text}`;

      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=' + process.env.GOOGLE_API_KEY,
        {
          "prompt": { "text": prompt },
          "temperature": 0.2,
          "maxOutputTokens": 600
        }
      );

      const output = response.data?.candidates?.[0]?.output || response.data?.output || '';
      return res.json({ source: 'google_generativelanguage', raw: output });
    } catch (err) {
      console.error('Generative API error', err?.response?.data || err.message);
      // fallthrough to heuristic
    }
  }

  // Heuristic fallback: simple keyword and domain checks
  const lower = text.toLowerCase();
  let score = 50; let reasons = [];
  const suspiciousKeywords = ['miracle', 'shocking', 'exclusive', 'secret', 'won', 'scam', 'urgent', 'alert'];
  suspiciousKeywords.forEach(k => { if (lower.includes(k)) { score -= 8; reasons.push(`Contains sensational word: "${k}"`); } });
  if (lower.includes('coronavirus') || lower.includes('vaccine')) score -= 6;
  if (sourceUrl && sourceUrl.includes('facebook.com')) score -= 5;

  if (score < 40) {
    reasons.push('Multiple red flags in language and source.');
  } else if (score > 65) {
    reasons.push('Language appears neutral and factual.');
  } else {
    reasons.push('Mixed signals; recommend further verification.');
  }

  const verdict = score < 45 ? 'Likely Misleading' : score > 70 ? 'Likely True' : 'Unverified';

  res.json({ source: 'heuristic', verdict, confidence: score, reasons, suggestedChecks: [ 'Check reputable news outlets', 'Search for primary sources', 'Use fact-checkers like AltNews/BOOM' ] });
});

// Report endpoint
app.post('/api/report', (req, res) => {
  const { text, sourceUrl, reporter } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing `text`' });
  const id = Date.now();
  const item = { id, text, sourceUrl: sourceUrl || null, reporter: reporter || 'anonymous', createdAt: new Date().toISOString() };
  reports.unshift(item);
  if (reports.length > 1000) reports.pop();
  saveReports();
  res.json({ ok: true, item });
});

// List reports
app.get('/api/reports', (req, res) => {
  res.json({ reports });
});

// Serve static frontend
app.use('/', express.static(path.join(__dirname, '..')));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
