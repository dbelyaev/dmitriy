// ----- Configurable parameters -----
const config = {
  numStars: 600,
  speed: 8, // depth units per frame
  maxZ: 1000, // spawn depth (far plane)
  minSize: 0.5, // pixel size at far plane
  maxSize: 4, // pixel size at near plane
  baseColor: { r: 255, g: 255, b: 255 }, // base star color (white)
  colorVariation: 40, // +/- random variation per channel for tint
};

let stars = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < config.numStars; i++) {
    stars.push(makeStar(true));
  }
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
}
