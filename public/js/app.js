// app.js
document.addEventListener('DOMContentLoaded', () => {
  const FUNC = '/.netlify/functions';
  const LANGUAGE_NAMES = {
    en: 'English', uk: 'Ukrainian', es: 'Spanish', fr: 'French', de: 'German',
    ru: 'Russian', ja: 'Japanese', zh: 'Chinese', it: 'Italian', pt: 'Portuguese',
    ar: 'Arabic', hi: 'Hindi', ko: 'Korean', vi: 'Vietnamese', th: 'Thai'
  };

  const urlInput = document.getElementById('url');
  const goBtn    = document.getElementById('go');
  const errorEl  = document.getElementById('error');
  const langSec  = document.getElementById('language-section');
  const langBtns = document.getElementById('languageButtons');
  const transSec = document.getElementById('transcript-section');
  const player   = document.getElementById('player');
  const resultEl = document.getElementById('result');
  const copyBtn  = document.getElementById('copyBtn');
  const dlBtn    = document.getElementById('downloadBtn');

  let currentUrl = '';

  goBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();
    errorEl.textContent = '';
    langSec.classList.add('hidden');
    transSec.classList.add('hidden');
    langBtns.innerHTML = '';
    if (!videoUrl) {
      errorEl.textContent = 'Please enter a YouTube URL.';
      return;
    }
    currentUrl = videoUrl;
    try {
      const r = await fetch(`${FUNC}/languages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });
      const js = await r.json();
      if (!r.ok) throw new Error(js.error||'Error fetching languages');
      js.languages.forEach(code => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.dataset.lang = code;
        btn.textContent = LANGUAGE_NAMES[code] || code;
        btn.addEventListener('click', selectLang);
        langBtns.appendChild(btn);
      });
      langSec.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      errorEl.textContent = e.message;
    }
  });

  async function selectLang(e) {
    langSec.classList.add('hidden');
    const lang = e.currentTarget.dataset.lang;
    player.src = `https://www.youtube.com/embed/${new URL(currentUrl).searchParams.get('v')}`;
    errorEl.textContent = '';
    try {
      const r2 = await fetch(`${FUNC}/transcript`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ videoUrl: currentUrl, lang })
      });
      const js2 = await r2.json();
      if (!r2.ok) throw new Error(js2.error||'Error fetching transcript');
      resultEl.textContent = js2.transcript;
      transSec.classList.remove('hidden');
    } catch(e) {
      console.error(e);
      errorEl.textContent = e.message;
    }
  }

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultEl.textContent);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent='Copy Text', 2000);
  });

  dlBtn.addEventListener('click', () => {
    const blob = new Blob([resultEl.textContent], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transcript.txt';
    a.click();
  });
});
