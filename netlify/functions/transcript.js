const { getSubtitles } = require('youtube-caption-extractor');

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

exports.handler = async function(event) {
  const { videoUrl, lang } = JSON.parse(event.body || '{}');
  const videoId = extractVideoId(videoUrl);
  if (!videoId || !lang) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid parameters' }) };
  }
  try {
    const subtitles = await getSubtitles({ videoID: videoId, lang });
    if (!subtitles || subtitles.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No subtitles for this language' }) };
    }
    const transcript = subtitles.map(item => item.text).join(' ').trim();
    return { statusCode: 200, body: JSON.stringify({ transcript }) };
  } catch (err) {
    console.error('Transcript error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
