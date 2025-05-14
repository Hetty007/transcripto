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
  const id = extractVideoId(videoUrl);
  if (!id || !lang) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid parameters' }) };
  }
  try {
    const subs = await getSubtitles({ videoID: id, lang });
    if (!subs || !subs.length) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No subtitles for this language' }) };
    }
    const transcript = subs.map(item => item.text).join(' ').trim();
    return { statusCode: 200, body: JSON.stringify({ transcript }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
