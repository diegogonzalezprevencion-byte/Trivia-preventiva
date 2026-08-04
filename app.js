'use strict';

const KEYS = {
  users: 'tm_users_v1',
  questions: 'tm_questions_v2',
  attempts: 'tm_attempts_v1',
  draws: 'tm_draws_v2',
  settings: 'tm_settings_v1',
  session: 'tm_session_v1'
};

const CATEGORY_META = {
  vehicle: { name: 'Movilidad en vehículos', short: 'Vehículos', icon: '🚗', className: 'vehicle' },
  walk: { name: 'Movilidad a pie', short: 'A pie', icon: '🚶', className: 'walk' },
  bike: { name: 'Bicicleta y scooter', short: 'Bici / scooter', icon: '🚲', className: 'bike' }
};

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const defaultSettings = {
  prizeAmount: 30000,
  participationMode: 'correct_only',
  questionBankStart: '2026-01-01'
};

const ADMIN_ACCOUNT = Object.freeze({
  id: 'u-admin',
  name: 'Administrador',
  username: 'diegogonzalez',
  usernameKey: 'diegogonzalez',
  branch: 'Administración',
  role: 'admin',
  passwordHash: '3b938629679dc9750607ee93e8622a1d98a4466ffbdc5196e6c2a86e56ccdcdb'
});

let currentUser = null;
let currentView = 'dashboard';
let selectedAnswer = null;
let adminPeriod = null;
let drawPeriod = null;
let editingUserId = null;
let editingQuestionId = null;
let questionFilters = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const load = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const currentMonthKey = () => todayKey().slice(0, 7);
const formatDate = iso => new Intl.DateTimeFormat('es-CL', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${iso}T12:00:00`));
const money = value => new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

adminPeriod = { month: Number(todayKey().slice(5, 7)), year: Number(todayKey().slice(0, 4)) };
drawPeriod = { ...adminPeriod };
questionFilters = { day: '', month: '', year: '', search: '' };

function normalizeUsername(value) {
  return String(value || '').trim().toLocaleLowerCase('es-CL');
}

function passwordMeetsRequirements(password) {
  return String(password).length >= 6 && /[A-ZÁÉÍÓÚÑ]/.test(password) && /\d/.test(password);
}

function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function periodLabel(year, month) {
  return `${MONTHS[month - 1]} ${year}`;
}

function attemptsForPeriod(attempts, year, month) {
  const prefix = `${periodKey(year, month)}-`;
  return attempts.filter(attempt => String(attempt.date || '').startsWith(prefix));
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shuffleOptions(correctText, distractors, seed) {
  const options = [correctText, ...distractors];
  const rotations = seed % 3;
  for (let i = 0; i < rotations; i += 1) options.push(options.shift());
  return { options, correct: options.indexOf(correctText) };
}

function buildQuestionBank() {
  const contexts = [
    'Al comenzar tu jornada', 'Durante una visita en terreno', 'Camino a una reunión',
    'En un horario de alta afluencia', 'En un día de lluvia', 'Al finalizar la jornada',
    'Cuando tienes poco tiempo', 'Mientras te desplazas con documentos',
    'En una ruta que no conoces', 'Ante una situación imprevista'
  ];

  const bases = {
    walk: [
      ['recibes una llamada mientras caminas. ¿Qué acción es más segura?', 'Detenerte en un lugar protegido antes de responder', ['Contestar mientras sigues caminando', 'Responder mientras cruzas la calle'], 'Detenerse elimina la distracción durante el desplazamiento.'],
      ['encuentras una vereda con desniveles. ¿Qué debes hacer?', 'Reducir la velocidad, observar el terreno y reportar el riesgo', ['Caminar por la calzada', 'Mantener el paso para no atrasarte'], 'Adaptar la marcha y reportar el peligro reduce la probabilidad de caída.'],
      ['el semáforo peatonal cambia a rojo. ¿Cuál es la decisión correcta?', 'Esperar la luz habilitada y avisar si te retrasas', ['Cruzar si no ves vehículos', 'Correr por un punto no habilitado'], 'Un retraso comunicado es preferible a una exposición innecesaria.'],
      ['debes bajar una escalera con objetos en las manos. ¿Qué corresponde?', 'Dejar una mano libre y utilizar el pasamanos', ['Bajar más rápido para terminar pronto', 'Mirar el teléfono para aprovechar el tiempo'], 'Una mano libre permite usar apoyo y reaccionar ante un tropiezo.'],
      ['el piso de acceso está mojado. ¿Cómo debes avanzar?', 'Con pasos cortos, observando el piso y usando apoyos disponibles', ['Correr para cruzar el sector', 'Caminar sobre la zona más brillante'], 'Los pasos controlados disminuyen el riesgo de resbalón.'],
      ['necesitas revisar un mensaje urgente. ¿Qué práctica es segura?', 'Detenerte fuera de la circulación peatonal para revisarlo', ['Mirarlo mientras caminas lentamente', 'Revisarlo al cruzar porque hay menos personas'], 'El teléfono debe usarse detenido y en un lugar seguro.'],
      ['llevas un bolso que dificulta tu visión. ¿Qué debes hacer?', 'Acomodar la carga antes de continuar y mantener libre el campo visual', ['Seguir caminando de lado', 'Apurarte para dejar pronto el bolso'], 'La carga no debe interferir con la visión ni el equilibrio.'],
      ['te aproximas a la salida de un estacionamiento. ¿Qué corresponde?', 'Disminuir la marcha y confirmar visualmente el tránsito de vehículos', ['Cruzar confiando en que te verán', 'Usar audífonos para aislar el ruido'], 'Las salidas de vehículos requieren atención y contacto visual.'],
      ['hay una aglomeración en la vereda. ¿Qué opción es más segura?', 'Reducir el ritmo y mantener distancia para conservar visibilidad', ['Abrirte paso rápidamente', 'Bajar a la calzada para avanzar'], 'La distancia permite observar obstáculos y reaccionar.'],
      ['usas calzado con poca adherencia. ¿Qué acción preventiva corresponde?', 'Adaptar el paso y preferir una ruta estable y seca', ['Caminar más rápido para reducir el tiempo de exposición', 'Apoyarte únicamente en otras personas'], 'El tipo de calzado exige ajustar el desplazamiento al terreno.'],
      ['debes cruzar una calle con visibilidad limitada. ¿Qué debes hacer?', 'Usar el cruce habilitado y asegurarte de ser visible', ['Cruzar entre vehículos estacionados', 'Seguir a otra persona sin observar'], 'La visibilidad mutua es fundamental en un cruce.'],
      ['observas un objeto bloqueando el paso. ¿Qué corresponde?', 'Rodearlo por un sector seguro y reportarlo', ['Saltar sobre el objeto', 'Moverlo con el pie mientras caminas'], 'Evitar maniobras improvisadas previene tropiezos y lesiones.'],
      ['escuchas una alerta en tu teléfono al bajar una escala. ¿Qué haces?', 'Finalizas el descenso y luego revisas el teléfono detenido', ['Lees la pantalla usando el pasamanos', 'Te detienes sobre un peldaño'], 'Las escaleras requieren atención completa y desplazamiento continuo seguro.'],
      ['una puerta de vidrio está parcialmente abierta. ¿Qué acción es segura?', 'Disminuir la marcha y verificar el espacio de paso', ['Empujarla con el hombro al pasar', 'Seguir a la persona de adelante sin mirar'], 'Las puertas y accesos pueden generar golpes o atrapamientos.'],
      ['una zona está señalizada por limpieza. ¿Qué debes hacer?', 'Respetar la señalización y utilizar la ruta alternativa', ['Pasar por el borde de la zona', 'Retirar la señal para avanzar'], 'La señalización advierte una condición temporal de riesgo.'],
      ['te sientes mareado durante el trayecto. ¿Cuál es la mejor decisión?', 'Detenerte, buscar apoyo y solicitar ayuda si es necesario', ['Continuar para llegar más rápido', 'Sentarte en el borde de la calzada'], 'Los síntomas físicos deben atenderse antes de continuar.'],
      ['caminas por un sector con poca iluminación. ¿Qué corresponde?', 'Elegir una ruta iluminada y visible aunque tome más tiempo', ['Usar la luz del teléfono mientras caminas', 'Seguir por el trayecto más corto'], 'La visibilidad del entorno es parte de la planificación segura.'],
      ['debes caminar durante una lluvia intensa. ¿Qué opción es más segura?', 'Evaluar esperar, cambiar la ruta o usar otro medio de transporte', ['Correr para mojarte menos', 'Caminar mirando solo el suelo'], 'Las condiciones climáticas pueden justificar modificar el desplazamiento.'],
      ['llegas tarde a una cita. ¿Qué conducta preventiva corresponde?', 'Avisar el retraso y mantener un ritmo seguro', ['Correr en escaleras y cruces', 'Cruzar fuera del paso peatonal'], 'La presión de tiempo nunca debe transformarse en una conducta insegura.'],
      ['ves a otra persona distraída acercándose. ¿Qué debes hacer?', 'Mantener distancia y anticipar un cambio inesperado de trayectoria', ['Pasar muy cerca para adelantar', 'Llamar su atención mientras cruzas'], 'Anticipar errores ajenos ayuda a prevenir colisiones peatonales.']
    ],
    vehicle: [
      ['recibes un mensaje mientras conduces. ¿Qué debes hacer?', 'Esperar hasta estacionar en un lugar seguro', ['Leerlo en un semáforo', 'Responder mediante una nota de voz'], 'La conducción requiere atención visual, manual y cognitiva completa.'],
      ['el tiempo entre reuniones es insuficiente. ¿Qué opción es segura?', 'Avisar y reprogramar o retrasar la siguiente actividad', ['Aumentar la velocidad', 'Seguir una ruta desconocida sin revisar'], 'La planificación debe evitar que el apuro influya en la conducción.'],
      ['antes de iniciar el viaje. ¿Qué acción preventiva corresponde?', 'Configurar la ruta y silenciar notificaciones antes de partir', ['Configurar el navegador en movimiento', 'Revisar mensajes en calles tranquilas'], 'Preparar el viaje antes de conducir reduce distracciones.'],
      ['sientes somnolencia al volante. ¿Qué debes hacer?', 'Detenerte en un lugar seguro y descansar o cambiar de conductor', ['Abrir la ventana y continuar', 'Subir el volumen de la música'], 'La fatiga reduce el tiempo de reacción y no se corrige solo con estímulos.'],
      ['comienza una lluvia intensa. ¿Cómo debes conducir?', 'Reducir velocidad, aumentar distancia y evaluar detenerte', ['Mantener velocidad para salir rápido', 'Usar luces altas permanentemente'], 'La lluvia reduce visibilidad y adherencia.'],
      ['debes estacionar para una visita. ¿Qué lugar es más seguro?', 'Un espacio habilitado, iluminado y con salida segura', ['La doble fila por pocos minutos', 'El espacio más cercano aunque tenga poca visibilidad'], 'El lugar de estacionamiento también forma parte del trayecto seguro.'],
      ['un cliente te llama mientras estás conduciendo. ¿Qué corresponde?', 'No responder y devolver la llamada cuando estés estacionado', ['Contestar usando altavoz', 'Sostener el teléfono por pocos segundos'], 'Incluso manos libres puede generar distracción cognitiva.'],
      ['un vehículo circula demasiado cerca detrás de ti. ¿Qué haces?', 'Mantener conducción predecible y facilitar el adelantamiento cuando sea seguro', ['Frenar para advertirle', 'Aumentar la velocidad sobre el límite'], 'Evitar confrontaciones reduce el riesgo de colisión.'],
      ['te aproximas a un cruce con visibilidad limitada. ¿Qué corresponde?', 'Reducir la velocidad y estar preparado para detenerte', ['Acelerar para pasar primero', 'Confiar solo en la señal sonora'], 'La velocidad debe permitir detenerse ante un peligro no visible.'],
      ['debes transportar documentos dentro del vehículo. ¿Dónde deben ir?', 'Asegurados en un lugar que no interfiera con la conducción', ['Sobre el asiento del conductor', 'En las piernas para tenerlos a mano'], 'Los objetos sueltos pueden caer, distraer o transformarse en proyectiles.'],
      ['observas una luz de advertencia en el tablero. ¿Qué debes hacer?', 'Evaluar la alerta y detenerte en un lugar seguro si corresponde', ['Ignorarla hasta terminar las visitas', 'Apagar el tablero para no distraerte'], 'Las alertas del vehículo pueden indicar una condición crítica.'],
      ['vas a cambiar de pista. ¿Cuál es la secuencia correcta?', 'Observar espejos, señalizar, revisar punto ciego y maniobrar', ['Señalizar al mismo tiempo que giras', 'Cambiar de pista si no escuchas bocinas'], 'La maniobra debe ser anticipada y verificable por otros usuarios.'],
      ['encuentras tránsito detenido inesperadamente. ¿Qué corresponde?', 'Reducir progresivamente y mantener distancia de seguridad', ['Frenar bruscamente al final', 'Cambiar de pista sin señalizar'], 'La distancia permite una detención controlada.'],
      ['te equivocas de salida en la ruta. ¿Qué debes hacer?', 'Continuar hasta un punto seguro para reorientarte', ['Retroceder por la berma', 'Girar de forma repentina'], 'Nunca se debe corregir una ruta mediante maniobras abruptas.'],
      ['el parabrisas se empaña. ¿Qué acción es segura?', 'Activar desempañador y reducir la marcha hasta recuperar visibilidad', ['Limpiarlo con la mano mientras conduces', 'Abrir la puerta para ventilar'], 'Sin visibilidad suficiente no se debe mantener la velocidad normal.'],
      ['un peatón se aproxima a un paso habilitado. ¿Qué corresponde?', 'Reducir la velocidad y ceder el paso cuando corresponda', ['Acelerar antes de que ingrese', 'Tocar la bocina para que espere'], 'La conducción preventiva anticipa la posible entrada del peatón.'],
      ['debes conducir de noche. ¿Qué medida ayuda?', 'Revisar luces, limpiar superficies y ajustar la velocidad a la visibilidad', ['Usar siempre luces altas', 'Seguir muy cerca a otro vehículo'], 'De noche la distancia visible es menor y exige adaptar la velocidad.'],
      ['estás emocionalmente alterado antes de conducir. ¿Qué debes hacer?', 'Tomar una pausa y evaluar otro medio de transporte', ['Conducir rápido para despejarte', 'Realizar llamadas mientras conduces'], 'El estado emocional puede afectar atención y toma de decisiones.'],
      ['un pasajero te muestra información en su teléfono. ¿Qué corresponde?', 'Pedirle que espere hasta que el vehículo esté detenido', ['Mirar rápidamente la pantalla', 'Sostener el teléfono a la altura del parabrisas'], 'La distracción visual, aunque sea breve, aumenta el riesgo.'],
      ['el vehículo presenta neumáticos visiblemente deteriorados. ¿Qué haces?', 'No iniciar el viaje hasta revisar o corregir la condición', ['Conducir más lento solamente', 'Inflarlos sobre el nivel recomendado'], 'Los elementos críticos deben estar en condiciones antes del desplazamiento.']
    ],
    bike: [
      ['vas a iniciar el trayecto. ¿Cómo debe utilizarse el casco?', 'Durante todo el recorrido y correctamente ajustado', ['Solo en avenidas', 'Solo cuando hay fiscalización'], 'El casco debe proteger durante toda la exposición.'],
      ['usas un scooter compartido. ¿Qué revisión debes realizar?', 'Comprobar frenos, ruedas, luces y estado general', ['Confiar únicamente en la aplicación', 'Probar primero la velocidad máxima'], 'Una inspección breve permite detectar fallas visibles.'],
      ['te aproximas a una intersección. ¿Qué práctica es segura?', 'Reducir velocidad, observar y confirmar que te hayan visto', ['Acelerar para cruzar primero', 'Mantener velocidad tocando la bocina'], 'Las intersecciones requieren máxima anticipación.'],
      ['el pavimento está mojado. ¿Cómo debes desplazarte?', 'Reducir velocidad y evitar frenadas o movimientos bruscos', ['Frenar fuertemente antes de cada curva', 'Circular sobre líneas pintadas'], 'La adherencia disminuye especialmente en superficies pintadas.'],
      ['llevas un bolso y documentos. ¿Cómo debes transportarlos?', 'En una mochila ajustada o sistema de carga estable', ['Colgados del manubrio', 'Sostenidos con una mano'], 'La carga no debe interferir con dirección ni equilibrio.'],
      ['necesitas escuchar indicaciones del navegador. ¿Qué opción es segura?', 'Usar instrucciones visuales configuradas antes de partir o detenerte para revisarlas', ['Usar audífonos en ambos oídos', 'Mirar continuamente el teléfono'], 'Debes conservar percepción auditiva y visual del entorno.'],
      ['vas a realizar un giro. ¿Qué corresponde?', 'Señalizar con anticipación y verificar que la maniobra sea segura', ['Girar sin señalizar si no vienen autos', 'Extender el brazo después de iniciar el giro'], 'Las maniobras deben ser predecibles para otros usuarios.'],
      ['encuentras una ciclovía bloqueada. ¿Qué debes hacer?', 'Reducir, detenerte si es necesario y continuar por una alternativa permitida', ['Subir a la vereda a alta velocidad', 'Ingresar entre vehículos sin observar'], 'Un obstáculo exige detener la improvisación y reevaluar la ruta.'],
      ['circulas cerca de vehículos estacionados. ¿Qué riesgo debes anticipar?', 'La apertura de puertas y la salida repentina de vehículos', ['Solo la presencia de peatones', 'Únicamente los vehículos en movimiento'], 'Mantener distancia de puertas reduce colisiones.'],
      ['te aproximas a peatones. ¿Qué conducta corresponde?', 'Reducir la velocidad, mantener distancia y respetar su prioridad', ['Pasar muy cerca avisando con bocina', 'Acelerar para adelantarlos'], 'La diferencia de velocidad aumenta la gravedad de un contacto.'],
      ['el sistema de frenos responde de forma irregular. ¿Qué haces?', 'Suspendes el uso hasta reparar o cambiar el equipo', ['Usas solo el freno trasero', 'Continúas a menor velocidad'], 'Un freno defectuoso es una condición crítica.'],
      ['debes circular al anochecer. ¿Qué elementos son necesarios?', 'Luces operativas y elementos reflectantes visibles', ['Solo ropa clara', 'La linterna del teléfono en la mano'], 'La visibilidad activa y pasiva ayuda a ser detectado.'],
      ['el viento es muy fuerte. ¿Qué decisión es preventiva?', 'Evaluar otro medio de transporte o suspender el trayecto', ['Aumentar la velocidad para estabilizarte', 'Circular más cerca de vehículos grandes'], 'El viento lateral puede provocar pérdida de control.'],
      ['te acercas a una curva cerrada. ¿Qué corresponde?', 'Reducir antes de la curva y mantener una trayectoria controlada', ['Frenar bruscamente dentro de la curva', 'Invadir la pista contraria para abrir el giro'], 'La velocidad debe ajustarse antes de cambiar la trayectoria.'],
      ['necesitas usar el teléfono. ¿Qué debes hacer?', 'Detenerte fuera de la vía y apoyar ambos pies antes de usarlo', ['Usarlo con una mano mientras avanzas', 'Mirarlo solo en bajadas'], 'Manipular el teléfono afecta dirección, equilibrio y percepción.'],
      ['circulas junto a un vehículo pesado. ¿Qué debes considerar?', 'Evitar sus puntos ciegos y mantener distancia', ['Circular pegado para que te vea', 'Adelantar por cualquier lado'], 'Los vehículos grandes tienen zonas donde el conductor no puede verte.'],
      ['la superficie tiene gravilla. ¿Cómo debes actuar?', 'Reducir velocidad y evitar inclinaciones o frenadas repentinas', ['Acelerar para superar rápido el sector', 'Frenar solo con la rueda delantera'], 'La gravilla reduce adherencia y estabilidad.'],
      ['vas a cruzar un acceso vehicular. ¿Qué corresponde?', 'Reducir y establecer contacto visual con conductores', ['Confiar en que la ciclovía da prioridad absoluta', 'Pasar detrás de un vehículo que retrocede'], 'La prioridad no reemplaza la necesidad de ser visto.'],
      ['el casco sufrió un impacto previo. ¿Qué debes hacer?', 'Reemplazarlo aunque no tenga daños visibles', ['Seguir usándolo si no está quebrado', 'Ajustarlo más fuerte'], 'Un impacto puede deteriorar internamente su capacidad de protección.'],
      ['la ruta exige circular por un sector no habilitado. ¿Qué decisión es segura?', 'Replanificar el trayecto o usar otro medio de transporte', ['Circular por la vereda entre peatones', 'Continuar contra el tránsito'], 'La ruta debe ser compatible con una circulación permitida y segura.']
    ]
  };

  const bank = [];
  const start = defaultSettings.questionBankStart;
  let globalIndex = 0;
  ['walk', 'vehicle', 'bike'].forEach(category => {
    bases[category].forEach((base, baseIndex) => {
      contexts.forEach((context, contextIndex) => {
        const [prompt, correctText, distractors, explanation] = base;
        const arranged = shuffleOptions(correctText, distractors, globalIndex);
        bank.push({
          id: `q${globalIndex + 1}`,
          sequence: globalIndex + 1,
          scheduleDate: '',
          category,
          question: `${context}, ${prompt}`,
          options: arranged.options,
          correct: arranged.correct,
          explanation,
          updatedAt: null
        });
        globalIndex += 1;
      });
    });
  });

  // Intercala las categorías y asigna una pregunta por día durante 600 días.
  const ordered = [];
  for (let i = 0; i < 200; i += 1) {
    ordered.push(bank[i], bank[200 + i], bank[400 + i]);
  }
  return ordered.map((question, index) => ({
    ...question,
    sequence: index + 1,
    scheduleDate: addDays(start, index)
  }));
}

function ensureUserSchema() {
  const rawUsers = load(KEYS.users, []);
  const used = new Set([ADMIN_ACCOUNT.usernameKey]);
  const users = [];

  rawUsers.filter(user => user.id !== ADMIN_ACCOUNT.id && user.role !== 'admin').forEach((user, index) => {
    let display = String(user.username || user.name || `usuario${index + 1}`).trim();
    let key = normalizeUsername(display);
    if (!key || used.has(key)) {
      display = `usuario${index + 1}`;
      key = normalizeUsername(display);
      while (used.has(key)) {
        display += '1';
        key = normalizeUsername(display);
      }
    }
    used.add(key);
    users.push({
      ...user,
      id: user.id || `u-${crypto.randomUUID()}`,
      name: display,
      username: display,
      usernameKey: key,
      branch: user.branch || 'Sin sucursal',
      role: 'user',
      createdAt: user.createdAt || new Date().toISOString()
    });
  });

  users.unshift({ ...ADMIN_ACCOUNT });
  save(KEYS.users, users);
}

function initStorage() {
  ensureUserSchema();
  if (!localStorage.getItem(KEYS.questions)) save(KEYS.questions, buildQuestionBank());
  if (!localStorage.getItem(KEYS.attempts)) save(KEYS.attempts, []);
  if (!localStorage.getItem(KEYS.draws)) save(KEYS.draws, []);
  if (!localStorage.getItem(KEYS.settings)) save(KEYS.settings, defaultSettings);
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3000);
}

function bindAuth() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(item => item.classList.toggle('active', item === tab));
    $$('[data-auth-form]').forEach(form => form.classList.toggle('hidden', form.dataset.authForm !== tab.dataset.authTab));
    $('#auth-message').textContent = '';
  }));

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const usernameKey = normalizeUsername($('#login-username').value);
    const hash = await sha256($('#login-password').value);
    const user = load(KEYS.users).find(item => item.role === 'user' && item.usernameKey === usernameKey && item.passwordHash === hash);
    if (!user) return showAuthError('Usuario o clave incorrectos.');
    startSession(user);
  });

  $('#register-form').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('#register-username').value.trim();
    const usernameKey = normalizeUsername(username);
    const password = $('#register-password').value;
    const branch = $('#register-branch').value.trim();
    const users = load(KEYS.users);

    if (username.length < 3) return showAuthError('El usuario debe contener al menos 3 caracteres.');
    if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]+$/.test(username)) return showAuthError('El usuario solo puede contener letras, números, punto, guion o guion bajo.');
    if (users.some(user => user.usernameKey === usernameKey)) return showAuthError('Ese nombre de usuario ya está registrado.');
    if (!passwordMeetsRequirements(password)) return showAuthError('La clave debe tener mínimo 6 caracteres, una mayúscula y un número.');
    if (!branch) return showAuthError('Debes indicar una sucursal.');

    const user = {
      id: `u-${crypto.randomUUID()}`,
      name: username,
      username,
      usernameKey,
      branch,
      role: 'user',
      passwordHash: await sha256(password),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    save(KEYS.users, users);
    startSession(user);
  });

  $('#admin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const usernameKey = normalizeUsername($('#admin-username').value);
    const hash = await sha256($('#admin-password').value);
    const admin = load(KEYS.users).find(item => item.role === 'admin' && item.usernameKey === usernameKey && item.passwordHash === hash);
    if (!admin) return showAuthError('Credenciales de administrador incorrectas.');
    startSession(admin);
  });
}

function showAuthError(message) {
  const element = $('#auth-message');
  element.textContent = message;
  element.className = 'form-message error';
}

function startSession(user) {
  currentUser = user;
  currentView = 'dashboard';
  save(KEYS.session, { userId: user.id });
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = user.username || user.name;
  $('#user-branch').textContent = user.branch;
  $('#user-initials').textContent = initials(user.username || user.name);
  const isAdmin = user.role === 'admin';
  $$('.admin-only').forEach(element => element.classList.toggle('hidden', !isAdmin));
  $$('.user-only').forEach(element => element.classList.toggle('hidden', isAdmin));
  navigate('dashboard');
}

function bindNavigation() {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
  $('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem(KEYS.session);
    currentUser = null;
    $('#app-view').classList.add('hidden');
    $('#auth-view').classList.remove('hidden');
    $('#login-form').reset();
    $('#admin-form').reset();
  });
}

function navigate(view) {
  if (!currentUser) return;
  const adminViews = ['dashboard', 'admin', 'draw'];
  const userViews = ['dashboard', 'trivia', 'history'];
  if (currentUser.role === 'admin' && !adminViews.includes(view)) view = 'dashboard';
  if (currentUser.role !== 'admin' && !userViews.includes(view)) view = 'dashboard';

  currentView = view;
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const titles = {
    dashboard: currentUser.role === 'admin' ? 'Dashboard de resultados' : 'Inicio',
    trivia: 'Trivia diaria',
    history: 'Mi historial',
    admin: 'Administración',
    draw: 'Sorteo de premio'
  };
  $('#page-title').textContent = titles[view];
  $('#page-kicker').textContent = currentUser.role === 'admin' ? 'Panel administrador' : 'Movilidad segura';

  if (view === 'dashboard') currentUser.role === 'admin' ? renderAdminDashboard() : renderUserDashboard();
  if (view === 'trivia') renderTrivia();
  if (view === 'history') renderHistory();
  if (view === 'admin') renderAdminManagement();
  if (view === 'draw') renderDraw();
  $('#content').focus({ preventScroll: true });
}

function userAttempts(userId = currentUser.id) {
  return load(KEYS.attempts).filter(attempt => attempt.userId === userId);
}

function todayAttempt(userId = currentUser.id) {
  return userAttempts(userId).find(attempt => attempt.date === todayKey());
}

function getStreak(attempts) {
  const days = [...new Set(attempts.map(attempt => attempt.date))].sort().reverse();
  if (!days.length) return 0;
  let cursor = new Date(`${todayKey()}T12:00:00`);
  const latest = days[0];
  if (latest !== todayKey()) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (const day of days) {
    const expected = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(cursor);
    if (day !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function ticketCount(attempts) {
  return attempts.reduce((sum, attempt) => sum + (attempt.tickets || 0), 0);
}

function statCard(label, value, icon, note = '') {
  return `<article class="card stat-card"><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div><div class="stat-icon">${icon}</div></article>`;
}

function renderUserDashboard() {
  const allAttempts = userAttempts();
  const monthly = allAttempts.filter(attempt => String(attempt.date).startsWith(`${currentMonthKey()}-`));
  const correct = monthly.filter(attempt => attempt.correct).length;
  const incorrect = monthly.length - correct;
  const rate = monthly.length ? Math.round(correct * 100 / monthly.length) : 0;
  const completed = todayAttempt();
  const categories = Object.entries(CATEGORY_META).map(([key, meta]) => {
    const rows = monthly.filter(attempt => attempt.category === key);
    const hits = rows.filter(attempt => attempt.correct).length;
    return { ...meta, total: rows.length, rate: rows.length ? Math.round(hits * 100 / rows.length) : 0 };
  });

  $('#content').innerHTML = `
    <section class="hero-banner">
      <div><p class="eyebrow">Desafío mensual</p><h3>${completed ? '¡Trivia de hoy completada!' : 'Tu decisión segura comienza hoy'}</h3><p>${completed ? 'Mañana tendrás una nueva situación preventiva.' : 'Responde la pregunta diaria, aprende con la explicación y suma una oportunidad cuando aciertes.'}</p><button class="btn" id="hero-action">${completed ? 'Ver mi historial' : 'Responder trivia diaria'}</button></div>
      <div class="streak-box"><div><strong>${getStreak(allAttempts)}</strong><span>días de racha</span></div></div>
    </section>
    <p class="period-note"><strong>Resultados de ${periodLabel(Number(currentMonthKey().slice(0,4)), Number(currentMonthKey().slice(5,7)))}.</strong> Estos indicadores comienzan desde cero cada mes; tu historial completo permanece disponible.</p>
    <section class="grid stats">
      ${statCard('Preguntas respondidas', monthly.length, '✓')}
      ${statCard('Respuestas correctas', correct, '✔')}
      ${statCard('Respuestas incorrectas', incorrect, '✕')}
      ${statCard('Efectividad', `${rate}%`, '↗')}
      ${statCard('Oportunidades', ticketCount(monthly), '★')}
    </section>
    <section class="grid two">
      <article class="card instructions-card">
        <p class="eyebrow">Participación</p><h3>Instrucciones para participar</h3><p class="card-subtitle">Una experiencia diaria, breve y preventiva.</p>
        <div class="category-list">
          <div class="category-row"><span class="rank-pill">1</span><div><strong>Ingresa una vez al día</strong><span>Solo existe una trivia disponible por jornada.</span></div></div>
          <div class="category-row"><span class="rank-pill">2</span><div><strong>Analiza la situación</strong><span>Selecciona una de las tres alternativas.</span></div></div>
          <div class="category-row"><span class="rank-pill">3</span><div><strong>Aprende y participa</strong><span>Al acertar sumas una oportunidad para el sorteo.</span></div></div>
        </div>
      </article>
      <article class="card"><h3>Tu desempeño por categoría</h3><p class="card-subtitle">Resultados del mes vigente.</p><div class="category-list">
        ${categories.map(category => `<div class="category-row"><div class="category-icon ${category.className}">${category.icon}</div><div><strong>${category.name}</strong><span>${category.total} respuestas · ${category.rate}% correctas</span><div class="progress"><i style="width:${category.rate}%"></i></div></div><b>${category.rate}%</b></div>`).join('')}
      </div></article>
    </section>`;
  $('#hero-action').addEventListener('click', () => navigate(completed ? 'history' : 'trivia'));
}

function dailyQuestion() {
  return load(KEYS.questions).find(question => question.scheduleDate === todayKey()) || null;
}

function renderTrivia() {
  const attempt = todayAttempt();
  if (attempt) return renderCompleted(attempt);
  const question = dailyQuestion();
  if (!question) {
    $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state"><div class="big-icon">📅</div><h3>No hay una pregunta programada para hoy</h3><p>El banco contiene 600 preguntas diarias desde el 1 de enero de 2026. El administrador puede revisar o modificar la programación.</p></article></div>`;
    return;
  }
  selectedAnswer = null;
  const meta = CATEGORY_META[question.category];
  $('#content').innerHTML = `<div class="trivia-wrap"><div class="trivia-top"><span class="category-badge prominent">${meta.icon} ${meta.name}</span><span class="category-badge">Pregunta ${question.sequence} de 600 · ${formatDate(question.scheduleDate)}</span></div><article class="question-card"><p class="eyebrow">Situación del día</p><h3>${escapeHtml(question.question)}</h3><div class="answers">${question.options.map((option, index) => `<button class="answer" data-answer="${index}"><span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join('')}</div><button id="submit-answer" class="btn primary full" style="margin-top:20px" disabled>Confirmar respuesta</button><div id="feedback-area"></div></article></div>`;
  $$('.answer').forEach(button => button.addEventListener('click', () => {
    selectedAnswer = Number(button.dataset.answer);
    $$('.answer').forEach(item => item.classList.toggle('selected', item === button));
    $('#submit-answer').disabled = false;
  }));
  $('#submit-answer').addEventListener('click', () => submitAnswer(question));
}

function submitAnswer(question) {
  if (selectedAnswer === null || todayAttempt()) return;
  const isCorrect = selectedAnswer === question.correct;
  const attempt = {
    id: `a-${crypto.randomUUID()}`,
    userId: currentUser.id,
    questionId: question.id,
    question: question.question,
    category: question.category,
    answer: selectedAnswer,
    correct: isCorrect,
    tickets: isCorrect ? 1 : 0,
    date: todayKey(),
    createdAt: new Date().toISOString()
  };
  const attempts = load(KEYS.attempts);
  attempts.push(attempt);
  save(KEYS.attempts, attempts);
  $$('.answer').forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle('correct', index === question.correct);
    button.classList.toggle('incorrect', index === selectedAnswer && !isCorrect);
  });
  $('#submit-answer').classList.add('hidden');
  $('#feedback-area').innerHTML = `<div class="feedback ${isCorrect ? 'success' : 'error'}"><h4>${isCorrect ? '¡Respuesta correcta! Sumaste una oportunidad.' : 'Respuesta incorrecta. Hoy no sumaste una oportunidad.'}</h4><p>${escapeHtml(question.explanation)}</p><button id="finish-trivia" class="btn secondary">Volver al inicio</button></div>`;
  $('#finish-trivia').addEventListener('click', () => navigate('dashboard'));
}

function renderCompleted(attempt) {
  const question = load(KEYS.questions).find(item => item.id === attempt.questionId);
  $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state"><div class="big-icon">${attempt.correct ? '⭐' : '📘'}</div><h3>Ya respondiste la trivia de hoy</h3><p>${attempt.correct ? 'Tu respuesta fue correcta y sumaste una oportunidad para el sorteo del mes.' : 'Tu respuesta fue incorrecta, pero la retroalimentación quedó disponible en tu historial.'}</p>${question ? `<div class="feedback ${attempt.correct ? 'success' : 'error'}"><b>${escapeHtml(question.explanation)}</b></div>` : ''}<button class="btn secondary" id="completed-history">Ver mi historial</button></article></div>`;
  $('#completed-history').addEventListener('click', () => navigate('history'));
}

function renderHistory() {
  const attempts = userAttempts().slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const questionMap = Object.fromEntries(load(KEYS.questions).map(question => [question.id, question]));
  $('#content').innerHTML = `<article class="card"><h3>Historial completo</h3><p class="card-subtitle">Las estadísticas mensuales se reinician, pero tus respuestas permanecen en este registro.</p><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Resultado</th><th>Oportunidades</th><th>Pregunta</th></tr></thead><tbody>${attempts.length ? attempts.map(attempt => {
    const text = questionMap[attempt.questionId]?.question || attempt.question || 'Pregunta no disponible';
    return `<tr><td>${formatDate(attempt.date)}</td><td>${CATEGORY_META[attempt.category]?.short || '-'}</td><td><span class="status ${attempt.correct ? 'correct' : 'incorrect'}">${attempt.correct ? 'Correcta' : 'Incorrecta'}</span></td><td>${attempt.tickets || 0}</td><td>${escapeHtml(text.length > 90 ? `${text.slice(0, 90)}…` : text)}</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">Todavía no has respondido trivias.</td></tr>'}</tbody></table></div></article>`;
}

function participantRows(year, month) {
  const users = load(KEYS.users).filter(user => user.role === 'user');
  const attempts = attemptsForPeriod(load(KEYS.attempts), year, month);
  return users.map(user => {
    const rows = attempts.filter(attempt => attempt.userId === user.id);
    const correct = rows.filter(attempt => attempt.correct).length;
    return {
      id: user.id,
      username: user.username || user.name,
      branch: user.branch,
      total: rows.length,
      correct,
      incorrect: rows.length - correct,
      rate: rows.length ? Math.round(correct * 100 / rows.length) : 0,
      tickets: ticketCount(rows)
    };
  }).filter(row => row.total > 0);
}

function renderPeriodFilters(prefix, period) {
  return `<div class="period-filters"><label>Mes<select id="${prefix}-month">${MONTHS.map((month, index) => `<option value="${index + 1}" ${period.month === index + 1 ? 'selected' : ''}>${month}</option>`).join('')}</select></label><label>Año<select id="${prefix}-year">${Array.from({ length: 75 }, (_, index) => 2026 + index).map(year => `<option value="${year}" ${period.year === year ? 'selected' : ''}>${year}</option>`).join('')}</select></label><button class="btn secondary" id="${prefix}-apply">Aplicar filtros</button></div>`;
}

function renderAdminDashboard() {
  const periodAttempts = attemptsForPeriod(load(KEYS.attempts), adminPeriod.year, adminPeriod.month);
  const participants = new Set(periodAttempts.map(attempt => attempt.userId)).size;
  const correct = periodAttempts.filter(attempt => attempt.correct).length;
  const incorrect = periodAttempts.length - correct;
  const correctRate = periodAttempts.length ? Math.round(correct * 100 / periodAttempts.length) : 0;
  const incorrectRate = periodAttempts.length ? Math.round(incorrect * 100 / periodAttempts.length) : 0;
  const ranking = participantRows(adminPeriod.year, adminPeriod.month).sort((a, b) => b.total - a.total || b.correct - a.correct || a.username.localeCompare(b.username));

  $('#content').innerHTML = `
    <article class="card filter-card"><div><p class="eyebrow">Periodo de análisis</p><h3>${periodLabel(adminPeriod.year, adminPeriod.month)}</h3></div>${renderPeriodFilters('dashboard', adminPeriod)}</article>
    <section class="grid admin-stats">
      ${statCard('Personas que participaron', participants, '👥')}
      ${statCard('Respuestas correctas', correct, '✔', `${correctRate}% del total`)}
      ${statCard('Respuestas incorrectas', incorrect, '✕', `${incorrectRate}% del total`)}
      ${statCard('Preguntas respondidas', periodAttempts.length, '✓')}
    </section>
    <section class="grid two admin-summary-grid">
      <article class="card"><h3>Distribución de resultados</h3><p class="card-subtitle">Porcentaje de respuestas del periodo seleccionado.</p><div class="result-bars"><div><span>Correctas <b>${correctRate}%</b></span><div class="progress large"><i style="width:${correctRate}%"></i></div></div><div><span>Incorrectas <b>${incorrectRate}%</b></span><div class="progress large incorrect-bar"><i style="width:${incorrectRate}%"></i></div></div></div></article>
      <article class="card"><h3>Resumen del banco</h3><p class="card-subtitle">Programación preventiva disponible.</p><div class="bank-summary"><strong>${load(KEYS.questions).length}</strong><span>preguntas programadas</span><small>Desde 01-01-2026 hasta ${formatDate(addDays(defaultSettings.questionBankStart, 599))}</small></div></article>
    </section>
    <article class="card admin-section"><div class="toolbar"><div><h3>Ranking por preguntas respondidas</h3><p class="card-subtitle">Orden mensual de mayor a menor participación.</p></div><button class="btn secondary" id="export-dashboard-ranking">Descargar Excel</button></div><div class="table-wrap"><table><thead><tr><th>Posición</th><th>Usuario</th><th>Sucursal</th><th>Respondidas</th><th>Correctas</th><th>Incorrectas</th><th>Efectividad</th><th>Oportunidades</th></tr></thead><tbody>${ranking.length ? ranking.map((row, index) => `<tr><td><span class="rank-pill ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><b>${escapeHtml(row.username)}</b></td><td>${escapeHtml(row.branch)}</td><td><b>${row.total}</b></td><td>${row.correct}</td><td>${row.incorrect}</td><td>${row.rate}%</td><td>${row.tickets}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">No existen respuestas en el periodo seleccionado.</td></tr>'}</tbody></table></div></article>`;

  $('#dashboard-apply').addEventListener('click', () => {
    adminPeriod = { month: Number($('#dashboard-month').value), year: Number($('#dashboard-year').value) };
    renderAdminDashboard();
  });
  $('#export-dashboard-ranking').addEventListener('click', () => exportRowsAsExcel(ranking.map((row, index) => ({ Posición:index+1, Usuario:row.username, Sucursal:row.branch, Respondidas:row.total, Correctas:row.correct, Incorrectas:row.incorrect, Efectividad:`${row.rate}%`, Oportunidades:row.tickets, Periodo:periodLabel(adminPeriod.year, adminPeriod.month) })), `ranking-participacion-${periodKey(adminPeriod.year, adminPeriod.month)}`));
}

function renderAdminManagement() {
  const users = load(KEYS.users).filter(user => user.role === 'user');
  const questions = load(KEYS.questions);
  const editingUser = users.find(user => user.id === editingUserId) || null;
  const editingQuestion = questions.find(question => question.id === editingQuestionId) || null;
  const filteredQuestions = questions.filter(question => {
    if (questionFilters.day && question.scheduleDate !== questionFilters.day) return false;
    if (questionFilters.month && Number(question.scheduleDate.slice(5, 7)) !== Number(questionFilters.month)) return false;
    if (questionFilters.year && Number(question.scheduleDate.slice(0, 4)) !== Number(questionFilters.year)) return false;
    if (questionFilters.search) {
      const haystack = `${question.question} ${question.options.join(' ')} ${question.explanation}`.toLocaleLowerCase('es-CL');
      if (!haystack.includes(questionFilters.search.toLocaleLowerCase('es-CL'))) return false;
    }
    return true;
  });

  $('#content').innerHTML = `
    <article class="card admin-section"><div class="toolbar"><div><h3>Personas registradas</h3><p class="card-subtitle">Gestión de usuario, sucursal y restablecimiento de clave. Por seguridad, las claves existentes permanecen cifradas y no se muestran.</p></div><button class="btn secondary" id="export-users">Descargar registro</button></div>
      ${editingUser ? `<form id="user-edit-form" class="editor-panel"><div class="editor-header"><div><p class="eyebrow">Editando cuenta</p><h3>${escapeHtml(editingUser.username)}</h3></div><button type="button" class="btn ghost" id="cancel-user-edit">Cancelar</button></div><div class="form-grid"><label>Nombre de usuario<input id="edit-username" value="${escapeHtml(editingUser.username)}" required></label><label>Sucursal<input id="edit-branch" value="${escapeHtml(editingUser.branch)}" required></label><label class="span-2">Nueva clave opcional<input id="edit-password" type="password" placeholder="Dejar vacío para conservar la clave actual"><span class="field-hint">Mínimo 6 caracteres, una mayúscula y un número.</span></label></div><button class="btn primary" type="submit">Guardar cambios</button></form>` : ''}
      <div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Sucursal</th><th>Fecha de registro</th><th>Clave</th><th>Acción</th></tr></thead><tbody>${users.length ? users.map(user => `<tr><td><b>${escapeHtml(user.username)}</b></td><td>${escapeHtml(user.branch)}</td><td>${new Intl.DateTimeFormat('es-CL', { dateStyle:'medium' }).format(new Date(user.createdAt))}</td><td><span class="status protected">Protegida</span></td><td><button class="btn secondary edit-user" data-id="${user.id}">Editar usuario/clave</button></td></tr>`).join('') : '<tr><td colspan="5" class="empty">Todavía no hay personas registradas.</td></tr>'}</tbody></table></div>
    </article>
    <article class="card admin-section"><div class="toolbar"><div><h3>Banco de 600 preguntas</h3><p class="card-subtitle">Una pregunta programada por día. Busca por fecha exacta, mes, año o contenido y edita cuando sea necesario.</p></div><button class="btn ghost" id="export-questions">Descargar banco</button></div>
      <div class="question-filters"><label>Día exacto<input id="filter-day" type="date" value="${questionFilters.day}"></label><label>Mes<select id="filter-month"><option value="">Todos</option>${MONTHS.map((month, index) => `<option value="${index + 1}" ${String(index + 1) === questionFilters.month ? 'selected' : ''}>${month}</option>`).join('')}</select></label><label>Año<select id="filter-year"><option value="">Todos</option>${Array.from({ length:75 }, (_, index) => 2026 + index).map(year => `<option value="${year}" ${String(year) === questionFilters.year ? 'selected' : ''}>${year}</option>`).join('')}</select></label><label>Buscar texto<input id="filter-search" value="${escapeHtml(questionFilters.search)}" placeholder="Pregunta, alternativa o explicación"></label><button class="btn secondary" id="apply-question-filters">Buscar</button><button class="btn ghost" id="clear-question-filters">Limpiar</button></div>
      <p class="result-count">${filteredQuestions.length} pregunta(s) encontrada(s).</p>
      ${editingQuestion ? renderQuestionEditor(editingQuestion) : ''}
      <div class="table-wrap question-table"><table><thead><tr><th>N°</th><th>Fecha</th><th>Categoría</th><th>Pregunta</th><th>Correcta</th><th>Acción</th></tr></thead><tbody>${filteredQuestions.length ? filteredQuestions.map(question => `<tr><td>${question.sequence}</td><td>${formatDate(question.scheduleDate)}</td><td>${CATEGORY_META[question.category].short}</td><td>${escapeHtml(question.question)}</td><td>${String.fromCharCode(65 + question.correct)}</td><td><button class="btn secondary edit-question" data-id="${question.id}">Editar</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">No se encontraron preguntas para esos filtros.</td></tr>'}</tbody></table></div>
    </article>`;

  $$('.edit-user').forEach(button => button.addEventListener('click', () => { editingUserId = button.dataset.id; renderAdminManagement(); }));
  $('#cancel-user-edit')?.addEventListener('click', () => { editingUserId = null; renderAdminManagement(); });
  $('#user-edit-form')?.addEventListener('submit', saveUserChanges);
  $('#export-users').addEventListener('click', () => exportRowsAsExcel(users.map(user => ({ Usuario:user.username, Sucursal:user.branch, Fecha_de_registro:new Intl.DateTimeFormat('es-CL').format(new Date(user.createdAt)), Clave:'Protegida - restablecimiento disponible' })), 'usuarios-trivia'));

  $('#apply-question-filters').addEventListener('click', () => {
    questionFilters = { day:$('#filter-day').value, month:$('#filter-month').value, year:$('#filter-year').value, search:$('#filter-search').value.trim() };
    editingQuestionId = null;
    renderAdminManagement();
  });
  $('#clear-question-filters').addEventListener('click', () => {
    questionFilters = { day:'', month:'', year:'', search:'' };
    editingQuestionId = null;
    renderAdminManagement();
  });
  $$('.edit-question').forEach(button => button.addEventListener('click', () => { editingQuestionId = button.dataset.id; renderAdminManagement(); window.scrollTo({ top: 0, behavior:'smooth' }); }));
  $('#cancel-question-edit')?.addEventListener('click', () => { editingQuestionId = null; renderAdminManagement(); });
  $('#question-edit-form')?.addEventListener('submit', saveQuestionChanges);
  $('#export-questions').addEventListener('click', () => exportRowsAsExcel(questions.map(question => ({ Numero:question.sequence, Fecha:question.scheduleDate, Categoria:CATEGORY_META[question.category].name, Pregunta:question.question, Alternativa_A:question.options[0], Alternativa_B:question.options[1], Alternativa_C:question.options[2], Correcta:String.fromCharCode(65 + question.correct), Explicacion:question.explanation })), 'banco-600-preguntas'));
}

function renderQuestionEditor(question) {
  return `<form id="question-edit-form" class="editor-panel"><div class="editor-header"><div><p class="eyebrow">Editando pregunta ${question.sequence}</p><h3>${formatDate(question.scheduleDate)}</h3></div><button type="button" class="btn ghost" id="cancel-question-edit">Cancelar</button></div><div class="form-grid"><label>Fecha programada<input id="edit-q-date" type="date" value="${question.scheduleDate}" required></label><label>Categoría<select id="edit-q-category">${Object.entries(CATEGORY_META).map(([key, meta]) => `<option value="${key}" ${question.category === key ? 'selected' : ''}>${meta.name}</option>`).join('')}</select></label><label class="span-2">Pregunta<textarea id="edit-q-text" required>${escapeHtml(question.question)}</textarea></label><label>Alternativa A<input id="edit-q-a" value="${escapeHtml(question.options[0])}" required></label><label>Alternativa B<input id="edit-q-b" value="${escapeHtml(question.options[1])}" required></label><label>Alternativa C<input id="edit-q-c" value="${escapeHtml(question.options[2])}" required></label><label>Alternativa correcta<select id="edit-q-correct"><option value="0" ${question.correct === 0 ? 'selected' : ''}>A</option><option value="1" ${question.correct === 1 ? 'selected' : ''}>B</option><option value="2" ${question.correct === 2 ? 'selected' : ''}>C</option></select></label><label class="span-2">Explicación<textarea id="edit-q-explanation" required>${escapeHtml(question.explanation)}</textarea></label></div><button class="btn primary" type="submit">Guardar pregunta</button></form>`;
}

async function saveUserChanges(event) {
  event.preventDefault();
  const users = load(KEYS.users);
  const user = users.find(item => item.id === editingUserId);
  if (!user) return;
  const username = $('#edit-username').value.trim();
  const key = normalizeUsername(username);
  const branch = $('#edit-branch').value.trim();
  const password = $('#edit-password').value;
  if (username.length < 3) return toast('El usuario debe tener al menos 3 caracteres.');
  if (users.some(item => item.id !== user.id && item.usernameKey === key)) return toast('Ese nombre de usuario ya existe.');
  if (!branch) return toast('La sucursal no puede quedar vacía.');
  if (password && !passwordMeetsRequirements(password)) return toast('La nueva clave no cumple los requisitos.');
  user.username = username;
  user.name = username;
  user.usernameKey = key;
  user.branch = branch;
  if (password) user.passwordHash = await sha256(password);
  user.updatedAt = new Date().toISOString();
  save(KEYS.users, users);
  editingUserId = null;
  toast('Cuenta actualizada correctamente.');
  renderAdminManagement();
}

function saveQuestionChanges(event) {
  event.preventDefault();
  const questions = load(KEYS.questions);
  const question = questions.find(item => item.id === editingQuestionId);
  if (!question) return;
  const date = $('#edit-q-date').value;
  if (questions.some(item => item.id !== question.id && item.scheduleDate === date)) return toast('Ya existe otra pregunta programada para esa fecha.');
  question.scheduleDate = date;
  question.category = $('#edit-q-category').value;
  question.question = $('#edit-q-text').value.trim();
  question.options = [$('#edit-q-a').value.trim(), $('#edit-q-b').value.trim(), $('#edit-q-c').value.trim()];
  question.correct = Number($('#edit-q-correct').value);
  question.explanation = $('#edit-q-explanation').value.trim();
  question.updatedAt = new Date().toISOString();
  save(KEYS.questions, questions);
  editingQuestionId = null;
  toast('Pregunta actualizada correctamente.');
  renderAdminManagement();
}

function renderDraw() {
  const participants = participantRows(drawPeriod.year, drawPeriod.month).sort((a, b) => b.tickets - a.tickets || b.total - a.total || a.username.localeCompare(b.username));
  const maxTickets = participants.length ? Math.max(...participants.map(row => row.tickets)) : 0;
  const eligible = maxTickets > 0 ? participants.filter(row => row.tickets === maxTickets) : [];
  const draws = load(KEYS.draws);
  const existingDraw = draws.find(draw => draw.period === periodKey(drawPeriod.year, drawPeriod.month));
  const settings = load(KEYS.settings, defaultSettings);

  $('#content').innerHTML = `
    <article class="card filter-card"><div><p class="eyebrow">Selecciona el periodo</p><h3>${periodLabel(drawPeriod.year, drawPeriod.month)}</h3></div>${renderPeriodFilters('draw', drawPeriod)}</article>
    <section class="grid draw-stats">${statCard('Participantes del periodo', participants.length, '👥')}${statCard('Máximo de oportunidades', maxTickets, '★')}${statCard('Personas habilitadas', eligible.length, '🏆')}${statCard('Premio', money(settings.prizeAmount), '🎁')}</section>
    <article class="card draw-highlight"><div><p class="eyebrow">Regla del sorteo</p><h3>Participan únicamente quienes alcanzaron el máximo de oportunidades</h3><p>${eligible.length ? `En este periodo, ${eligible.length} persona(s) tienen ${maxTickets} oportunidad(es) y forman el grupo habilitado.` : 'No existen participantes con oportunidades en el periodo seleccionado.'}</p></div><button id="run-period-draw" class="btn primary" ${!eligible.length || existingDraw ? 'disabled' : ''}>${existingDraw ? 'Sorteo ya realizado' : 'Realizar sorteo'}</button></article>
    ${existingDraw ? `<div class="winner-box featured-winner"><p class="eyebrow">Ganador registrado</p><h3>🎉 ${escapeHtml(existingDraw.winnerName)}</h3><p>${escapeHtml(existingDraw.branch)} · ${escapeHtml(existingDraw.periodLabel)} · ${money(existingDraw.prizeAmount)}</p></div>` : ''}
    <article class="card admin-section"><div class="toolbar"><div><h3>Lista de participantes</h3><p class="card-subtitle">El distintivo “Habilitado” identifica a quienes tienen el máximo de oportunidades.</p></div><button class="btn secondary" id="export-draw-list">Descargar Excel</button></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Sucursal</th><th>Respondidas</th><th>Correctas</th><th>Incorrectas</th><th>Oportunidades</th><th>Estado</th></tr></thead><tbody>${participants.length ? participants.map(row => `<tr class="${row.tickets === maxTickets && maxTickets > 0 ? 'eligible-row' : ''}"><td><b>${escapeHtml(row.username)}</b></td><td>${escapeHtml(row.branch)}</td><td>${row.total}</td><td>${row.correct}</td><td>${row.incorrect}</td><td><b>${row.tickets}</b></td><td>${row.tickets === maxTickets && maxTickets > 0 ? '<span class="status eligible">Habilitado</span>' : '<span class="status neutral">No habilitado</span>'}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">No existen participantes en el periodo seleccionado.</td></tr>'}</tbody></table></div></article>
    <article class="card admin-section"><h3>Historial de sorteos</h3><p class="card-subtitle">Registro de los periodos sorteados.</p><div class="table-wrap"><table><thead><tr><th>Fecha del sorteo</th><th>Periodo</th><th>Ganador</th><th>Sucursal</th><th>Máximo de oportunidades</th><th>Habilitados</th><th>Premio</th></tr></thead><tbody>${draws.length ? draws.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(draw => `<tr><td>${new Intl.DateTimeFormat('es-CL', { dateStyle:'medium', timeStyle:'short' }).format(new Date(draw.createdAt))}</td><td>${escapeHtml(draw.periodLabel)}</td><td><b>${escapeHtml(draw.winnerName)}</b></td><td>${escapeHtml(draw.branch)}</td><td>${draw.maxTickets}</td><td>${draw.eligibleCount}</td><td>${money(draw.prizeAmount)}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">Todavía no se han realizado sorteos.</td></tr>'}</tbody></table></div></article>`;

  $('#draw-apply').addEventListener('click', () => {
    drawPeriod = { month:Number($('#draw-month').value), year:Number($('#draw-year').value) };
    renderDraw();
  });
  $('#run-period-draw')?.addEventListener('click', () => runPeriodDraw(eligible, maxTickets));
  $('#export-draw-list').addEventListener('click', () => exportRowsAsExcel(participants.map(row => ({ Usuario:row.username, Sucursal:row.branch, Respondidas:row.total, Correctas:row.correct, Incorrectas:row.incorrect, Oportunidades:row.tickets, Estado:row.tickets === maxTickets && maxTickets > 0 ? 'Habilitado' : 'No habilitado', Periodo:periodLabel(drawPeriod.year, drawPeriod.month) })), `participantes-sorteo-${periodKey(drawPeriod.year, drawPeriod.month)}`));
}

function runPeriodDraw(eligible, maxTickets) {
  if (!eligible.length) return toast('No existen participantes habilitados.');
  const period = periodKey(drawPeriod.year, drawPeriod.month);
  const draws = load(KEYS.draws);
  if (draws.some(draw => draw.period === period)) return toast('Este periodo ya tiene un sorteo registrado.');
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  const settings = load(KEYS.settings, defaultSettings);
  draws.push({
    id: `d-${crypto.randomUUID()}`,
    period,
    periodLabel: periodLabel(drawPeriod.year, drawPeriod.month),
    winnerId: winner.id,
    winnerName: winner.username,
    branch: winner.branch,
    maxTickets,
    eligibleCount: eligible.length,
    eligibleUserIds: eligible.map(row => row.id),
    prizeAmount: settings.prizeAmount,
    createdAt: new Date().toISOString()
  });
  save(KEYS.draws, draws);
  toast(`Sorteo realizado. Ganador: ${winner.username}.`);
  renderDraw();
}

function exportRowsAsExcel(rows, filename) {
  if (!rows.length) return toast('No existen datos para descargar.');
  const headers = Object.keys(rows[0]);
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows.map(row => headers.map(header => row[header]))].map(line => line.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast('Archivo descargado en formato compatible con Excel.');
}

function restoreSession() {
  const session = load(KEYS.session, null);
  if (!session) return;
  const user = load(KEYS.users).find(item => item.id === session.userId);
  if (user) startSession(user);
}

initStorage();
bindAuth();
bindNavigation();
restoreSession();
