#!/usr/bin/env node
'use strict';

const express = require('express');
const path = require('path');
const axios = require('axios');
const { getSubtitles } = require('youtube-caption-extractor');

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

// List available caption languages
app.post('/api/languages', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid videoUrl' });
  try {
    const htmlRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = htmlRes.data;
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!match) throw new Error('INIT_DATA_NOT_FOUND');
    const playerResponse = JSON.parse(match[1]);
    const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ error: 'No captions available' });
    }
    const codes = tracks.map(t => t.languageCode);
    res.json({ languages: codes });
  } catch (err) {
    console.error('Languages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch transcript for selected language
app.post('/api/transcript', async (req, res) => {
  const { videoUrl, lang } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) return res.status(400).json({ error: 'Invalid parameters' });
  try {
    const subtitles = await getSubtitles({ videoID: videoId, lang });
    if (!subtitles || subtitles.length === 0) {
      return res.status(404).json({ error: 'No subtitles for this language' });
    }
    const transcript = subtitles.map(item => item.text).join(' ').trim();
    res.json({ transcript });
  } catch (err) {
    console.error('Transcript error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
