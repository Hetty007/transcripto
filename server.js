#!/usr/bin/env node
'use strict';

const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

app.post('/api/languages', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid videoUrl' });
  try {
    // Fetch auto-generated tracks
    const listRes = await axios.get(
      `https://video.google.com/timedtext?type=list&v=${videoId}&kind=asr`
    );
    const xml = listRes.data;
    const regex = /<track[^>]*lang_code="([^"]+)"[^>]*lang_translated="([^"]+)"/g;
    let match, langs = [];
    while ((match = regex.exec(xml)) !== null) {
      langs.push({ code: match[1], name: match[2] });
    }
    if (!langs.length) return res.status(404).json({ error: 'No captions available' });
    res.json({ languages: langs });
  } catch (err) {
    console.error('Languages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/transcript', async (req, res) => {
  const { videoUrl, lang } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) return res.status(400).json({ error: 'Invalid parameters' });
  try {
    // Fetch VTT for ASR captions
    const vttRes = await axios.get(
      `https://video.google.com/timedtext?fmt=vtt&lang=${lang}&v=${videoId}&kind=asr`
    );
    const vtt = vttRes.data;
    const lines = vtt.split('\n').filter(l => {
      l = l.trim();
      return l && !l.startsWith('WEBVTT') && !l.includes('-->');
    });
    const transcript = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (!transcript) return res.status(404).json({ error: 'No subtitles for this language' });
    res.json({ transcript });
  } catch (err) {
    console.error('Transcript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback root
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
