import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const output = resolve("artifacts");
mkdirSync(output, { recursive: true });
const vite = await createServer({ configFile: "vite.config.ts", appType: "custom", server: { middlewareMode: true } });
let component;
try {
  const module = await vite.ssrLoadModule("/src/game/board/FaceArtwork.tsx");
  if (typeof module.FaceArtwork !== "function") throw new Error("Face artwork component failed to load");
  component = module.FaceArtwork;
} finally {
  await vite.close();
}

const faceMarkup = Array.from({ length: 128 }, (_, faceId) => {
  const svg = renderToStaticMarkup(React.createElement(component, { faceId }));
  return `<div class="face">${svg}</div>`;
}).join("");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>128 face grayscale review</title>
<style>body{margin:16px;background:white}.sheet{width:max-content;display:grid;grid-template-columns:repeat(16,44px);gap:6px;filter:grayscale(1)}
.face{box-sizing:border-box;width:44px;height:44px;border:2px solid #757c9a;border-radius:8px;background:#111625}
.neon-board-face{display:block;width:100%;height:100%}</style><div class="sheet">${faceMarkup}</div></html>`;
const htmlPath = resolve(output, "face-sheet.html");
const imagePath = resolve(output, "face-sheet.png");
writeFileSync(htmlPath, html);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 840, height: 440 } });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.locator(".sheet").screenshot({ path: imagePath });
} finally {
  await browser.close();
}
process.stdout.write(`${imagePath}\n`);
