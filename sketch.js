// ----- Configurable parameters -----
const config = {
  numStars: 600,
  speed: 8, // depth units per frame
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

let stars = [];
let quotesData;
let quote;
let quoteLines = [];
let authorLines = [];
let quoteSize;
let authorSize;

function preload() {
  quotesData = loadJSON("quotes.json");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < config.numStars; i++) {
    stars.push(makeStar(true));
  }

  quote = random(quotesData.quotes);
  layoutQuote();
}

function draw() {
  background(0);

  for (let star of stars) {
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

    noStroke();
    fill(
      constrain(star.r, 0, 255),
      constrain(star.g, 0, 255),
      constrain(star.b, 0, 255)
    );
    circle(sx, sy, size);
  }

  drawQuote();
}

// draw the centered quote and author, vertically centered as a block
function drawQuote() {
  const quoteLineHeight = quoteSize * config.lineHeightRatio;
  const authorLineHeight = authorSize * config.lineHeightRatio;
  const gap = authorLines.length > 0 ? authorLineHeight * config.quoteAuthorGapRatio : 0;
  const totalHeight =
    quoteLines.length * quoteLineHeight + gap + authorLines.length * authorLineHeight;

  let y = height / 2 - totalHeight / 2;

  textAlign(CENTER, TOP);
  noStroke();

  textSize(quoteSize);
  fill(255, 255, 255, 230);
  for (const line of quoteLines) {
    text(line, width / 2, y);
    y += quoteLineHeight;
  }

  y += gap;

  textSize(authorSize);
  fill(200, 200, 200, 150);
  for (const line of authorLines) {
    text(line, width / 2, y);
    y += authorLineHeight;
  }
}

// wrap the quote text and author into lines that fit within maxWidth,
// caching the results in quoteLines/authorLines along with the computed
// text sizes for use in drawQuote()
function layoutQuote() {
  textFont(config.quoteFont);

  quoteSize = max(config.quoteMinSize, width * config.quoteSizeRatio);
  authorSize = quoteSize * config.authorSizeRatio;
  const maxWidth = width * config.quoteMaxWidthRatio;

  textSize(quoteSize);
  quoteLines = wrapText(quote.text, maxWidth);
  if (quoteLines.length > 0) {
    quoteLines[0] = "“" + quoteLines[0];
    quoteLines[quoteLines.length - 1] += "”";
  }

  textSize(authorSize);
  authorLines = wrapText("— " + quote.author, maxWidth);
}

// split `str` into lines whose rendered width (at the current textSize)
// does not exceed `maxWidth`
function wrapText(str, maxWidth) {
  const words = str.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

// create a star; if `randomDepth` is true, place it at a random depth
// (used for initial population so stars appear gradually rather than
// all popping in at the far plane at once)
function makeStar(randomDepth) {
  return {
    x: random(-width / 2, width / 2),
    y: random(-height / 2, height / 2),
    z: randomDepth ? random(1, config.maxZ) : config.maxZ,
    r: config.baseColor.r + random(-config.colorVariation, config.colorVariation),
    g: config.baseColor.g + random(-config.colorVariation, config.colorVariation),
    b: config.baseColor.b + random(-config.colorVariation, config.colorVariation),
  };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutQuote();
}
