/**
 * HTTP-level cross-institution isolation walkthrough (read-only GET probes).
 *
 * Unlike walkthrough-cross-institution.ts (which queries the DB directly and can
 * only prove data-shape integrity), this exercises the real app boundary: it logs
 * in through NextAuth and probes the admin/member APIs to prove that one
 * institution's admin cannot see another institution's data.
 *
 * Credentials and DNIs come from env vars so nothing sensitive is committed.
 * Checks whose credentials are missing are skipped (reported as SKIP).
 *
 * Required env:
 *   BASE_URL                (default http://localhost:3000)
 *   WALK_LIBRES_EMAIL / WALK_LIBRES_PASSWORD / WALK_LIBRES_DNI / WALK_LIBRES_SLUG   (club A admin)
 *   WALK_ALPHA_EMAIL  / WALK_ALPHA_PASSWORD  / WALK_ALPHA_DNI  / WALK_ALPHA_SLUG    (club B admin)
 *   WALK_SUPER_EMAIL  / WALK_SUPER_PASSWORD                      (SUPER_ADMIN)
 *
 * Usage:
 *   WALK_LIBRES_EMAIL=... WALK_LIBRES_PASSWORD=... WALK_LIBRES_DNI=... \
 *   WALK_ALPHA_EMAIL=...  WALK_ALPHA_PASSWORD=...  WALK_ALPHA_DNI=...  \
 *   WALK_SUPER_EMAIL=...  WALK_SUPER_PASSWORD=...  \
 *   npx tsx scripts/walkthrough-http-isolation.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

interface Result { name: string; pass: boolean; skipped?: boolean; detail: string }
const results: Result[] = [];
function test(name: string, pass: boolean, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`);
}
function skip(name: string, detail: string) {
  results.push({ name, pass: true, skipped: true, detail });
  console.log(`SKIP  ${name} :: ${detail}`);
}

async function login(email: string, password: string): Promise<string | null> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const sessCookie = (csrfRes.headers.get('set-cookie') || '').split(';')[0];

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: sessCookie },
    body: new URLSearchParams({ email, password, csrfToken }),
    redirect: 'manual',
  });

  const setCookies = res.headers.getSetCookie?.() || [];
  const all = [sessCookie, ...setCookies.map((c) => c.split(';')[0])];
  return all.find((c) => /^(__Secure-)?next-auth\.session-token=/.test(c)) || null;
}

async function get(path: string, cookie: string | null) {
  const res = await fetch(`${BASE}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: 'manual',
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

function dniList(json: unknown): string[] {
  const data = (json as { data?: Array<{ dni?: string }> })?.data;
  return Array.isArray(data) ? data.map((m) => m.dni ?? '') : [];
}

async function main() {
  console.log(`=== Cross-Isolation HTTP Walkthrough (${BASE}) ===\n`);

  const cfg = {
    libresEmail: process.env.WALK_LIBRES_EMAIL,
    libresPassword: process.env.WALK_LIBRES_PASSWORD,
    libresDni: process.env.WALK_LIBRES_DNI,
    libresSlug: process.env.WALK_LIBRES_SLUG,
    alphaEmail: process.env.WALK_ALPHA_EMAIL,
    alphaPassword: process.env.WALK_ALPHA_PASSWORD,
    alphaDni: process.env.WALK_ALPHA_DNI,
    alphaSlug: process.env.WALK_ALPHA_SLUG,
    superEmail: process.env.WALK_SUPER_EMAIL,
    superPassword: process.env.WALK_SUPER_PASSWORD,
  };

  const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const libres = await login(cfg.libresEmail!, cfg.libresPassword!);
  const alpha = await login(cfg.alphaEmail!, cfg.alphaPassword!);
  const superAdmin = await login(cfg.superEmail!, cfg.superPassword!);

  test('Login admin club-libres', !!libres);
  test('Login admin club-alpha', !!alpha);
  test('Login super-admin', !!superAdmin);
  if (!libres || !alpha || !superAdmin) { summary(); process.exit(1); }

  // --- Unauthenticated ---
  const anon = await get('/api/admin/members', null);
  test('Anon /api/admin/members -> 401', anon.status === 401, `status=${anon.status}`);

  // --- Resolve institution ids (super-admin only endpoint) ---
  const institutions = await get('/api/admin/institutions', superAdmin);
  const instData = (institutions.json as { data?: Array<{ id: string; slug: string }> })?.data ?? [];
  const alphaInstId = instData.find((i) => i.slug === cfg.alphaSlug)?.id;

  // --- ADMIN isolation ---
  const libresMembers = await get('/api/admin/members?limit=100', libres);
  const libresDnis = dniList(libresMembers.json);
  test('Libres admin members 200', libresMembers.status === 200, `status=${libresMembers.status}`);
  test('Libres admin sees own DNI', libresDnis.includes(cfg.libresDni!), `dnis=${libresDnis.length}`);
  test('Libres admin does NOT see alpha DNI', !libresDnis.includes(cfg.alphaDni!));

  const crossSearch = await get(`/api/admin/members?search=${cfg.alphaDni}`, libres);
  test('Libres admin search=alpha DNI -> 0 results', dniList(crossSearch.json).length === 0,
    `status=${crossSearch.status} count=${dniList(crossSearch.json).length}`);

  if (alphaInstId) {
    const spoof = await get(`/api/admin/members?institutionId=${alphaInstId}&limit=100`, libres);
    const spoofDnis = dniList(spoof.json);
    test('Libres admin + foreign institutionId ignored',
      spoofDnis.includes(cfg.libresDni!) && !spoofDnis.includes(cfg.alphaDni!),
      `status=${spoof.status} count=${spoofDnis.length}`);
  } else {
    skip('Libres admin + foreign institutionId ignored', 'could not resolve alpha institution id');
  }

  const alphaMembers = await get('/api/admin/members?limit=100', alpha);
  const alphaDnis = dniList(alphaMembers.json);
  test('Alpha admin members 200', alphaMembers.status === 200, `status=${alphaMembers.status}`);
  test('Alpha admin sees own DNI', alphaDnis.includes(cfg.alphaDni!));
  test('Alpha admin does NOT see libres DNI', !alphaDnis.includes(cfg.libresDni!));

  // --- SUPER_ADMIN scope ---
  const superAll = await get('/api/admin/members?limit=100', superAdmin);
  const superAllDnis = dniList(superAll.json);
  test('Super-admin (no scope) sees both clubs',
    superAllDnis.includes(cfg.libresDni!) && superAllDnis.includes(cfg.alphaDni!),
    `count=${superAllDnis.length}`);

  const libresInstId = instData.find((i) => i.slug === cfg.libresSlug)?.id;
  if (libresInstId) {
    const scoped = await get(`/api/admin/members?institutionId=${libresInstId}&limit=100`, superAdmin);
    const scopedDnis = dniList(scoped.json);
    test('Super-admin scoped to libres sees only libres',
      scopedDnis.includes(cfg.libresDni!) && !scopedDnis.includes(cfg.alphaDni!),
      `count=${scopedDnis.length}`);
  } else {
    skip('Super-admin scoped to libres sees only libres', 'could not resolve libres institution id');
  }

  // --- /api/admin/institutions is SUPER_ADMIN-only ---
  const libresInst = await get('/api/admin/institutions', libres);
  const alphaInst = await get('/api/admin/institutions', alpha);
  test('Club admin denied /api/admin/institutions (libres)', libresInst.status === 403, `status=${libresInst.status}`);
  test('Club admin denied /api/admin/institutions (alpha)', alphaInst.status === 403, `status=${alphaInst.status}`);
  const superInst = await get('/api/admin/institutions', superAdmin);
  test('Super-admin allowed /api/admin/institutions', superInst.status === 200, `status=${superInst.status}`);

  // --- Member portal: DNI scoped per club (public, no session) ---
  const ownLookup = await get(`/api/member/fees?dni=${cfg.libresDni}&clubSlug=${cfg.libresSlug}`, null);
  test('Portal club A + own DNI -> 200', ownLookup.status === 200, `status=${ownLookup.status}`);

  const crossLookup = await get(`/api/member/fees?dni=${cfg.alphaDni}&clubSlug=${cfg.libresSlug}`, null);
  test('Portal club A + club B DNI -> 404', crossLookup.status === 404, `status=${crossLookup.status}`);

  const crossLookup2 = await get(`/api/member/fees?dni=${cfg.libresDni}&clubSlug=${cfg.alphaSlug}`, null);
  test('Portal club B + club A DNI -> 404', crossLookup2.status === 404, `status=${crossLookup2.status}`);

  const badSlug = await get(`/api/member/fees?dni=${cfg.libresDni}&clubSlug=does-not-exist`, null);
  test('Portal unknown slug -> 404', badSlug.status === 404, `status=${badSlug.status}`);

  summary();
}

function summary() {
  const pass = results.filter((r) => r.pass && !r.skipped).length;
  const skipCount = results.filter((r) => r.skipped).length;
  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n=== Summary: ${pass} pass, ${skipCount} skip, ${fail} fail ===`);
  for (const r of results.filter((x) => !x.pass)) {
    console.log(`  FAIL: ${r.name} ${r.detail}`);
  }
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
