// ---------- frog art (Pepe-ish, drawn in SVG) ----------
function frogSVG(style = "plain") {
  const hat = style === "hat" ? `
    <polygon points="100,-38 70,34 130,34" fill="#2f9fe0" stroke="#1d2a14" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="88" cy="14" r="6" fill="#ffe14d"/><circle cx="108" cy="-4" r="5" fill="#ffe14d"/><circle cx="112" cy="22" r="6" fill="#ffe14d"/>
    <circle cx="100" cy="-40" r="9" fill="#ff5fa2" stroke="#1d2a14" stroke-width="4"/>` : "";
  const glasses = style === "glasses" ? `
    <defs><linearGradient id="shades" x1="0" x2="1"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#4fd8ff"/><stop offset="1" stop-color="#7a4fff"/></linearGradient></defs>
    <rect x="36" y="56" width="128" height="28" rx="12" fill="url(#shades)" stroke="#1d2a14" stroke-width="5"/>
    <line x1="100" y1="58" x2="100" y2="82" stroke="#1d2a14" stroke-width="4"/>` : "";
  const eyes = style === "glasses" ? "" : `
    <ellipse cx="68" cy="70" rx="25" ry="15" fill="#fff" stroke="#1d2a14" stroke-width="4"/>
    <ellipse cx="132" cy="70" rx="25" ry="15" fill="#fff" stroke="#1d2a14" stroke-width="4"/>
    <circle cx="72" cy="72" r="11" fill="#111"/><circle cx="136" cy="72" r="11" fill="#111"/>
    <circle cx="68" cy="68" r="3.5" fill="#fff"/><circle cx="132" cy="68" r="3.5" fill="#fff"/>
    <path d="M42 64 Q68 50 94 64" fill="#5f9a3c" stroke="#1d2a14" stroke-width="4"/>
    <path d="M106 64 Q132 50 158 64" fill="#5f9a3c" stroke="#1d2a14" stroke-width="4"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -50 200 230">
    <ellipse cx="100" cy="172" rx="70" ry="30" fill="#2f5fd0" stroke="#1d2a14" stroke-width="5"/>
    <ellipse cx="100" cy="100" rx="86" ry="60" fill="#5f9a3c" stroke="#1d2a14" stroke-width="5"/>
    <ellipse cx="66" cy="62" rx="36" ry="30" fill="#5f9a3c" stroke="#1d2a14" stroke-width="5"/>
    <ellipse cx="134" cy="62" rx="36" ry="30" fill="#5f9a3c" stroke="#1d2a14" stroke-width="5"/>
    <ellipse cx="100" cy="92" rx="70" ry="30" fill="#5f9a3c"/>
    ${eyes}
    <path d="M34 120 Q100 108 170 114 Q176 124 164 130 Q100 140 40 132 Q28 128 34 120 Z" fill="#b8633a" stroke="#1d2a14" stroke-width="4"/>
    <path d="M40 124 Q100 120 166 120" fill="none" stroke="#1d2a14" stroke-width="3"/>
    ${glasses}${hat}
  </svg>`;
}

document.querySelectorAll("[data-frog]").forEach(el => { el.innerHTML = frogSVG(el.dataset.frog); });

// ---------- floating balloons ----------
(function balloons() {
  const colors = ["#ff5f5f", "#ffd84d", "#5fc8ff", "#ff5fd2", "#8fe06a", "#b57bff"];
  const box = document.querySelector(".balloons");
  for (let i = 0; i < 12; i++) {
    const b = document.createElement("span");
    b.className = "balloon";
    b.style.left = Math.random() * 100 + "vw";
    b.style.background = colors[i % colors.length];
    b.style.animationDuration = 14 + Math.random() * 14 + "s";
    b.style.animationDelay = -Math.random() * 25 + "s";
    box.appendChild(b);
  }
})();

// ---------- navigation (hash-based so the phone back button works) ----------
function route() {
  const side = location.hash.slice(1);
  document.body.classList.remove("opened", "open-solo", "open-party");
  if (side === "solo" || side === "party") {
    document.body.classList.add("opened", "open-" + side);
    window.scrollTo(0, 0);
    if (side === "solo") showNextSolo();
  }
}
document.querySelectorAll("[data-open]").forEach(btn =>
  btn.addEventListener("click", () => { location.hash = btn.dataset.open; }));
document.querySelectorAll("[data-back]").forEach(btn =>
  btn.addEventListener("click", () => {
    history.pushState(null, "", location.pathname);
    route();
  }));
window.addEventListener("hashchange", route);

// ---------- SOLO MISSION: shuffle ----------
const soloImg = document.getElementById("solo-img");
const soloEmpty = document.getElementById("solo-empty");
const soloCount = document.getElementById("solo-count");
// Running tally of saved worlds, remembered on this device.
let worldsSaved = 0;
try { worldsSaved = Number(localStorage.getItem("froggy-worlds-saved")) || 0; } catch {}
let soloPool = null;   // photos that actually exist
let soloBag = [];      // no repeats until every photo has been shown
let soloCurrent = null;

const soloReady = Promise.all(SOLO_PHOTOS.map(src => new Promise(res => {
  const i = new Image();
  i.onload = () => res(src);
  i.onerror = () => res(null);
  i.src = src;
}))).then(list => { soloPool = list.filter(Boolean); });

async function showNextSolo() {
  await soloReady;
  if (!soloPool.length) {
    soloImg.hidden = true;
    soloEmpty.hidden = false;
    document.getElementById("shuffle").disabled = true;
    return;
  }
  if (!soloBag.length) {
    soloBag = soloPool.filter(p => p !== soloCurrent || soloPool.length === 1);
    soloBag.sort(() => Math.random() - 0.5);
  }
  soloCurrent = soloBag.pop();
  soloImg.src = soloCurrent;
  soloImg.classList.remove("wiggle");
  void soloImg.offsetWidth;
  soloImg.classList.add("wiggle");
  worldsSaved++;
  try { localStorage.setItem("froggy-worlds-saved", worldsSaved); } catch {}
  soloCount.textContent = `🌍 World saved ${worldsSaved.toLocaleString()} time${worldsSaved === 1 ? "" : "s"}`;
}
document.getElementById("shuffle").addEventListener("click", showNextSolo);

// ---------- FROGGY PARTY: upload + froggify ----------
// The AI picture comes from the Cloudflare Worker in worker/ (it holds the OpenAI key).
// If the Worker is unreachable, we fall back to a meme collage made right in the browser.
const SCENES = [
  { title: "OPERATION: AREA 51 BIRTHDAY RAID", props: ["👽", "🛸", "🎂"], sky: ["#0b1a3a", "#2b6b4a"] },
  { title: "DEFUSING THE CABAL'S NUKE", props: ["☢️", "💣", "⏱️"], sky: ["#3a0b0b", "#c4632a"] },
  { title: "FROGS VS. THE LIZARD PEOPLE", props: ["🦎", "👑", "⚔️"], sky: ["#1a3a0b", "#9cc97a"] },
  { title: "THE MOON LANDING WAS STAGED BY FROGS", props: ["🌕", "🚀", "🎬"], sky: ["#05051a", "#3a3a7a"] },
  { title: "BIRDS AREN'T REAL AND WE HAVE PROOF", props: ["🐦", "📡", "🔋"], sky: ["#0b2a3a", "#5fc8ff"] },
  { title: "SAVING PARIS FROM THE SECRET SOCIETY", props: ["🗼", "🥖", "🕵️"], sky: ["#2a0b3a", "#ff8fb8"] },
  { title: "ESCAPING THE BERMUDA TRIANGLE", props: ["🌀", "⛵", "🦈"], sky: ["#062a3a", "#2fb0c0"] },
  { title: "THE ILLUMINATI WASN'T READY", props: ["🔺", "👁️", "💰"], sky: ["#1a1405", "#d4a52a"] },
];

const fileInput = document.getElementById("party-file");
const froggifyBtn = document.getElementById("froggify");
const canvas = document.getElementById("party-canvas");
const ctx = canvas.getContext("2d");
const resultFrame = document.querySelector(".result");
const resultActions = document.querySelector(".result-actions");
const downloadLink = document.getElementById("download");
let userImg = null;
let lastScene = -1;

const loadImg = src => new Promise(res => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});
const frogImg = style => loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(frogSVG(style)));
const mommaReady = loadImg(MOMMA_PHOTO);

// ---- circle cropper: drag to center the face, slider/pinch/wheel to zoom ----
const uploadLabel = document.querySelector(".upload");
const cropper = document.querySelector(".cropper");
const cropCircle = document.getElementById("crop-circle");
const cropImg = document.getElementById("crop-img");
const zoomInput = document.getElementById("crop-zoom");
const crop = { x: 0, y: 0, zoom: 1 }; // x/y = offset of the image center from the circle center, in screen px

const circleSize = () => cropCircle.clientWidth;
const cropScale = () => (circleSize() / Math.min(userImg.width, userImg.height)) * crop.zoom;

function layoutCrop() {
  if (!userImg) return;
  const d = circleSize(), s = cropScale();
  const w = userImg.width * s, h = userImg.height * s;
  // keep the circle fully covered by the photo
  crop.x = Math.max(-(w - d) / 2, Math.min((w - d) / 2, crop.x));
  crop.y = Math.max(-(h - d) / 2, Math.min((h - d) / 2, crop.y));
  cropImg.style.width = userImg.width + "px";
  cropImg.style.transform = `translate(${d / 2 - w / 2 + crop.x}px, ${d / 2 - h / 2 + crop.y}px) scale(${s})`;
}

function setZoom(z) {
  const old = crop.zoom;
  crop.zoom = Math.max(1, Math.min(4, z));
  crop.x *= crop.zoom / old; // zoom around the circle center
  crop.y *= crop.zoom / old;
  zoomInput.value = crop.zoom;
  layoutCrop();
}

// What's inside the circle, as a square canvas (max 1024px). Used for the AI and the collage.
function croppedPhoto() {
  const d = circleSize(), s = cropScale();
  const side = d / s;
  const sx = userImg.width / 2 - crop.x / s - side / 2;
  const sy = userImg.height / 2 - crop.y / s - side / 2;
  const out = Math.min(1024, Math.round(side));
  const c = document.createElement("canvas");
  c.width = c.height = out;
  c.getContext("2d").drawImage(userImg, sx, sy, side, side, 0, 0, out, out);
  return c;
}

const pointers = new Map();
let pinchStart = null;
cropCircle.addEventListener("pointerdown", e => {
  cropCircle.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  cropCircle.classList.add("dragging");
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: crop.zoom };
  }
});
cropCircle.addEventListener("pointermove", e => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    setZoom(pinchStart.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.dist);
  } else if (pointers.size === 1) {
    crop.x += cur.x - prev.x;
    crop.y += cur.y - prev.y;
    layoutCrop();
  }
});
const endPointer = e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (!pointers.size) cropCircle.classList.remove("dragging");
};
cropCircle.addEventListener("pointerup", endPointer);
cropCircle.addEventListener("pointercancel", endPointer);
cropCircle.addEventListener("wheel", e => { e.preventDefault(); setZoom(crop.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
zoomInput.addEventListener("input", () => setZoom(Number(zoomInput.value)));
document.getElementById("change-photo").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = await loadImg(url);
  if (!img) {
    document.querySelector(".upload-box strong").textContent = "Hmm, couldn't read that pic. Try a JPG or PNG?";
    return;
  }
  userImg = img;
  cropImg.src = url;
  crop.x = crop.y = 0;
  crop.zoom = 1;
  zoomInput.value = 1;
  uploadLabel.hidden = true;
  cropper.hidden = false;
  layoutCrop();
  froggifyBtn.disabled = false;
});

froggifyBtn.addEventListener("click", makeFroggy);
document.getElementById("reroll").addEventListener("click", makeFroggy);

const passInput = document.getElementById("party-pass");
const statusEl = document.getElementById("party-status");
const partyImg = document.getElementById("party-img");
const WAIT_LINES = [
  "Summoning the frog squad…",
  "Briefing Momma on the mission…",
  "Loading the freedom cannons…",
  "Bribing the lizard people…",
  "Asking Pepe to hold still…",
  "Painting the explosions…",
];
let busy = false;

function setStatus(text, isError = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", isError);
}

// Phone photos can be huge; send a 1024px JPEG instead.
function shrinkPhoto(img) {
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, "image/jpeg", 0.9));
}

async function makeFroggy() {
  if (!userImg || busy) return;
  if (!PARTY_API) return makeCollage();

  busy = true;
  froggifyBtn.disabled = true;
  let line = 0;
  setStatus(WAIT_LINES[0]);
  const ticker = setInterval(() => setStatus(WAIT_LINES[++line % WAIT_LINES.length]), 4000);

  try {
    const body = new FormData();
    body.append("photo", await shrinkPhoto(croppedPhoto()), "photo.jpg");
    body.append("password", passInput.value);
    const res = await fetch(PARTY_API, { method: "POST", body });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      passInput.hidden = false;
      passInput.focus();
      setStatus(passInput.value ? "Wrong secret frog word. Try again!" : "Enter the secret frog word first 🐸", true);
      return;
    }
    if (!res.ok || !data.image) throw new Error(data.error || "The frog lab is napping");

    const src = "data:image/png;base64," + data.image;
    partyImg.src = src;
    partyImg.hidden = false;
    canvas.hidden = true;
    downloadLink.href = src;
    resultFrame.hidden = false;
    resultActions.hidden = false;
    setStatus("");
    resultFrame.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    console.error(err);
    setStatus("The AI frog lab is napping, so here's a collage instead 🐸", true);
    await makeCollage();
  } finally {
    clearInterval(ticker);
    busy = false;
    froggifyBtn.disabled = false;
  }
}

function circlePhoto(img, cx, cy, r, tilt) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
  ctx.fillStyle = "#fffef4";
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#1d2a14";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, -w / 2, -h / 2.4, w, h); // bias toward the top so faces stay in frame
  ctx.restore();
}

function memeText(text, x, y, maxW, size) {
  ctx.font = `${size}px Bangers, Impact, sans-serif`;
  while (ctx.measureText(text).width > maxW && size > 30) {
    size -= 4;
    ctx.font = `${size}px Bangers, Impact, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size / 7;
  ctx.strokeStyle = "#1d2a14";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x, y);
}

async function makeCollage() {
  if (!userImg) return;
  let pick;
  do { pick = Math.floor(Math.random() * SCENES.length); } while (pick === lastScene && SCENES.length > 1);
  lastScene = pick;
  const scene = SCENES[pick];
  const W = canvas.width, H = canvas.height;

  await document.fonts.load("80px Bangers");
  const [momma, frogHat, frogShades, frogPlain] = await Promise.all([mommaReady, frogImg("hat"), frogImg("glasses"), frogImg("plain")]);

  // sky + comic rays
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, scene.sky[0]);
  g.addColorStop(1, scene.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.fillStyle = "rgba(255,255,255,.07)";
  for (let a = 0; a < 24; a++) {
    ctx.rotate(Math.PI / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(900, -80);
    ctx.lineTo(900, 80);
    ctx.fill();
  }
  ctx.restore();

  // props scattered around
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const spots = [[140, 250], [940, 230], [540, 200], [120, 620], [960, 600], [300, 420], [780, 420]];
  spots.forEach(([x, y], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.8);
    ctx.font = `${90 + Math.random() * 60}px serif`;
    ctx.fillText(scene.props[i % scene.props.length], 0, 0);
    ctx.restore();
  });

  // the heroes
  circlePhoto(croppedPhoto(), 330, 560, 190, -0.07);
  if (momma) circlePhoto(momma, 750, 540, 200, 0.06);
  else ctx.drawImage(frogPlain, 560, 330, 380, 437);
  memeText("YOU", 330, 800, 300, 70);
  memeText("MOMMA", 750, 800, 360, 70);

  // frog squad along the bottom
  ctx.drawImage(frogShades, -20, 790, 280, 322);
  ctx.drawImage(frogHat, 820, 760, 290, 334);
  ctx.drawImage(frogPlain, 420, 880, 240, 276);

  memeText(scene.title, W / 2, 80, 1000, 96);
  memeText("HAPEPE BIRTHDAY MOMMA", W / 2, 1030, 1000, 64);

  canvas.hidden = false;
  partyImg.hidden = true;
  resultFrame.hidden = false;
  resultActions.hidden = false;
  downloadLink.href = canvas.toDataURL("image/png");
  resultFrame.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------- background song ----------
// Browsers block sound until the first tap/click, so start it then and keep it looping.
(function music() {
  const song = document.getElementById("song");
  const btn = document.getElementById("mute");
  song.volume = 0.6;
  let muted = false;
  try { muted = localStorage.getItem("froggy-muted") === "1"; } catch {}

  const render = () => {
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-label", muted ? "Play music" : "Mute music");
  };
  const play = () => { if (!muted) song.play().catch(() => {}); };

  btn.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("froggy-muted", muted ? "1" : "0"); } catch {}
    muted ? song.pause() : song.play().catch(() => {});
    render();
  });
  ["pointerdown", "keydown", "touchstart"].forEach(ev =>
    document.addEventListener(ev, e => { if (e.target !== btn) play(); }, { once: true, capture: true }));
  render();
  play(); // works right away if the browser allows autoplay
})();

route();
