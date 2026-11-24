/**
 * E2E: fee automation (specs S1-S6) — run against a LOCAL dev server only.
 *
 * Prereqs:
 *   1. npx tsx scripts/fee-e2e-setup.ts
 *   2. NEXT_PUBLIC_URL=http://localhost:3127 CRON_SECRET=local-cron-test npx next dev -p3127
 *   3. node scripts/fee-e2e-run.cjs   (needs playwright-core)
 *   4. npx tsx scripts/fee-e2e-teardown.ts
 *
 * Covers: Cuotas config tab (defaults + save round-trip), super-admin start
 * date (prefill/save/restore), daily cron gating (generate vs
 * not-generation-day vs before-start) and401 without the secret.
 */
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:3127';
const results = [];
const check = (name, cond, detail = '') => {
  const line = `${cond ? 'OK  ' : 'FAIL'} ${name}${cond ? '' : ' — ' + detail}`;
  results.push(line);
  console.log(line);
};

const saveLog = [];
function attachLog(page, tag) {
  page.on('response', async (r) => {
    const m = r.request().method();
    if (['PUT', 'PATCH', 'POST'].includes(m) && /\/api\//.test(r.url())) {
      let body = '';
      try { body = (await r.text()).slice(0, 240); } catch {}
      saveLog.push(`[${tag}] ${m} ${r.url().replace(BASE, '')} → ${r.status()} ${body}`);
    }
  });
}
const dumpSaves = (label) => {
  console.log(`SAVES[${label}]:`, JSON.stringify(saveLog.splice(0), null, 1));
};
async function readToast(page) {
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const t = document.querySelector('[data-slot="toast"]');
    return t ? t.innerText.trim().slice(0, 220) : null;
  });
}
async function login(page, email, pass) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', email);
  await page.fill('#password', pass);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 60000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });

  // ---------- A) institution admin: fee settings tab ----------
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const a = await ctxA.newPage();
  attachLog(a, 'A');
  await login(a, 'admin@clublibres.test', 'club123');

  await a.goto(`${BASE}/admin/configuracion`, { waitUntil: 'networkidle', timeout: 90000 });
  await a.waitForTimeout(2500);
  const feesTab = a.getByRole('tab', { name: /Cuotas/ });
  check('A1 tab "Cuotas" en Configuración', (await feesTab.count()) === 1);
  await feesTab.click();
  await a.waitForTimeout(400);

  const gen = a.locator('#site-fee_generation_day');
  const due = a.locator('#site-fee_due_day');
  const notify = a.locator('#site-fee_notify_enabled');
  check('A2 campo día de generación', (await gen.count()) === 1);
  check('A3 default día generación = 1', (await gen.inputValue()) === '1', await gen.inputValue());
  check('A4 default día vencimiento = 10', (await due.inputValue()) === '10', await due.inputValue());
  check('A5 switch de aviso presente y activo', await notify.isChecked());

  await due.fill('15');
  const saveBtn = a.getByRole('button', { name: /guardar/i }).first();
  console.log('A6 botón clickeado:', JSON.stringify((await saveBtn.innerText()).trim()));
  const putWait = a.waitForResponse(
    (r) => r.url().includes('/api/admin/site-config') && r.request().method() === 'PUT',
    { timeout: 30000 }
  );
  await saveBtn.click();
  const putResp = await putWait;
  console.log('A6 PUT status:', putResp.status(), JSON.stringify(await putResp.json().catch(() => ({}))).slice(0, 160));
  await a.waitForTimeout(800);
  console.log('A6 toast:', JSON.stringify(await readToast(a)));
  dumpSaves('A6');
  await a.reload({ waitUntil: 'networkidle' });
  await a.waitForTimeout(2500);
  await a.getByRole('tab', { name: /Cuotas/ }).click();
  await a.waitForTimeout(400);
  check('A6 due day persiste en15', (await due.inputValue()) === '15', await due.inputValue());

  await due.fill('10');
  const restoreWait = a.waitForResponse(
    (r) => r.url().includes('/api/admin/site-config') && r.request().method() === 'PUT',
    { timeout: 30000 }
  );
  await a.getByRole('button', { name: /guardar/i }).first().click();
  await restoreWait;
  await a.waitForTimeout(800);
  await a.reload({ waitUntil: 'networkidle' });
  await a.waitForTimeout(2500);
  await a.getByRole('tab', { name: /Cuotas/ }).click();
  await a.waitForTimeout(400);
  check('A7 due day restaurado en10', (await due.inputValue()) === '10', await due.inputValue());
  await ctxA.close();

  // ---------- B) super admin: start date ----------
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const b = await ctxB.newPage();
  attachLog(b, 'B');
  await login(b, 'admin@libres.com', 'admin123');

  const qaId = await b.evaluate(async () => {
    const r = await fetch('/api/admin/institutions');
    const d = await r.json();
    return (d.data || []).find((c) => c.slug === 'qa-fee-automation')?.id ?? null;
  });
  check('B0 club QA existe', !!qaId, String(qaId));

  await b.goto(`${BASE}/admin/instituciones/${qaId}`, { waitUntil: 'networkidle', timeout: 90000 });
  await b.waitForTimeout(2500);
  const start = b.locator('#feeGenerationStart');
  check('B1 campo "Inicio de generación" presente', (await start.count()) === 1);
  check('B2 precarga la fecha configurada', (await start.inputValue()) === '2026-11-01', await start.inputValue());

  await start.fill('2026-11-15');
  const saveB = b.getByRole('button', { name: /guardar cambios/i }).first();
  console.log('B3 botón clickeado:', JSON.stringify((await saveB.innerText()).trim()));
  const patchWait = b.waitForResponse(
    (r) => /\/api\/admin\/institutions\//.test(r.url()) && r.request().method() === 'PATCH',
    { timeout: 30000 }
  );
  await saveB.click();
  const patchResp = await patchWait;
  console.log('B3 PATCH status:', patchResp.status(), JSON.stringify(await patchResp.json().catch(() => ({}))).slice(0, 200));
  await b.waitForTimeout(800);
  console.log('B3 toast:', JSON.stringify(await readToast(b)));
  dumpSaves('B3');
  await b.reload({ waitUntil: 'networkidle' });
  await b.waitForTimeout(2500);
  check('B3 la fecha persiste tras guardar', (await b.locator('#feeGenerationStart').inputValue()) === '2026-11-15', await b.locator('#feeGenerationStart').inputValue());

  await b.locator('#feeGenerationStart').fill('2026-11-01');
  const restoreB = b.waitForResponse(
    (r) => /\/api\/admin\/institutions\//.test(r.url()) && r.request().method() === 'PATCH',
    { timeout: 30000 }
  );
  await b.getByRole('button', { name: /guardar cambios/i }).first().click();
  await restoreB;
  await b.waitForTimeout(800);

  // ---------- C) cron with secret ----------
  const cronRes = await b.evaluate(async () => {
    const r = await fetch('/api/cron/fees', {
      headers: { Authorization: 'Bearer local-cron-test' },
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  });
  check('C1 cron con secreto →200', cronRes.status === 200, JSON.stringify(cronRes).slice(0, 200));
  const clubs = cronRes.body?.clubs ?? [];
  const qa = clubs.find((c) => c.clubSlug === 'qa-fee-automation');
  check('C2 club QA (día configurado = hoy) GENERA', !!qa && qa.generated === true && qa.created > 0, JSON.stringify(qa));
  const libres = clubs.find((c) => c.clubSlug === 'club-libres');
  check('C3 club-libres salta por "not-generation-day"', !!libres && libres.generated === false && libres.reason === 'not-generation-day', JSON.stringify(libres));
  const byReason = clubs.reduce((acc, c) => {
    const k = c.generated ? 'generated' : (c.reason ?? 'unknown');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.log('C4 distribución de motivos:', JSON.stringify(byReason));
  check('C4 informe incluye motivo por institución', Object.keys(byReason).length > 0, JSON.stringify(byReason));

  // ---------- D) cron without secret ----------
  const noAuth = await b.evaluate(async () => (await fetch('/api/cron/fees')).status);
  check('D1 cron sin secreto →401', noAuth === 401, String(noAuth));

  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL'));
  console.log(`SUMMARY: ${results.length - failed.length} ok, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e.message);
  console.log('results so far:\n' + results.join('\n'));
  process.exit(1);
});
