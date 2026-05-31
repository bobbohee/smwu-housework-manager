import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = 'file://' + path.resolve(__dirname, '../superpowers/wireframes/wireframe-interactive.html');
const outDir = path.resolve(__dirname, 'assets');

// 각 화면 상태: [파일명, 화면 전환 스크립트, 번호 배지 ANNOT 키]
const screens = [
  ['01-auth-login',          `switchPage('auth')`,                                                  'auth'],
  ['02-home',                `switchPage('home')`,                                                  'home'],
  ['03-group-overlay',       `switchPage('home'); toggleGroupOverlay()`,                            'group'],
  ['04-calendar',            `switchPage('calendar')`,                                              'calendar'],
  ['05-calendar-popup',      `switchPage('calendar'); showCalendarPopup()`,                         'popup'],
  ['06-calendar-deactivate', `switchPage('calendar'); showCalendarPopup(); showDeactivateForm()`,   'deactivate'],
  ['07-chores',              `switchPage('chores')`,                                                'chores'],
  ['08-chore-edit',          `switchPage('chore-edit'); selectMode('rotation')`,                    'edit-rotation'],
  ['08b-chore-edit-fixed',   `switchPage('chore-edit'); selectMode('fixed')`,                       'edit-fixed'],
  ['09-random',              `switchPage('random'); resetRandom()`,                                 'random'],
  ['10-random-result',       `switchPage('random'); showRandomResult()`,                            'random-result'],
  ['11-stats',               `switchPage('stats')`,                                                 'stats'],
  ['12-settings',            `switchPage('settings')`,                                              'settings'],
];

// PC(데스크톱) 기준 렌더 — 사이드바 네비게이션이 보이는 폭
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1024, height: 760 },
  deviceScaleFactor: 2,
});
await page.goto(fileUrl, { waitUntil: 'networkidle' });

for (const [name, script, annotKey] of screens) {
  // 상태 초기화 후 해당 화면으로 전환
  await page.evaluate(`clearBadges&&clearBadges(); hideCalendarPopup&&hideCalendarPopup(); document.getElementById('group-overlay')?.classList.remove('show');`);
  await page.evaluate(script);
  await page.waitForTimeout(150);
  // 레이아웃 확정 후 번호 배지 주입
  await page.evaluate(`renderBadges(${JSON.stringify(annotKey)})`);
  await page.waitForTimeout(80);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
}

await browser.close();
console.log('DONE');
