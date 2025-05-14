const { getSubtitles } = require('youtube-caption-extractor');

function extractVideoId(videoUrl) {
  try {
    const u = new URL(videoUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch (e) {}
  return null;
}

exports.handler = async function(event, context) {
  const { videoUrl, lang } = JSON.parse(event.body || '{}');
  if (!videoUrl || !lang) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoUrl or lang' }) };
  }
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid videoUrl' }) };
  }

  try {
    const subs = await getSubtitles({ videoID: videoId, lang });
    if (!Array.isArray(subs) || subs.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No subtitles for this language' }) };
    }
    const transcript = subs.map(item => item.text).join(' ');
    return { statusCode: 200, body: JSON.stringify({ transcript }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
