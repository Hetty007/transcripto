const axios = require('axios');

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be'))     return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com'))  return u.searchParams.get('v');
  } catch (_) {}
  return null;
}

exports.handler = async function(event) {
  const { videoUrl, lang } = JSON.parse(event.body || '{}');
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoUrl or lang' }) };
  }
  try {
    // Fetch HTML to locate captionTracks
    const html = (await axios.get(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )).data;
    const m = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!m) throw new Error('INIT_DATA_NOT_FOUND');
    const player = JSON.parse(m[1]);
    const track = player.captions
      .playerCaptionsTracklistRenderer
      .captionTracks
      .find(t => t.languageCode === lang);
    if (!track) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No subtitles for this language' }) };
    }
    const vttUrl = track.baseUrl + '&fmt=vtt';
    const vtt = (await axios.get(vttUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } } )).data;
    const lines = vtt.split('\n').filter(l => {
      l = l.trim();
      return l && !l.startsWith('WEBVTT') && !l.includes('-->');
    });
    const transcript = lines.join(' ').replace(/\s+/g,' ').trim();
    return { statusCode: 200, body: JSON.stringify({ transcript }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
