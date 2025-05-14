// app.js
document.addEventListener('DOMContentLoaded', () => {
  const LANGUAGE_NAMES = {
    en: 'English', uk: 'Ukrainian', es: 'Spanish', fr: 'French', de: 'German',
    ru: 'Russian', ja: 'Japanese', zh: 'Chinese', it: 'Italian', pt: 'Portuguese',
    ar: 'Arabic', hi: 'Hindi', ko: 'Korean', vi: 'Vietnamese', th: 'Thai'
  };

  const urlInput = document.getElementById('url');
  const goBtn = document.getElementById('go');
  const errorEl = document.getElementById('error');
  const langSection = document.getElementById('language-section');
  const langButtons = document.getElementById('languageButtons');
  const transcriptSection = document.getElementById('transcript-section');
  const player = document.getElementById('player');
  const resultEl = document.getElementById('result');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  
  let currentVideoUrl = '';

  goBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();
    errorEl.textContent = '';
    langSection.classList.add('hidden');
    transcriptSection.classList.add('hidden');
    langButtons.innerHTML = '';

    if (!videoUrl) {
      errorEl.textContent = 'Please enter a video URL.';
      return;
    }

    currentVideoUrl = videoUrl;
    player.src = '';

    try {
      const resp = await fetch('/api/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });
      if (!resp.ok) {
        const err = await resp.json();
        errorEl.textContent = err.error || 'Error fetching languages.';
        return;
      }
      const { languages } = await resp.json();
      languages.forEach(code => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.dataset.lang = code;
        btn.textContent = LANGUAGE_NAMES[code] || code;
        btn.addEventListener('click', async (e) => {
          // hide language section
          langSection.classList.add('hidden');
          // set video embed
          const lang = e.currentTarget.dataset.lang;
          const videoId = new URL(currentVideoUrl).searchParams.get('v') || currentVideoUrl.split('/').pop();
          player.src = `https://www.youtube.com/embed/${videoId}`; // no autoplay
          errorEl.textContent = '';
          resultEl.textContent = '';
          transcriptSection.classList.add('hidden');
          try {
            const resp2 = await fetch('/api/transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrl: currentVideoUrl, lang })
            });
            if (!resp2.ok) {
              const err2 = await resp2.json();
              errorEl.textContent = err2.error || 'Error fetching transcript.';
              return;
            }
            const { transcript } = await resp2.json();
            resultEl.textContent = transcript;
            transcriptSection.classList.remove('hidden');
          } catch (e) {
            console.error(e);
            errorEl.textContent = 'Server error.';
          }
        });
        langButtons.appendChild(btn);
      });
      langSection.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      errorEl.textContent = 'Server error.';
    }
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultEl.textContent).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy Text', 2000);
    });
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultEl.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
});
