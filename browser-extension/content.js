// Berjalan DI DALAM halaman Threads/X. Membaca isi postingan langsung dari
// DOM — bukan lewat API pihak ketiga — karena downloader publik untuk Threads
// mengembalikan teks navigasi UI dan foto profil, bukan isi postingannya.
// Membaca DOM juga memakai sesi login pengguna, jadi tidak kena tembok login.

const BUTTON_CLASS = 'repliz-clone-btn';

function detectPlatform() {
  const host = location.hostname;
  if (host.includes('threads.com') || host.includes('threads.net')) {
    return 'threads';
  }
  if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
  return null;
}

// Membuang elemen yang bukan bagian dari isi postingan. Tanpa ini, teks
// tombol ("Suka", "Balas", jumlah reaksi) ikut terbawa ke caption.
const NOISE_SELECTOR = [
  'button',
  '[role="button"]',
  'time',
  '[role="group"]',
  'svg',
].join(',');

function extractText(article) {
  const clone = article.cloneNode(true);
  clone.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());
  clone.querySelectorAll(`.${BUTTON_CLASS}`).forEach((el) => el.remove());

  // X menandai isi tweet secara eksplisit; Threads tidak, jadi seluruh teks
  // yang tersisa dipakai.
  const tweetText = clone.querySelector('[data-testid="tweetText"]');
  const source = tweetText ?? clone;

  // innerText mengikuti tata letak dan memberi baris baru yang rapi, tapi
  // nilainya kosong bila elemen tidak sedang dirender. textContent selalu
  // terisi, jadi dipakai sebagai cadangan.
  const raw = source.innerText || source.textContent || '';

  return [raw]
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

// Hanya media milik postingan yang diambil. Avatar dan emoji ikut muncul
// sebagai <img>, jadi disaring lewat pola URL-nya: t51.2885-19 adalah foto
// profil Instagram/Threads, dan /emoji/ adalah ikon.
function isContentImage(src) {
  if (!src || !/^https?:/i.test(src)) return false;
  if (/t51\.2885-19/.test(src)) return false;
  if (/\/emoji\//.test(src)) return false;
  if (/profile_images/.test(src)) return false;
  if (/\/svg\//.test(src)) return false;
  return true;
}

function extractMedia(article) {
  const media = [];
  const seen = new Set();

  article.querySelectorAll('video').forEach((video) => {
    const src = video.src || video.querySelector('source')?.src || '';
    if (src && /^https?:/i.test(src) && !seen.has(src)) {
      seen.add(src);
      media.push({ type: 'video', url: src });
    }
  });

  // Video diprioritaskan: bila postingan berisi video, <img> yang ada hanyalah
  // sampulnya dan tidak boleh ikut terkirim sebagai foto terpisah.
  if (media.length > 0) return media;

  article.querySelectorAll('img').forEach((img) => {
    const src = img.src || '';
    if (isContentImage(src) && !seen.has(src)) {
      seen.add(src);
      media.push({ type: 'image', url: src });
    }
  });

  return media;
}

function findPostUrl(article) {
  const anchors = Array.from(article.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (/\/post\/|\/status\//.test(href)) {
      return new URL(href, location.origin).href;
    }
  }
  return location.href;
}

function setButtonState(button, text, disabled) {
  button.textContent = text;
  button.disabled = Boolean(disabled);
  button.style.opacity = disabled ? '0.6' : '1';
}

async function handleClone(button, article, platform) {
  const text = extractText(article);
  const media = extractMedia(article);

  if (!text && media.length === 0) {
    setButtonState(button, 'Kosong — tidak ada isi', true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 2500);
    return;
  }

  setButtonState(button, 'Mengirim…', true);

  const response = await chrome.runtime.sendMessage({
    kind: 'clone',
    payload: {
      text,
      media,
      sourceUrl: findPostUrl(article),
      platform,
    },
  });

  if (response?.ok) {
    setButtonState(button, `Terjadwal ✓ ${response.publishAt ?? ''}`.trim(), true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 6000);
  } else {
    setButtonState(button, `Gagal: ${(response?.error ?? '').slice(0, 40)}`, true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 6000);
  }
}

function buildButton(article, platform) {
  const button = document.createElement('button');
  button.className = BUTTON_CLASS;
  button.textContent = 'Clone to Threads';
  button.style.cssText = [
    'margin:8px 0',
    'padding:4px 10px',
    'font-size:12px',
    'font-weight:600',
    'border-radius:6px',
    'border:1px solid #4c6ef5',
    'background:#4c6ef5',
    'color:#fff',
    'cursor:pointer',
    'position:relative',
    'z-index:9999',
  ].join(';');

  // Klik pada postingan biasanya membuka halaman detail; dihentikan supaya
  // menekan tombol tidak ikut berpindah halaman.
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void handleClone(button, article, platform);
  });

  return button;
}

function injectButtons(platform) {
  const articles = document.querySelectorAll('article, [data-pressable-container]');
  for (const article of articles) {
    if (article.querySelector(`.${BUTTON_CLASS}`)) continue;
    // Postingan yang belum ter-render penuh dilewati; akan dicoba lagi pada
    // pemindaian berikutnya.
    if (!article.innerText || article.innerText.trim().length < 2) continue;
    article.appendChild(buildButton(article, platform));
  }
}

const platform = detectPlatform();
if (platform) {
  injectButtons(platform);
  // Threads dan X memuat postingan sambil digulir, jadi tombol harus dipasang
  // ulang untuk elemen yang baru muncul. Diberi jeda supaya tidak memindai
  // pada setiap perubahan kecil.
  let pending = null;
  new MutationObserver(() => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      injectButtons(platform);
    }, 600);
  }).observe(document.body, { childList: true, subtree: true });
}
