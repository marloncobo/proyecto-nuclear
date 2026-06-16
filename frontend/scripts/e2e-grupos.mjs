import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const API = 'http://localhost:3000/api';
const results = [];

function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` - ${detail}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

async function loginApi(email, password) {
  const { status, data } = await api('POST', '/auth/login', {
    body: { email, password },
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Login API fallo: ${status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function loginUi(page, email, password, expectedUrlPattern) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('#email');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(expectedUrlPattern, { timeout: 15000 });
}

async function setupTestUsers() {
  const admin = await loginApi('admin@nuclear.local', 'Admin123*');
  const suffix = Date.now();
  const profEmail = `prof.fe.${suffix}@test.local`;
  const estEmail = `est.fe.${suffix}@test.local`;

  let r = await api('POST', '/auth/register', {
    token: admin.accessToken,
    body: {
      fullName: 'Profesor Frontend',
      email: profEmail,
      password: 'Profesor123*',
      role: 'PROFESOR',
    },
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`Crear profesor: ${r.status}`);
  }
  const profesor = r.data.user;

  r = await api('POST', '/auth/register', {
    token: admin.accessToken,
    body: {
      fullName: 'Estudiante Frontend',
      email: estEmail,
      password: 'Estudiante123*',
      role: 'ESTUDIANTE',
    },
  });
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`Crear estudiante: ${r.status}`);
  }
  const estudiante = r.data.user;

  return { admin, profesor, estudiante, profEmail, estEmail };
}

async function logoutUi(page) {
  const cerrarSesion = page
    .locator('button')
    .filter({ hasText: /Cerrar sesi[oó]n|Salir/i })
    .first();
  await cerrarSesion.click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let users;
  try {
    users = await setupTestUsers();
    log('Setup usuarios de prueba via API', true);
  } catch (e) {
    log('Setup usuarios de prueba via API', false, e.message);
    await browser.close();
    process.exit(1);
  }

  try {
    await loginUi(page, 'admin@nuclear.local', 'Admin123*', /\/admin\/dashboard/);
    const adminTitle = await page.locator('h1').first().textContent();
    log(
      'Login ADMIN y dashboard',
      adminTitle?.includes('Panel de administración'),
      adminTitle ?? '',
    );

    await page.goto(`${BASE}/admin/grupos`);
    await page.waitForURL(/\/admin\/grupos/);
    const tituloGrupos = await page.locator('h1').first().textContent();
    log(
      'ADMIN llega a grupos',
      tituloGrupos?.includes('Grupos académicos'),
      tituloGrupos ?? '',
    );

    await page.goto(`${BASE}/admin/grupos/nuevo`);
    await page.waitForURL(/\/admin\/grupos\/nuevo/);
    const nombreGrupo = `Grupo UI ${Date.now()}`;
    await page.fill('#nombre', nombreGrupo);
    await page.fill('#descripcion', 'Descripcion desde E2E');
    await page.selectOption('#semestre', 'Primer semestre');
    await page.selectOption('#profesorId', users.profesor.id);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/grupos\/[a-f0-9-]+$/i, { timeout: 15000 });
    log('ADMIN crea grupo y llega al detalle', true);

    const grupoUrl = page.url();
    await page.click('button:has-text("Asignación múltiple")');
    await page.waitForSelector('#estudianteIds');
    await page
      .locator('label.student-picker__item', { hasText: users.estEmail })
      .locator('input[type="checkbox"]')
      .check();
    await page.click('button:has-text("Asignar seleccionados")');
    await page.waitForSelector('text=Estudiante Frontend', { timeout: 10000 });
    log('ADMIN asigna estudiante en el detalle', true);

    await page.click('a:has-text("Editar")');
    await page.waitForURL(/\/editar$/);
    await page.fill('#nombre', `${nombreGrupo} Editado`);
    await page.click('button[type="submit"]');
    await page.waitForURL(grupoUrl);
    const detailTitle = await page.locator('h1').first().textContent();
    log('ADMIN edita grupo', detailTitle?.includes('Editado'), detailTitle ?? '');

    await logoutUi(page);
    log('Logout ADMIN', page.url().includes('/login'));

    await loginUi(page, users.profEmail, 'Profesor123*', /\/profesor\/dashboard/);
    const profesorTitle = await page.locator('h1').first().textContent();
    log('Login PROFESOR', profesorTitle?.includes('Panel docente'), profesorTitle ?? '');

    await page.goto(`${BASE}/profesor/grupos`);
    await page.waitForURL(/\/profesor\/grupos/);
    await page.click('a:has-text("Nuevo grupo")');
    await page.waitForURL(/\/profesor\/grupos\/nuevo/);
    const sinSelectorProfesor = (await page.locator('#profesorId').count()) === 0;
    log('PROFESOR formulario sin selector profesor', sinSelectorProfesor);

    await page.fill('#nombre', `Grupo Profesor ${Date.now()}`);
    await page.selectOption('#semestre', 'Primer semestre');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/profesor\/grupos\/[a-f0-9-]+$/i);
    log('PROFESOR crea su grupo', true);

    await logoutUi(page);
    log('Logout PROFESOR', page.url().includes('/login'));

    await loginUi(page, users.estEmail, 'Estudiante123*', /\/estudiante\/dashboard/);
    const estudianteTitle = await page.locator('h1').first().textContent();
    log(
      'Login ESTUDIANTE',
      estudianteTitle?.includes('Panel del estudiante'),
      estudianteTitle ?? '',
    );

    const crearGrupoOculto = (await page.locator('a:has-text("Nuevo grupo")').count()) === 0;
    log('ESTUDIANTE no ve crear grupo', crearGrupoOculto);

    const casosAsignadosVisible = await page
      .getByRole('link', { name: /Casos asignados/i })
      .isVisible();
    log('ESTUDIANTE ve acceso a casos asignados', casosAsignadosVisible);

    await logoutUi(page);
    await page.fill('#email', 'noexiste@test.local');
    await page.fill('#password', 'WrongPass1!');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.login-alert', { timeout: 10000 });
    const loginError = await page.locator('.login-alert').textContent();
    log('Login inválido muestra error', Boolean(loginError?.trim()), loginError?.trim() ?? '');

    await page.goto(`${BASE}/admin/grupos`);
    await page.waitForURL(/\/login/, { timeout: 10000 });
    log('Sin sesión redirige a login', page.url().includes('/login'));
  } catch (e) {
    log('Prueba E2E interrumpida', false, e.message);
    console.error(e);
  }

  await browser.close();

  console.log('\n=== RESUMEN ===');
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'OK' : 'FAIL'} ${r.name}`);
  }

  if (failed.length) {
    process.exit(1);
  }

  console.log('\nTodas las pruebas frontend pasaron.');
}

run();
