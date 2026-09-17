// Navigateur local pour la QA et les pré-calculs (playwright-core, aucun navigateur téléchargé).
// QA_BROWSER=<chemin> pour en indiquer un autre. Leçon MECA RIVIERA : jamais deux navigateurs 3D headless en même temps.
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

export const executablePath = [
  process.env.QA_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

export function launch() {
  if (!executablePath) throw new Error('Aucun navigateur Chromium trouvé : définir QA_BROWSER.');
  return chromium.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });
}

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  tablet: { viewport: { width: 834, height: 1112 }, deviceScaleFactor: 2, hasTouch: true },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
