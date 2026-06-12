// ----- Configurable parameters -----
const config = {
  numStars: 600,
  speed: 4, // depth units per frame
  maxZ: 1000, // spawn depth (far plane)
  minSize: 0.5, // pixel size at far plane
  maxSize: 4, // pixel size at near plane
  baseColor: { r: 255, g: 255, b: 255 }, // base star color (white)
  colorVariation: 40, // +/- random variation per channel for tint
  quoteFont: "Georgia, serif",
  quoteMaxWidthRatio: 0.7, // max text width as a fraction of canvas width
  quoteSizeRatio: 0.025, // quote text size as a fraction of canvas width
  quoteMinSize: 20,
  authorSizeRatio: 0.6, // author text size relative to quote text size
  lineHeightRatio: 1.4, // line height relative to text size
  quoteAuthorGapRatio: 1.0, // gap between quote and author, in author line heights
};

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const ctx = canvas.getContext("2d");

let width, height;
let stars = [];
let quote;
let quoteLines = [];
let authorLines = [];
let quoteSize;
let authorSize;
let quoteCanvas = null;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, lo, hi) {
  return Math.min(Math.max(value, lo), hi);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

function init() {
  resizeCanvas();

  for (let i = 0; i < config.numStars; i++) {
    stars.push(makeStar(true));
  }

  fetch("quotes.json")
    .then((res) => res.json())
    .then((data) => {
      quote = pickRandom(data?.quotes);
      if (quote) {
        layoutQuote();
      }
    })
    .catch(() => {});

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (quote) {
      layoutQuote();
    }
  });

  requestAnimationFrame(draw);
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    star.z -= config.speed;
    if (star.z <= 1) {
      Object.assign(star, makeStar(false));
    }

    const sx = (star.x / star.z) * (width / 2) + width / 2;
    const sy = (star.y / star.z) * (height / 2) + height / 2;

    if (sx < 0 || sx > width || sy < 0 || sy > height) {
      Object.assign(star, makeStar(false));
      continue;
    }

    const depthRatio = 1 - star.z / config.maxZ; // 0 (far) -> 1 (near)
    const size = lerp(config.minSize, config.maxSize, depthRatio);

    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (quoteCanvas) {
    ctx.drawImage(quoteCanvas, 0, 0);
  }

  requestAnimationFrame(draw);
}

// pre-render the centered quote and author onto an offscreen canvas so
// drawing it each frame is a cheap drawImage instead of re-rasterizing text
function layoutQuote() {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const octx = offscreen.getContext("2d");
  octx.textAlign = "center";
  octx.textBaseline = "top";

  quoteSize = Math.max(config.quoteMinSize, width * config.quoteSizeRatio);
  authorSize = quoteSize * config.authorSizeRatio;
  const maxWidth = width * config.quoteMaxWidthRatio;

  octx.font = `${quoteSize}px ${config.quoteFont}`;
  quoteLines = wrapText(octx, quote.text, maxWidth);
  if (quoteLines.length > 0) {
    quoteLines[0] = "“" + quoteLines[0];
    quoteLines[quoteLines.length - 1] += "”";
  }

  octx.font = `${authorSize}px ${config.quoteFont}`;
  authorLines = wrapText(octx, "— " + quote.author, maxWidth);

  const quoteLineHeight = quoteSize * config.lineHeightRatio;
  const authorLineHeight = authorSize * config.lineHeightRatio;
  const gap = authorLines.length > 0 ? authorLineHeight * config.quoteAuthorGapRatio : 0;
  const totalHeight =
    quoteLines.length * quoteLineHeight + gap + authorLines.length * authorLineHeight;

  let y = height / 2 - totalHeight / 2;

  octx.font = `${quoteSize}px ${config.quoteFont}`;
  octx.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (const line of quoteLines) {
    octx.fillText(line, width / 2, y);
    y += quoteLineHeight;
  }

  y += gap;

  octx.font = `${authorSize}px ${config.quoteFont}`;
  octx.fillStyle = "rgba(200, 200, 200, 0.59)";
  for (const line of authorLines) {
    octx.fillText(line, width / 2, y);
    y += authorLineHeight;
  }

  quoteCanvas = offscreen;
}

// split `str` into lines whose rendered width (at the current font)
// does not exceed `maxWidth`; words longer than `maxWidth` on their own
// are hard-broken character by character
function wrapText(measureCtx, str, maxWidth) {
  const words = str.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureCtx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = "";
    }

    let remaining = word;
    while (measureCtx.measureText(remaining).width > maxWidth) {
      let splitAt = remaining.length;
      while (splitAt > 1 && measureCtx.measureText(remaining.slice(0, splitAt)).width > maxWidth) {
        splitAt--;
      }
      lines.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
    }

    current = current ? `${current} ${remaining}` : remaining;
  }
  if (current) lines.push(current);

  return lines;
}

// create a star; if `randomDepth` is true, place it at a random depth
// (used for initial population so stars appear gradually rather than
// all popping in at the far plane at once)
function makeStar(randomDepth) {
  const z = randomDepth ? random(1, config.maxZ) : config.maxZ;
  // clamp x/y to |x|,|y| <= z so the projected position is already on-screen
  // for this depth — avoids an instant cull-and-respawn-at-maxZ on frame 1
  const maxX = Math.min(width / 2, z);
  const maxY = Math.min(height / 2, z);
  const r = clamp(config.baseColor.r + random(-config.colorVariation, config.colorVariation), 0, 255);
  const g = clamp(config.baseColor.g + random(-config.colorVariation, config.colorVariation), 0, 255);
  const b = clamp(config.baseColor.b + random(-config.colorVariation, config.colorVariation), 0, 255);
  return {
    x: random(-maxX, maxX),
    y: random(-maxY, maxY),
    z,
    color: `rgb(${r}, ${g}, ${b})`,
  };
}

init();
