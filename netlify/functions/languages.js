const axios = require("axios");

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be"))      return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com"))  return u.searchParams.get("v");
  } catch (_) {}
  return null;
}

exports.handler = async function(event) {
  const { videoUrl } = JSON.parse(event.body || "{}");
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid YouTube URL" }) };
  }

  try {
    const html = (await axios.get(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    )).data;
    const m = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!m) throw new Error("Init data not found");

    const player = JSON.parse(m[1]);
    const tracks = player.captions
      ?.playerCaptionsTracklistRenderer
      ?.captionTracks || [];

    if (!tracks.length) {
      return { statusCode: 404, body: JSON.stringify({ error: "No captions available" }) };
    }

    const languages = tracks.map(t => ({
      code: t.languageCode,
      name: t.name?.simpleText || t.languageCode
    }));

    return { statusCode: 200, body: JSON.stringify({ languages }) };
  }
  catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
