#!/usr/bin/env node
'use strict';

const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const INVIDIOUS = 'https://yewtu.be'; // Invidious instance

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (_) {}
  return null;
}

// List available caption languages via Invidious
app.post('/api/languages', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid videoUrl' });
  try {
    const resp = await axios.get(`${INVIDIOUS}/api/v1/captions?videoId=${videoId}`);
    const tracks = resp.data; // array of { language, name, kind }
    if (!tracks || !tracks.length) {
      return res.status(404).json({ error: 'No captions available' });
    }
    const languages = tracks.map(t => ({ code: t.language, name: t.name }));
    res.json({ languages });
  } catch (err) {
    console.error('Languages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch transcript via Invidious
app.post('/api/transcript', async (req, res) => {
  const { videoUrl, lang } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) return res.status(400).json({ error: 'Invalid parameters' });
  try {
    const resp = await axios.get(`${INVIDIOUS}/api/v1/captions/${videoId}/${lang}?format=json`);
    const captions = resp.data; // array of { text, start, dur }
    if (!captions || !captions.length) {
      return res.status(404).json({ error: 'No subtitles for this language' });
    }
    const transcript = captions.map(c => c.text).join(' ').trim();
    res.json({ transcript });
  } catch (err) {
    console.error('Transcript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
