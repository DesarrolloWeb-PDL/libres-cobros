/**
 * Screenshot capture for the user manuals — READ-ONLY navigation.
 * Never clicks: generate/save/send/approve/delete. Only: login, DNI search,
 * OTP verify (test code), tab switch, scroll and page navigation.
 * Light theme forced for print-friendly manuals.
 */
const { chromium } = require('playwright-core');
const path = require('path');

const BASE = 'https://libres-cobros.vercel.app';
const OUT = 'C:/Users/Usuario/Documents/PROYECTOS/libres-cobros/manual/img';

// From DB recon (2026-11-21):
const OTP_CLUB = 'club-libres'; // has portal_otp_test_code=55667788
const OTP_CODE = '55667788';
const MARIA_DNI = '28123456'; // club-libres, has paid history
const ALPHA_CLUB = 'club-deportivo-alpha'; // bypass mode, no OTP
const JUAN_DNI = '12345678'; // has a PENDING fee -> "Pagar ahora"
const ADMIN = { email: 'admin@clublibres.test', pass: 'club123' };

const results = [];

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.waitForTimeout(700); // settle animations
  await page.screenshot({ path: file });
  results.push(`OK   ${name}`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    locale: 'es-AR',
  });
  // Force light theme before the app's own theme script runs.
  await context.addInitScript(() => {
    try { localStorage.setItem('libres-theme', 'light'); } catch {}
  });
  const page = await context.newPage();

  const safe = async (name, fn) => {
    try { await fn(); } catch (e) { results.push(`FAIL ${name}: ${e.message.slice(0, 120)}`); }
  };

  // ---------- SOCIO ----------
  await safe('socio-01-selector', async () => {
    await page.goto(`${BASE}/pagos`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'socio-01-selector');
  });

  await safe('socio-02-dni', async () => {
    await page.goto(`${BASE}/pagos/${ALPHA_CLUB}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('input[placeholder="Ingresá tu DNI"]');
    await shot(page, 'socio-02-dni');
  });

  await safe('socio-03-panel-alpha', async () => {
    await page.fill('input[placeholder="Ingresá tu DNI"]', JUAN_DNI);
    await page.getByRole('button', { name: /buscar/i }).click();
    await page.getByRole('heading', { name: 'Tus Cuotas' }).first().waitFor({ timeout: 20000 });
    await shot(page, 'socio-03-panel-alpha');
  });

  await safe('socio-04-pagar', async () => {
    const payBtn = page.getByRole('button', { name: /pagar ahora/i }).first();
    await payBtn.waitFor({ timeout: 10000 });
    await payBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot(page, 'socio-04-pagar'); // fee card with its pay button
  });

  await safe('socio-05-cuenta', async () => {
    await page.goto(`${BASE}/pagos/${ALPHA_CLUB}/cuenta?dni=${JUAN_DNI}`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'socio-05-cuenta');
  });

  await safe('socio-06-codigo-otp', async () => {
    await page.goto(`${BASE}/pagos/${OTP_CLUB}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('input[placeholder="Ingresá tu DNI"]');
    await page.fill('input[placeholder="Ingresá tu DNI"]', MARIA_DNI);
    await page.getByRole('button', { name: /buscar/i }).click();
    await page.waitForSelector('input[placeholder*="código"]', { timeout: 20000 });
    await shot(page, 'socio-06-codigo-otp');
  });

  await safe('socio-07-panel-otp', async () => {
    await page.fill('input[placeholder*="código"]', OTP_CODE);
    await page.getByRole('button', { name: /verificar/i }).click();
    await page.getByRole('heading', { name: 'Tus Cuotas' }).first().waitFor({ timeout: 20000 });
    await shot(page, 'socio-07-panel-otp');
  });

  await safe('socio-08-historial', async () => {
    await page.getByRole('link', { name: /historial de pagos/i }).first().click();
    await page.waitForLoadState('networkidle');
    await shot(page, 'socio-08-historial');
  });

  await safe('socio-10-mensajes', async () => {
    // Keep María's OTP session intact (no other club in between).
    await page.goto(`${BASE}/pagos/${OTP_CLUB}/mensajes?dni=${MARIA_DNI}`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'socio-10-mensajes');
  });

  // LAST: this bypass club issues a session cookie for Juan and would overwrite
  // María's — keep it after every club-libres shot.
  await safe('socio-09-debito', async () => {
    await page.goto(`${BASE}/pagos/${ALPHA_CLUB}?dni=${JUAN_DNI}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('input[placeholder="Ingresá tu DNI"]');
    await page.getByRole('button', { name: /buscar/i }).click();
    const heading = page.getByRole('heading', { name: 'Débito automático' });
    await heading.waitFor({ timeout: 20000 });
    await heading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot(page, 'socio-09-debito');
  });

  // ---------- INSTITUCIÓN (admin) ----------
  await safe('admin-01-login', async () => {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    await shot(page, 'admin-01-login');
    await page.fill('#email', ADMIN.email);
    await page.fill('#password', ADMIN.pass);
    await page.getByRole('button', { name: /ingresar/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 30000 });
  });

  await safe('admin-02-panel', async () => {
    await page.waitForLoadState('networkidle');
    await shot(page, 'admin-02-panel');
  });

  const adminGo = async (name, url) => {
    await safe(name, async () => {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 });
      await shot(page, name);
    });
  };

  await adminGo('admin-03-socios', '/admin/socios');
  await adminGo('admin-04-cuotas', '/admin/cuotas');
  await adminGo('admin-05-pagos', '/admin/pagos');
  await adminGo('admin-06-debito', '/admin/debito-automatico');
  await adminGo('admin-07-mensajes', '/admin/mensajes');
  await adminGo('admin-08-reportes', '/admin/reportes');

  await safe('admin-09-config', async () => {
    await page.goto(`${BASE}/admin/configuracion`, { waitUntil: 'networkidle', timeout: 60000 });
    // Switch to the Messaging tab (UI only — no save).
    await page.getByRole('tab', { name: /mensajer/i }).click();
    await page.waitForTimeout(700);
    await shot(page, 'admin-09-config');
  });

  await browser.close();
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL'));
  console.log(`SUMMARY: ${results.filter((r) => r.startsWith('OK')).length} ok, ${failed.length} failed`);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
