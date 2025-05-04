const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, "../assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Icon sizes
const sizes = {
  icon: 1024,
  adaptive: 1024,
  splash: 2048,
  favicon: 32,
};

// Generate icons
Object.entries(sizes).forEach(([name, size]) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#4CAF50"; // Material Design Green
  ctx.fillRect(0, 0, size, size);

  // Draw barcode icon
  const iconSize = size * 0.6;
  const x = (size - iconSize) / 2;
  const y = (size - iconSize) / 2;

  // Draw barcode lines
  const lineWidth = iconSize / 20;
  const lineHeight = iconSize * 0.8;
  const startX = x + iconSize * 0.1;
  const startY = y + (iconSize - lineHeight) / 2;

  // Draw 8 lines with varying widths
  const widths = [1, 2, 1, 3, 1, 2, 1, 1];
  let currentX = startX;

  ctx.fillStyle = "#FFFFFF";
  widths.forEach((width, i) => {
    ctx.fillRect(currentX, startY, lineWidth * width, lineHeight);
    currentX += lineWidth * (width + 1);
  });

  // Draw scan line
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(x, y + iconSize * 0.5);
  ctx.lineTo(x + iconSize, y + iconSize * 0.5);
  ctx.stroke();

  // Save the icon
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(path.join(assetsDir, `${name}.png`), buffer);
  console.log(`Generated ${name}.png`);
});
