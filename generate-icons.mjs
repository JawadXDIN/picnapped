import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";

const sizes = [16, 32, 48, 128];
const dir = "public/icons";
mkdirSync(dir, { recursive: true });

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  
  // Purple gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#7C3AED");
  grad.addColorStop(1, "#3B82F6");
  ctx.fillStyle = grad;
  
  // Rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.arcTo(size, 0, size, r, r);
  ctx.lineTo(size, size - r);
  ctx.arcTo(size, size, size - r, size, r);
  ctx.lineTo(r, size);
  ctx.arcTo(0, size, 0, size - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();
  
  // Camera emoji style - simple circle
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = "#7C3AED";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.5, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  writeFileSync(`${dir}/icon${size}.png`, canvas.toBuffer("image/png"));
  console.log(`Created icon${size}.png`);
}
