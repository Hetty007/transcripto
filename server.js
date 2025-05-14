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
    if (u.hostname.includes('youtu.be'))     return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com'))  return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

// List captions (manual then ASR)
app.post('/api/languages', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return res.status(400).json({ error: 'Invalid videoUrl' });

  try {
    // Manual captions
    let xmlRes = await axios.get(
      `https://video.google.com/timedtext?type=list&v=${videoId}`
    );
    let xml = xmlRes.data;
    let regex = /<track[^>]*lang_code="([^"]+)"[^>]*lang_translated="([^"]+)"/g;
    let m, tracks = [];
    while ((m = regex.exec(xml)) !== null) {
      tracks.push({ code: m[1], name: m[2] });
    }
    // Fallback ASR
    if (!tracks.length) {
      xmlRes = await axios.get(
        `https://video.google.com/timedtext?type=list&v=${videoId}&kind=asr`
      );
      xml = xmlRes.data;
      regex.lastIndex = 0;
      while ((m = regex.exec(xml)) !== null) {
        tracks.push({ code: m[1], name: m[2] + ' (auto)' });
      }
    }
    if (!tracks.length) {
      return res.status(404).json({ error: 'No captions available' });
    }
    res.json({ languages: tracks });
  } catch (err) {
    console.error('Languages error:', err.toString());
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch transcript (manual then ASR)
app.post('/api/transcript', async (req, res) => {
  const { videoUrl, lang } = req.body;
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) return res.status(400).json({ error: 'Invalid parameters' });

  try {
    // Manual VTT
    let vttRes = await axios.get(
      `https://video.google.com/timedtext?fmt=vtt&lang=${lang}&v=${videoId}`
    );
    let vtt = vttRes.data;
    let lines = vtt.split('\n').filter(l => {
      l = l.trim();
      return l && !l.startsWith('WEBVTT') && !l.includes('-->');
    });
    // Fallback ASR
    if (!lines.length) {
      vttRes = await axios.get(
        `https://video.google.com/timedtext?fmt=vtt&lang=${lang}&v=${videoId}&kind=asr`
      );
      vtt = vttRes.data;
      lines = vtt.split('\n').filter(l => {
        l = l.trim();
        return l && !l.startsWith('WEBVTT') && !l.includes('-->');
      });
    }
    if (!lines.length) {
      return res.status(404).json({ error: 'No subtitles available' });
    }
    const transcript = lines.join(' ').replace(/\s+/g, ' ').trim();
    res.json({ transcript });
  } catch (err) {
    console.error('Transcript error:', err.toString());
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
