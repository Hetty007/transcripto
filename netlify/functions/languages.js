const axios = require('axios');

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

exports.handler = async function(event, context) {
  const { videoUrl } = JSON.parse(event.body || '{}');
  if (!videoUrl) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoUrl' }) };
  }
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid YouTube URL' }) };
  }

  try {
    const res = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = res.data;
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!match) {
      throw new Error('INIT_DATA_NOT_FOUND');
    }
    const playerResponse = JSON.parse(match[1]);
    const tracks = playerResponse.captions
      ?.playerCaptionsTracklistRenderer
      ?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No captions available' }) };
    }
    const codes = tracks.map(t => t.languageCode);
    return { statusCode: 200, body: JSON.stringify({ languages: codes }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
