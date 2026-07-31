'use strict';

const KEYS = {
  users: 'tm_users_v1',
  questions: 'tm_questions_v1',
  attempts: 'tm_attempts_v1',
  draws: 'tm_draws_v1',
  settings: 'tm_settings_v1',
  session: 'tm_session_v1'
};

const CATEGORY_META = {
  vehicle: { name: 'Movilidad en vehículos', short: 'Vehículos', icon: '🚗', className: 'vehicle' },
  walk: { name: 'Movilidad a pie', short: 'A pie', icon: '🚶', className: 'walk' },
  bike: { name: 'Bicicleta y scooter', short: 'Bici / scooter', icon: '🚲', className: 'bike' }
};

const seedQuestions = [
  { id:'q1', category:'walk', question:'Vas caminando a una reunión y recibes una llamada urgente. ¿Qué acción es más segura?', options:['Contestar mientras cruzas para no atrasarte','Detenerte en un lugar seguro antes de responder','Usar audífonos y continuar caminando'], correct:1, explanation:'Detenerse elimina la distracción visual y cognitiva mientras te desplazas. La urgencia no justifica exponerse a una caída o atropello.' },
  { id:'q2', category:'walk', question:'Está lloviendo y la entrada del edificio tiene el piso mojado. ¿Qué debes hacer?', options:['Caminar más rápido para pasar pronto','Entrar con pasos cortos, usar pasamanos y observar el piso','Caminar por el borde aunque esté señalizado'], correct:1, explanation:'Los pasos cortos, el uso de apoyo y la observación del entorno reducen el riesgo de resbalones.' },
  { id:'q3', category:'walk', question:'Te quedan cinco minutos para llegar y el semáforo peatonal está en rojo. ¿Cuál es la mejor decisión?', options:['Cruzar si no ves vehículos cerca','Esperar la luz verde y avisar un posible retraso','Correr por un punto sin cruce habilitado'], correct:1, explanation:'Planificar y comunicar un retraso es más seguro que compensar el tiempo con una conducta riesgosa.' },
  { id:'q4', category:'walk', question:'Al bajar una escalera con documentos y teléfono en las manos, lo más seguro es:', options:['Mantener una mano libre para usar el pasamanos','Bajar de lado para ver mejor los peldaños','Apurarse antes de que llegue más gente'], correct:0, explanation:'Mantener una mano libre y usar el pasamanos mejora la estabilidad y permite reaccionar ante un tropiezo.' },
  { id:'q5', category:'walk', question:'¿Qué práctica reduce mejor el riesgo de tropiezos en trayectos a pie?', options:['Revisar mensajes solo cuando el camino está despejado','Guardar el teléfono mientras caminas y detenerte para usarlo','Caminar pegado a otras personas'], correct:1, explanation:'La forma más segura de usar el teléfono durante un trayecto es detenerse en un lugar protegido.' },
  { id:'q6', category:'walk', question:'Si una vereda está deteriorada y no existe una alternativa inmediata, debes:', options:['Mantener la velocidad habitual','Reducir la velocidad, observar el terreno y reportar el punto crítico','Caminar por la calzada para evitar desniveles'], correct:1, explanation:'Adaptar la marcha y reportar el peligro ayuda a prevenir tu accidente y el de otras personas.' },

  { id:'q7', category:'vehicle', question:'Mientras conduces hacia una visita, llega un mensaje de un cliente. ¿Qué corresponde hacer?', options:['Leerlo en un semáforo','Responder con una nota de voz','Esperar hasta estacionar en un lugar seguro'], correct:2, explanation:'La conducción requiere atención completa. Un semáforo detenido no garantiza que sea seguro manipular el teléfono.' },
  { id:'q8', category:'vehicle', question:'Tienes dos reuniones consecutivas y el tiempo de traslado es insuficiente. ¿Qué opción es más segura?', options:['Aumentar la velocidad dentro del límite','Avisar y reprogramar o retrasar la siguiente reunión','Usar una ruta desconocida sin revisar'], correct:1, explanation:'La presión de tiempo es un factor de riesgo. Reprogramar es una decisión preventiva válida.' },
  { id:'q9', category:'vehicle', question:'Antes de iniciar un desplazamiento en automóvil, una medida efectiva es:', options:['Configurar la ruta y silenciar notificaciones antes de partir','Revisar el teléfono solo en calles tranquilas','Conducir más cerca del vehículo delantero'], correct:0, explanation:'Preparar la ruta y eliminar notificaciones antes de conducir reduce distracciones y decisiones improvisadas.' },
  { id:'q10', category:'vehicle', question:'Si sientes somnolencia durante la conducción, debes:', options:['Abrir la ventana y continuar','Tomar una bebida energética y acelerar el viaje','Detenerte en un lugar seguro y descansar o cambiar de conductor'], correct:2, explanation:'La somnolencia disminuye el tiempo de reacción. Ventilar o consumir cafeína no reemplaza el descanso.' },
  { id:'q11', category:'vehicle', question:'Al estacionar para una visita en terreno, es preferible:', options:['Elegir el espacio más cercano aunque tenga poca visibilidad','Estacionar en un lugar habilitado, iluminado y con salida segura','Dejar el vehículo momentáneamente en doble fila'], correct:1, explanation:'Un estacionamiento habilitado y visible disminuye riesgos de colisión, caída y exposición personal.' },
  { id:'q12', category:'vehicle', question:'Si comienza una lluvia intensa durante el trayecto, lo más seguro es:', options:['Mantener velocidad para salir pronto de la zona','Reducir velocidad, aumentar distancia y evaluar detenerse','Encender luces altas permanentemente'], correct:1, explanation:'La lluvia reduce visibilidad y adherencia. Debes adaptar la conducción y detenerte si las condiciones son inseguras.' },

  { id:'q13', category:'bike', question:'En bicicleta o scooter, el casco debe utilizarse:', options:['Solo en avenidas principales','En todo el desplazamiento y correctamente ajustado','Solo cuando existe fiscalización'], correct:1, explanation:'El casco correctamente ajustado reduce la gravedad de lesiones ante una caída o colisión.' },
  { id:'q14', category:'bike', question:'Antes de usar un scooter compartido para una visita, debes:', options:['Revisar frenos, ruedas, luces y estado general','Confiar en que la aplicación ya lo revisó','Probar la velocidad máxima de inmediato'], correct:0, explanation:'Una inspección breve permite detectar fallas visibles antes de iniciar el desplazamiento.' },
  { id:'q15', category:'bike', question:'¿Cuál es una práctica segura al circular en bicicleta o scooter?', options:['Usar audífonos en ambos oídos','Señalizar maniobras y mantener atención al entorno','Circular entre vehículos detenidos a alta velocidad'], correct:1, explanation:'Comunicar tus maniobras y mantener percepción del entorno mejora tu visibilidad y capacidad de reacción.' },
  { id:'q16', category:'bike', question:'Si el pavimento está mojado, debes:', options:['Frenar bruscamente antes de cada curva','Reducir velocidad y evitar movimientos o frenadas repentinas','Circular sobre líneas pintadas para tener referencia'], correct:1, explanation:'Las superficies mojadas y pintadas pueden ser resbaladizas. Los movimientos progresivos disminuyen la pérdida de control.' },
  { id:'q17', category:'bike', question:'Llevas documentos y un bolso mientras usas bicicleta. La opción más segura es:', options:['Colgar el bolso del manubrio','Usar una mochila ajustada o sistema de carga estable','Sostener los documentos con una mano'], correct:1, explanation:'La carga debe permanecer estable y no interferir con el manubrio, la visión ni el equilibrio.' },
  { id:'q18', category:'bike', question:'Al acercarte a una intersección con poca visibilidad, corresponde:', options:['Acelerar para cruzar primero','Reducir velocidad y confirmar que los demás te hayan visto','Tocar la bocina y mantener la marcha'], correct:1, explanation:'Reducir la velocidad permite observar, anticipar errores ajenos y detenerte a tiempo.' }
];

const defaultSettings = {
  prizeAmount: 30000,
  drawFrequency: 'Mensual',
  participationMode: 'correct_only'
};

let currentUser = null;
let currentView = 'dashboard';
let selectedAnswer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const load = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const formatDate = iso => new Intl.DateTimeFormat('es-CL', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${iso}T12:00:00`));
const money = value => new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(value);
const escapeHtml = value => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function initStorage() {
  if (!localStorage.getItem(KEYS.questions)) save(KEYS.questions, seedQuestions);
  if (!localStorage.getItem(KEYS.attempts)) save(KEYS.attempts, []);
  if (!localStorage.getItem(KEYS.draws)) save(KEYS.draws, []);
  if (!localStorage.getItem(KEYS.settings)) save(KEYS.settings, defaultSettings);
  if (!localStorage.getItem(KEYS.users)) {
    save(KEYS.users, [{
      id:'u-admin', name:'Administrador Demo', rut:'12345678-5', branch:'Casa Matriz', role:'admin',
      passwordHash:'3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', createdAt:new Date().toISOString()
    }]);
  }
}

function normalizeRut(value) { return String(value).replace(/[^0-9kK]/g, '').toUpperCase(); }
function formatRut(value) {
  const clean = normalizeRut(value);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${clean.slice(-1)}`;
}
function validRut(value) {
  const clean = normalizeRut(value);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0,-1), dv = clean.slice(-1);
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return dv === expected;
}
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
}
function initials(name) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase(); }
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

function bindAuth() {
  $$('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-auth-tab]').forEach(x => x.classList.toggle('active', x === btn));
    $('#login-form').classList.toggle('hidden', btn.dataset.authTab !== 'login');
    $('#register-form').classList.toggle('hidden', btn.dataset.authTab !== 'register');
    $('#auth-message').textContent = '';
  }));
  ['login-rut','register-rut'].forEach(id => $(`#${id}`).addEventListener('input', e => { e.target.value = formatRut(e.target.value); }));

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const rut = normalizeRut($('#login-rut').value);
    const hash = await sha256($('#login-password').value);
    const user = load(KEYS.users).find(u => u.rut === rut && u.passwordHash === hash);
    if (!user) { $('#auth-message').textContent = 'RUT o clave incorrectos.'; return; }
    save(KEYS.session, { userId:user.id });
    startSession(user);
  });

  $('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#register-name').value.trim();
    const rut = normalizeRut($('#register-rut').value);
    const branch = $('#register-branch').value.trim();
    const password = $('#register-password').value;
    if (!validRut(rut)) { $('#auth-message').textContent = 'Ingresa un RUT chileno válido.'; return; }
    if (password.length < 8) { $('#auth-message').textContent = 'La clave debe tener al menos 8 caracteres.'; return; }
    const users = load(KEYS.users);
    if (users.some(u => u.rut === rut)) { $('#auth-message').textContent = 'Ese RUT ya está registrado.'; return; }
    const user = { id:`u-${crypto.randomUUID()}`, name, rut, branch, role:'user', passwordHash:await sha256(password), createdAt:new Date().toISOString() };
    users.push(user); save(KEYS.users, users); save(KEYS.session, { userId:user.id }); startSession(user);
  });
}

function startSession(user) {
  currentUser = user;
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = user.name;
  $('#user-branch').textContent = user.branch;
  $('#user-initials').textContent = initials(user.name);
  $$('.admin-only').forEach(el => el.classList.toggle('hidden', user.role !== 'admin'));
  navigate('dashboard');
}

function bindNavigation() {
  $$('[data-view]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
  $('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem(KEYS.session); currentUser = null;
    $('#app-view').classList.add('hidden'); $('#auth-view').classList.remove('hidden');
    $('#login-form').reset(); $('#auth-message').textContent = '';
  });
}

function navigate(view) {
  if (view === 'admin' && currentUser.role !== 'admin') return;
  currentView = view;
  const titles = { dashboard:['Movilidad segura','Inicio'], trivia:['Desafío diario','Trivia diaria'], ranking:['Participación','Ranking'], history:['Tu progreso','Mi historial'], admin:['Gestión del programa','Administración'] };
  $('#page-kicker').textContent = titles[view][0]; $('#page-title').textContent = titles[view][1];
  $$('[data-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  selectedAnswer = null;
  ({dashboard:renderDashboard, trivia:renderTrivia, ranking:renderRanking, history:renderHistory, admin:renderAdmin}[view])();
  $('#content').focus({preventScroll:true});
}

function userAttempts(userId = currentUser.id) { return load(KEYS.attempts).filter(a => a.userId === userId); }
function todayAttempt(userId = currentUser.id) { return userAttempts(userId).find(a => a.date === todayKey()); }
function getStreak(attempts) {
  if (!attempts.length) return 0;
  const dates = new Set(attempts.map(a => a.date));
  let streak = 0; const cursor = new Date();
  for (;;) {
    const key = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Santiago' }).format(cursor);
    if (!dates.has(key)) break;
    streak++; cursor.setDate(cursor.getDate()-1);
  }
  return streak;
}
function ticketCount(attempts) { return attempts.reduce((sum,a) => sum + (a.tickets || 0), 0); }

function renderDashboard() {
  const attempts = userAttempts();
  const correct = attempts.filter(a => a.correct).length;
  const rate = attempts.length ? Math.round(correct / attempts.length * 100) : 0;
  const daily = todayAttempt();
  const settings = load(KEYS.settings, defaultSettings);
  const categoryStats = Object.keys(CATEGORY_META).map(category => {
    const rows = attempts.filter(a => a.category === category); const ok = rows.filter(a => a.correct).length;
    return { category, total:rows.length, rate:rows.length ? Math.round(ok/rows.length*100) : 0 };
  });
  $('#content').innerHTML = `
    <section class="hero-banner">
      <div>
        <p class="eyebrow" style="color:#baf3ee">Desafío de hoy</p>
        <h3>${daily ? '¡Trivia completada!' : 'Una decisión segura comienza aquí.'}</h3>
        <p>${daily ? `Hoy respondiste ${daily.correct ? 'correctamente y sumaste oportunidades para el sorteo' : 'y ya puedes revisar la explicación preventiva'}.` : `Responde una situación breve y participa por una gift card de ${money(settings.prizeAmount)}.`}</p>
        <button class="btn" id="hero-action">${daily ? 'Ver resultado' : 'Responder trivia'}</button>
      </div>
      <div class="streak-box"><div><strong>${getStreak(attempts)}</strong><span>días de racha</span></div></div>
    </section>
    <section class="grid stats">
      ${statCard('Preguntas respondidas', attempts.length, '✓')}
      ${statCard('Respuestas correctas', correct, '◎')}
      ${statCard('Efectividad', `${rate}%`, '↗')}
      ${statCard('Oportunidades', ticketCount(attempts), '★')}
    </section>
    <section class="grid two">
      <article class="card">
        <h3>Desempeño por categoría</h3>
        <p class="card-subtitle">Identifica los temas que necesitan más refuerzo.</p>
        <div class="category-list">
          ${categoryStats.map(s => { const m=CATEGORY_META[s.category]; return `<div class="category-row"><div class="category-icon ${m.className}">${m.icon}</div><div><strong>${m.name}</strong><span>${s.total} respuesta${s.total===1?'':'s'}</span><div class="progress"><i style="width:${s.rate}%"></i></div></div><b>${s.rate}%</b></div>`; }).join('')}
        </div>
      </article>
      <article class="card">
        <h3>Cómo funciona</h3>
        <p class="card-subtitle">Un proceso simple, diario y transparente.</p>
        <div class="category-list">
          ${['Responde máximo una trivia al día.','Recibe retroalimentación inmediata.','Una respuesta correcta suma una oportunidad.','Participa en el sorteo corporativo.'].map((t,i)=>`<div class="category-row"><div class="rank-pill">${i+1}</div><div><strong>${t}</strong><span>${['Desde cualquier dispositivo','Aprende incluso si te equivocas','Se registra automáticamente','Ganadores publicados en la plataforma'][i]}</span></div></div>`).join('')}
        </div>
      </article>
    </section>`;
  $('#hero-action').addEventListener('click', () => navigate('trivia'));
}

function statCard(label, value, icon) { return `<article class="card stat-card"><div><span>${label}</span><strong>${value}</strong></div><div class="stat-icon">${icon}</div></article>`; }

function dailyQuestion() {
  const questions = load(KEYS.questions);
  if (!questions.length) return null;
  const source = `${currentUser.id}-${todayKey()}`;
  let hash = 0; for (const char of source) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  return questions[Math.abs(hash) % questions.length];
}

function renderTrivia() {
  const completed = todayAttempt();
  if (completed) { renderCompleted(completed); return; }
  const q = dailyQuestion();
  if (!q) { $('#content').innerHTML = `<article class="card empty">No hay preguntas disponibles. Contacta al administrador.</article>`; return; }
  const meta = CATEGORY_META[q.category];
  $('#content').innerHTML = `<div class="trivia-wrap">
    <div class="trivia-top"><span class="category-badge">${meta.icon} ${meta.name}</span><span class="category-badge">1 pregunta diaria</span></div>
    <article class="question-card">
      <p class="eyebrow">Situación preventiva</p>
      <h3>${escapeHtml(q.question)}</h3>
      <div class="answers">
        ${q.options.map((option,i)=>`<button class="answer" data-answer="${i}"><span class="answer-key">${String.fromCharCode(65+i)}</span><span>${escapeHtml(option)}</span></button>`).join('')}
      </div>
      <button id="submit-answer" class="btn primary full" style="margin-top:22px" disabled>Confirmar respuesta</button>
    </article>
  </div>`;
  $$('.answer').forEach(btn => btn.addEventListener('click', () => {
    selectedAnswer = Number(btn.dataset.answer);
    $$('.answer').forEach(x => x.classList.toggle('selected', x === btn));
    $('#submit-answer').disabled = false;
  }));
  $('#submit-answer').addEventListener('click', () => submitAnswer(q));
}

function submitAnswer(q) {
  if (todayAttempt()) { renderCompleted(todayAttempt()); return; }
  const settings = load(KEYS.settings, defaultSettings);
  const correct = selectedAnswer === q.correct;
  const tickets = settings.participationMode === 'all' ? (correct ? 2 : 1) : (correct ? 1 : 0);
  const attempts = load(KEYS.attempts);
  const attempt = { id:`a-${crypto.randomUUID()}`, userId:currentUser.id, questionId:q.id, date:todayKey(), category:q.category, selected:selectedAnswer, correct, tickets, explanation:q.explanation, question:q.question, answerText:q.options[selectedAnswer], correctText:q.options[q.correct], createdAt:new Date().toISOString(), drawId:null };
  attempts.push(attempt); save(KEYS.attempts, attempts);
  renderCompleted(attempt);
  toast(correct ? '¡Respuesta correcta! Sumaste una oportunidad.' : 'Trivia registrada. Revisa la explicación preventiva.');
}

function renderCompleted(attempt) {
  const meta = CATEGORY_META[attempt.category];
  $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state">
    <div class="big-icon">${attempt.correct ? '🎉' : '💡'}</div>
    <span class="category-badge">${meta.icon} ${meta.name}</span>
    <h3>${attempt.correct ? '¡Respuesta correcta!' : 'Hoy aprendiste algo nuevo'}</h3>
    <p>${attempt.correct ? `Tu participación quedó registrada${attempt.tickets ? ` y sumaste ${attempt.tickets} oportunidad${attempt.tickets===1?'':'es'} para el sorteo` : ''}.` : 'Tu respuesta quedó registrada. La retroalimentación es parte esencial de la experiencia.'}</p>
    <div class="feedback ${attempt.correct ? 'success' : 'error'}" style="text-align:left">
      <h4>Respuesta recomendada</h4>
      <b>${escapeHtml(attempt.correctText)}</b>
      <p>${escapeHtml(attempt.explanation)}</p>
    </div>
    <button id="back-home" class="btn secondary" style="margin-top:20px">Volver al inicio</button>
  </article></div>`;
  $('#back-home').addEventListener('click', () => navigate('dashboard'));
}

function rankingRows() {
  const users = load(KEYS.users).filter(u => u.role !== 'admin');
  const attempts = load(KEYS.attempts);
  return users.map(u => {
    const rows=attempts.filter(a=>a.userId===u.id);
    return { ...u, total:rows.length, correct:rows.filter(a=>a.correct).length, tickets:ticketCount(rows), rate:rows.length?Math.round(rows.filter(a=>a.correct).length/rows.length*100):0 };
  }).sort((a,b)=>b.correct-a.correct || b.tickets-a.tickets || a.name.localeCompare(b.name));
}

function renderRanking() {
  const rows = rankingRows();
  $('#content').innerHTML = `<article class="card"><div class="toolbar"><div><h3>Ranking de aprendizaje</h3><p class="card-subtitle">Ordenado por respuestas correctas. El ranking no reemplaza las reglas del sorteo.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Posición</th><th>Participante</th><th>Equipo</th><th>Correctas</th><th>Efectividad</th><th>Oportunidades</th></tr></thead><tbody>
    ${rows.length ? rows.map((r,i)=>`<tr><td><span class="rank-pill ${i<3?'top':''}">${i+1}</span></td><td><b>${escapeHtml(r.name)}</b></td><td>${escapeHtml(r.branch)}</td><td>${r.correct}</td><td>${r.rate}%</td><td>${r.tickets}</td></tr>`).join('') : `<tr><td colspan="6" class="empty">Aún no hay participantes registrados.</td></tr>`}
    </tbody></table></div></article>`;
}

function renderHistory() {
  const questions = load(KEYS.questions); const map = Object.fromEntries(questions.map(q=>[q.id,q]));
  const rows = userAttempts().sort((a,b)=>b.date.localeCompare(a.date));
  $('#content').innerHTML = `<article class="card"><h3>Historial personal</h3><p class="card-subtitle">Tus resultados y oportunidades acumuladas.</p><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Resultado</th><th>Oportunidades</th><th>Pregunta</th></tr></thead><tbody>
    ${rows.length ? rows.map(a=>`<tr><td>${formatDate(a.date)}</td><td>${CATEGORY_META[a.category].short}</td><td><span class="status ${a.correct?'correct':'incorrect'}">${a.correct?'Correcta':'Incorrecta'}</span></td><td>${a.tickets||0}</td><td>${escapeHtml((map[a.questionId]?.question || a.question).slice(0,80))}${(map[a.questionId]?.question || a.question).length>80?'…':''}</td></tr>`).join('') : `<tr><td colspan="5" class="empty">Todavía no has respondido trivias.</td></tr>`}
  </tbody></table></div></article>`;
}

function renderAdmin() {
  const users=load(KEYS.users); const attempts=load(KEYS.attempts); const questions=load(KEYS.questions); const draws=load(KEYS.draws); const settings=load(KEYS.settings,defaultSettings);
  const availableTickets=attempts.filter(a=>a.tickets>0 && !a.drawId).reduce((s,a)=>s+a.tickets,0);
  $('#content').innerHTML = `
    <section class="admin-grid">
      ${statCard('Personas registradas', users.filter(u=>u.role!=='admin').length,'👥')}
      ${statCard('Trivias respondidas', attempts.length,'✓')}
      ${statCard('Oportunidades disponibles', availableTickets,'★')}
    </section>
    <article class="card draw-card">
      <div><h3>Sorteo de gift card</h3><p class="card-subtitle">Premio actual: ${money(settings.prizeAmount)} · Frecuencia: ${escapeHtml(settings.drawFrequency)} · ${availableTickets} oportunidades disponibles.</p></div>
      <button id="run-draw" class="btn primary" ${availableTickets===0?'disabled':''}>Realizar sorteo</button>
      <div id="winner-area" class="span-2"></div>
    </article>
    <article class="card admin-section">
      <div class="toolbar"><div><h3>Banco de preguntas</h3><p class="card-subtitle">${questions.length} preguntas activas.</p></div><div class="toolbar-actions"><button id="export-data" class="btn ghost">Exportar datos</button><button id="reset-demo" class="btn danger">Reiniciar demo</button></div></div>
      <form id="question-form" class="question-editor">
        <label>Categoría<select id="q-category"><option value="vehicle">Movilidad en vehículos</option><option value="walk">Movilidad a pie</option><option value="bike">Bicicleta y scooter</option></select></label>
        <label>Alternativa correcta<select id="q-correct"><option value="0">Alternativa A</option><option value="1">Alternativa B</option><option value="2">Alternativa C</option></select></label>
        <label class="span-2">Pregunta<textarea id="q-text" required placeholder="Escribe una situación preventiva concreta"></textarea></label>
        <label>Alternativa A<input id="q-a" required></label><label>Alternativa B<input id="q-b" required></label>
        <label>Alternativa C<input id="q-c" required></label><label>Explicación<input id="q-explanation" required placeholder="Retroalimentación breve"></label>
        <div class="span-2"><button class="btn secondary" type="submit">Agregar pregunta</button></div>
      </form>
      <div class="table-wrap" style="margin-top:22px"><table><thead><tr><th>Categoría</th><th>Pregunta</th><th>Correcta</th><th></th></tr></thead><tbody>
      ${questions.map(q=>`<tr><td>${CATEGORY_META[q.category].short}</td><td>${escapeHtml(q.question)}</td><td>${String.fromCharCode(65+q.correct)}</td><td><button class="btn danger delete-question" data-id="${q.id}">Eliminar</button></td></tr>`).join('')}
      </tbody></table></div>
    </article>
    <article class="card admin-section">
      <h3>Historial de sorteos</h3><p class="card-subtitle">Registro local de ganadores.</p>
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Ganador</th><th>Equipo</th><th>Premio</th><th>Oportunidades incluidas</th></tr></thead><tbody>
      ${draws.length ? draws.slice().reverse().map(d=>`<tr><td>${new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d.createdAt))}</td><td><b>${escapeHtml(d.winnerName)}</b></td><td>${escapeHtml(d.branch)}</td><td>${money(d.prizeAmount)}</td><td>${d.ticketPool}</td></tr>`).join('') : `<tr><td colspan="5" class="empty">No se han realizado sorteos.</td></tr>`}
      </tbody></table></div>
    </article>`;

  $('#question-form').addEventListener('submit', e => { e.preventDefault(); addQuestion(); });
  $$('.delete-question').forEach(btn=>btn.addEventListener('click',()=>deleteQuestion(btn.dataset.id)));
  $('#run-draw').addEventListener('click',runDraw);
  $('#export-data').addEventListener('click',exportData);
  $('#reset-demo').addEventListener('click',resetDemo);
}

function addQuestion() {
  const questions=load(KEYS.questions);
  questions.push({ id:`q-${crypto.randomUUID()}`, category:$('#q-category').value, question:$('#q-text').value.trim(), options:[$('#q-a').value.trim(),$('#q-b').value.trim(),$('#q-c').value.trim()], correct:Number($('#q-correct').value), explanation:$('#q-explanation').value.trim() });
  save(KEYS.questions,questions); toast('Pregunta agregada correctamente.'); renderAdmin();
}
function deleteQuestion(id) {
  const questions=load(KEYS.questions);
  if (questions.length<=1) { toast('Debe existir al menos una pregunta.'); return; }
  save(KEYS.questions,questions.filter(q=>q.id!==id)); toast('Pregunta eliminada.'); renderAdmin();
}
function runDraw() {
  const attempts=load(KEYS.attempts); const users=load(KEYS.users); const settings=load(KEYS.settings,defaultSettings);
  const ticketPool=[];
  attempts.filter(a=>a.tickets>0&&!a.drawId).forEach(a=>{ for(let i=0;i<a.tickets;i++) ticketPool.push(a.userId); });
  if(!ticketPool.length){toast('No hay oportunidades disponibles.');return;}
  const winnerId=ticketPool[Math.floor(Math.random()*ticketPool.length)]; const winner=users.find(u=>u.id===winnerId);
  const drawId=`d-${crypto.randomUUID()}`;
  attempts.forEach(a=>{if(a.tickets>0&&!a.drawId)a.drawId=drawId;}); save(KEYS.attempts,attempts);
  const draws=load(KEYS.draws); draws.push({id:drawId,winnerId,winnerName:winner.name,branch:winner.branch,prizeAmount:settings.prizeAmount,ticketPool:ticketPool.length,createdAt:new Date().toISOString()}); save(KEYS.draws,draws);
  $('#winner-area').innerHTML=`<div class="winner-box"><p class="eyebrow">Ganador seleccionado</p><h3>🎉 ${escapeHtml(winner.name)}</h3><p>${escapeHtml(winner.branch)} · Gift card de ${money(settings.prizeAmount)}</p></div>`;
  toast('Sorteo realizado y registrado.');
}
function exportData(){
  const payload={exportedAt:new Date().toISOString(),users:load(KEYS.users).map(({passwordHash,...u})=>u),questions:load(KEYS.questions),attempts:load(KEYS.attempts),draws:load(KEYS.draws),settings:load(KEYS.settings)};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`trivia-movilidad-${todayKey()}.json`; a.click(); URL.revokeObjectURL(url); toast('Datos exportados.');
}
function resetDemo(){
  if(!confirm('Esto eliminará usuarios, respuestas, sorteos y preguntas agregadas. ¿Continuar?'))return;
  Object.values(KEYS).forEach(k=>localStorage.removeItem(k)); initStorage(); save(KEYS.session,{userId:'u-admin'}); currentUser=load(KEYS.users).find(u=>u.id==='u-admin'); toast('Demo reiniciada.'); startSession(currentUser);
}

function restoreSession() {
  const session=load(KEYS.session,null); if(!session)return;
  const user=load(KEYS.users).find(u=>u.id===session.userId); if(user)startSession(user);
}

initStorage(); bindAuth(); bindNavigation(); restoreSession();
