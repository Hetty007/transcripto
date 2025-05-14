const axios = require('axios');

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

exports.handler = async function(event) {
  const { videoUrl } = JSON.parse(event.body || '{}');
  const id = extractVideoId(videoUrl);
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid videoUrl' }) };
  }
  try {
    const html = (await axios.get(
      `https://www.youtube.com/watch?v=${id}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )).data;
    const m = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!m) throw new Error('INIT_DATA_NOT_FOUND');
    const player = JSON.parse(m[1]);
    const tracks = player.captions
      ?.playerCaptionsTracklistRenderer
      ?.captionTracks || [];
    if (!tracks.length) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No captions available' }) };
    }
    const codes = tracks.map(t => t.languageCode);
    return { statusCode: 200, body: JSON.stringify({ languages: codes }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
