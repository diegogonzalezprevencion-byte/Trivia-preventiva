'use strict';

const sb = window.supabaseClient;
const ADMIN_ALIAS = 'diegogonzalez';
const ADMIN_EMAIL = 'diego.gonzalez@consalud.cl';

const CATEGORY_META = {
  vehicle: { name: 'Movilidad en vehículos', short: 'Vehículos', icon: '🚗', className: 'vehicle' },
  walk: { name: 'Movilidad a pie', short: 'A pie', icon: '🚶', className: 'walk' },
  bike: { name: 'Bicicleta y scooter', short: 'Bici / scooter', icon: '🚲', className: 'bike' }
};
const DB_TO_KEY = {
  'Movilidad en vehículos': 'vehicle',
  'Movilidad a pie': 'walk',
  'Bicicleta y scooter': 'bike'
};
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const defaultSettings = { prizeAmount: 30000, questionBankStart: '2026-01-01' };

let currentUser = null;
let currentProfile = null;
let currentView = 'dashboard';
let adminPeriod = currentPeriod();
let drawPeriod = currentPeriod();
let questionFilters = { day: '', month: '', year: '', search: '' };
let editingQuestionId = null;
let creatingQuestion = false;
let editingUserId = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function todayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = value => new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(value);
const formatDate = iso => new Intl.DateTimeFormat('es-CL', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${iso}T12:00:00`));

function currentPeriod() {
  const today = todayKey();
  return { year: Number(today.slice(0,4)), month: Number(today.slice(5,7)) };
}
function periodKey(year, month) { return `${year}-${String(month).padStart(2,'0')}`; }
function periodLabel(year, month) { return `${MONTHS[month - 1]} ${year}`; }
function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const d = new Date(Date.UTC(year, month, 1));
  return { start, end: d.toISOString().slice(0,10) };
}
function initials(name) { return String(name).split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join('').toUpperCase(); }
function passwordMeetsRequirements(password) { return String(password).length >= 6 && /[A-ZÁÉÍÓÚÑ]/.test(password) && /\d/.test(password); }
function isValidConsaludEmail(value) { return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@consalud\.cl$/i.test(String(value || '').trim()); }
function categoryKey(value) { return DB_TO_KEY[value] || value || 'walk'; }
function categoryDb(value) { return CATEGORY_META[value]?.name || value; }
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
}
function showAuthError(message, type = 'error') {
  const element = $('#auth-message');
  element.textContent = message;
  element.className = `form-message ${type}`;
}
function statCard(label, value, icon, note = '') {
  return `<article class="card stat-card"><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</div><div class="stat-icon">${icon}</div></article>`;
}
function renderLoading(text = 'Cargando información…') {
  $('#content').innerHTML = `<article class="card"><p class="card-subtitle">${escapeHtml(text)}</p></article>`;
}
function readableError(error, fallback = 'Ocurrió un problema. Intenta nuevamente.') {
  const message = String(error?.message || error || '');
  if (/Invalid login credentials/i.test(message)) return 'Usuario o clave incorrectos.';
  if (/User already registered/i.test(message)) return 'Este correo corporativo ya está registrado.';
  if (/Email not confirmed/i.test(message)) return 'Debes confirmar tu correo antes de ingresar.';
  if (/rate limit/i.test(message)) return 'Se realizaron demasiados intentos. Espera unos minutos.';
  if (/Usuario inválido/i.test(message)) return 'Usuario inválido. Debes utilizar un correo que termine en @consalud.cl.';
  return message || fallback;
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



async function getProfile(userId) {
  const { data, error } = await sb.from('profiles').select('id,email,branch,role,created_at').eq('id', userId).single();
  if (error) throw error;
  return data;
}

async function enterApp(user, requiredRole = null) {
  const profile = await getProfile(user.id);
  if (requiredRole && profile.role !== requiredRole) {
    await sb.auth.signOut();
    throw new Error(requiredRole === 'admin' ? 'Esta cuenta no tiene permisos de administrador.' : 'Acceso no autorizado.');
  }
  currentUser = user;
  currentProfile = profile;
  currentView = 'dashboard';
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = profile.role === 'admin' ? ADMIN_ALIAS : profile.email;
  $('#user-branch').textContent = profile.branch;
  $('#user-initials').textContent = initials(profile.role === 'admin' ? ADMIN_ALIAS : profile.email);
  const isAdmin = profile.role === 'admin';
  $$('.admin-only').forEach(el => el.classList.toggle('hidden', !isAdmin));
  $$('.user-only').forEach(el => el.classList.toggle('hidden', isAdmin));
  if (isAdmin) await seedQuestionsIfNeeded();
  navigate('dashboard');
}

function bindAuth() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.tab').forEach(item => item.classList.toggle('active', item === tab));
    $$('[data-auth-form]').forEach(form => form.classList.toggle('hidden', form.dataset.authForm !== tab.dataset.authTab));
    $('#auth-message').textContent = '';
  }));

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('#login-username').value.trim().toLowerCase();
    const password = $('#login-password').value;
    if (!isValidConsaludEmail(email)) return showAuthError('Usuario inválido. Debes utilizar un correo que termine en @consalud.cl.');
    showAuthError('Ingresando…', '');
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await enterApp(data.user, 'user');
    } catch (error) { showAuthError(readableError(error)); }
  });

  $('#register-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('#register-username').value.trim().toLowerCase();
    const password = $('#register-password').value;
    const branch = $('#register-branch').value.trim();
    if (!isValidConsaludEmail(email)) return showAuthError('Usuario inválido. Debes utilizar un correo que termine en @consalud.cl.');
    if (!passwordMeetsRequirements(password)) return showAuthError('La clave debe tener mínimo 6 caracteres, una mayúscula y un número.');
    if (!branch) return showAuthError('Debes indicar una sucursal.');
    showAuthError('Creando cuenta…', '');
    try {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { branch } } });
      if (error) throw error;
      if (!data.session) {
        showAuthError('Cuenta creada. Revisa tu correo corporativo para confirmarla.', 'success');
        $('#register-form').reset();
        return;
      }
      await enterApp(data.user, 'user');
    } catch (error) { showAuthError(readableError(error)); }
  });

  $('#admin-form').addEventListener('submit', async event => {
    event.preventDefault();
    const alias = $('#admin-username').value.trim().toLowerCase();
    const password = $('#admin-password').value;
    if (alias !== ADMIN_ALIAS) return showAuthError('Credenciales de administrador incorrectas.');
    showAuthError('Ingresando…', '');
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
      if (error) throw error;
      await enterApp(data.user, 'admin');
    } catch (error) { showAuthError(readableError(error)); }
  });
}

function bindNavigation() {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
  $('#logout-btn').addEventListener('click', async () => {
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    $('#app-view').classList.add('hidden');
    $('#auth-view').classList.remove('hidden');
    $('#login-form').reset();
    $('#admin-form').reset();
  });
}

function navigate(view) {
  if (!currentProfile) return;
  const adminViews = ['dashboard','admin','draw'];
  const userViews = ['dashboard','trivia','history'];
  if (currentProfile.role === 'admin' && !adminViews.includes(view)) view = 'dashboard';
  if (currentProfile.role !== 'admin' && !userViews.includes(view)) view = 'dashboard';
  currentView = view;
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const titles = {
    dashboard: currentProfile.role === 'admin' ? 'Dashboard de resultados' : 'Inicio',
    trivia: 'Trivia diaria', history: 'Mi historial', admin: 'Administración', draw: 'Sorteo de premio'
  };
  $('#page-title').textContent = titles[view];
  $('#page-kicker').textContent = currentProfile.role === 'admin' ? 'Panel administrador' : 'Movilidad segura';
  if (view === 'dashboard') currentProfile.role === 'admin' ? renderAdminDashboard() : renderUserDashboard();
  if (view === 'trivia') renderTrivia();
  if (view === 'history') renderHistory();
  if (view === 'admin') renderAdminManagement();
  if (view === 'draw') renderDraw();
  $('#content').focus({ preventScroll: true });
}

async function fetchAttempts({ userId = null, start = null, end = null } = {}) {
  let query = sb.from('attempts').select('id,user_id,question_id,answered_on,answer_index,is_correct,stars,answered_at');
  if (userId) query = query.eq('user_id', userId);
  if (start) query = query.gte('answered_on', start);
  if (end) query = query.lt('answered_on', end);
  const { data, error } = await query.order('answered_on', { ascending: false });
  if (error) throw error;
  return data || [];
}

function getStreak(attempts) {
  const days = [...new Set(attempts.map(a => a.answered_on))].sort().reverse();
  if (!days.length) return 0;
  let cursor = new Date(`${todayKey()}T12:00:00`);
  if (days[0] !== todayKey()) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (const day of days) {
    const expected = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Santiago' }).format(cursor);
    if (day !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function renderUserDashboard() {
  renderLoading();
  try {
    const bounds = monthBounds(currentPeriod().year, currentPeriod().month);
    const [monthly, all] = await Promise.all([
      fetchAttempts({ userId: currentUser.id, start: bounds.start, end: bounds.end }),
      fetchAttempts({ userId: currentUser.id })
    ]);
    const correct = monthly.filter(a => a.is_correct).length;
    const incorrect = monthly.length - correct;
    const rate = monthly.length ? Math.round(correct * 100 / monthly.length) : 0;
    const stars = monthly.reduce((sum,a) => sum + Number(a.stars || 0), 0);
    const completed = all.some(a => a.answered_on === todayKey());
    $('#content').innerHTML = `
      <section class="hero-banner"><div><p class="eyebrow">Desafío mensual</p><h3>${completed ? '¡Trivia de hoy completada!' : 'Tu decisión segura comienza hoy'}</h3><p>${completed ? 'Mañana tendrás una nueva situación preventiva.' : 'Responde la pregunta diaria, aprende con la explicación y suma una Estrella cuando aciertes.'}</p><button class="btn" id="hero-action">${completed ? 'Ver mi historial' : 'Responder trivia diaria'}</button></div><div class="streak-box"><div><strong>${getStreak(all)}</strong><span>días de racha</span></div></div></section>
      <p class="period-note"><strong>Resultados de ${periodLabel(currentPeriod().year, currentPeriod().month)}.</strong> Estos indicadores comienzan desde cero cada mes; tu historial completo permanece disponible.</p>
      <section class="grid stats">${statCard('Preguntas respondidas', monthly.length, '✓')}${statCard('Respuestas correctas', correct, '✔')}${statCard('Respuestas incorrectas', incorrect, '✕')}${statCard('Efectividad', `${rate}%`, '↗')}${statCard('Estrellas', stars, '★')}</section>
      <section class="grid two"><article class="card instructions-card"><p class="eyebrow">Participación</p><h3>Instrucciones para participar</h3><p class="card-subtitle">Una experiencia diaria, breve y preventiva.</p><div class="category-list"><div class="category-row"><span class="rank-pill">1</span><div><strong>Ingresa una vez al día</strong><span>Solo existe una trivia disponible por jornada.</span></div></div><div class="category-row"><span class="rank-pill">2</span><div><strong>Analiza la situación</strong><span>Selecciona una de las tres alternativas.</span></div></div><div class="category-row"><span class="rank-pill">3</span><div><strong>Aprende y participa</strong><span>Al acertar sumas una Estrella para el sorteo.</span></div></div></div></article><article class="card"><h3>Resumen del mes</h3><p class="card-subtitle">Tu avance personal se actualiza en línea desde Supabase.</p><div class="category-list"><div class="category-row"><div class="category-icon vehicle">★</div><div><strong>${stars} Estrellas acumuladas</strong><span>${correct} respuestas correctas de ${monthly.length} participaciones.</span><div class="progress"><i style="width:${rate}%"></i></div></div><b>${rate}%</b></div></div></article></section>`;
    $('#hero-action').addEventListener('click', () => navigate(completed ? 'history' : 'trivia'));
  } catch (error) { $('#content').innerHTML = `<article class="card"><h3>No se pudo cargar el inicio</h3><p>${escapeHtml(readableError(error))}</p></article>`; }
}

async function renderTrivia() {
  renderLoading('Buscando la pregunta de hoy…');
  try {
    const { data, error } = await sb.rpc('get_today_question');
    if (error) throw error;
    const q = data?.[0];
    if (!q) {
      $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state"><div class="big-icon">📅</div><h3>No hay una pregunta programada para hoy</h3><p>El administrador puede revisar o agregar preguntas desde el banco.</p></article></div>`;
      return;
    }
    if (q.already_answered) {
      $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state"><div class="big-icon">✓</div><h3>Ya respondiste la trivia de hoy</h3><p>Tu resultado quedó guardado en Mi historial.</p><button class="btn primary" id="go-history">Ver historial</button></article></div>`;
      $('#go-history').addEventListener('click', () => navigate('history'));
      return;
    }
    const key = categoryKey(q.category);
    const meta = CATEGORY_META[key];
    const options = [q.option_a, q.option_b, q.option_c];
    $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card"><div class="question-head"><span class="category-badge ${meta.className}">${meta.icon} ${meta.name}</span><span>Pregunta del día</span></div><h3>${escapeHtml(q.question_text)}</h3><form id="answer-form" class="answers">${options.map((option,index) => `<label class="answer"><input type="radio" name="answer" value="${index + 1}" required><span class="answer-letter">${String.fromCharCode(65+index)}</span><span>${escapeHtml(option)}</span></label>`).join('')}<button class="btn primary" type="submit">Responder</button></form></article></div>`;
    $('#answer-form').addEventListener('submit', async event => {
      event.preventDefault();
      const selected = Number(new FormData(event.currentTarget).get('answer'));
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      button.textContent = 'Guardando…';
      try {
        const { data: result, error: submitError } = await sb.rpc('submit_trivia_answer', { p_question_id: q.id, p_answer_index: selected });
        if (submitError) throw submitError;
        const row = result?.[0];
        $('#content').innerHTML = `<div class="trivia-wrap"><article class="question-card completed-state"><div class="big-icon">${row.is_correct ? '★' : '💡'}</div><h3>${row.is_correct ? '¡Respuesta correcta!' : 'Respuesta incorrecta'}</h3><p>${row.is_correct ? 'Sumaste una Estrella para el sorteo mensual.' : 'Hoy no sumaste una Estrella, pero tu participación quedó registrada.'}</p><div class="feedback-box"><strong>Explicación preventiva</strong><p>${escapeHtml(row.explanation)}</p></div><button class="btn primary" id="back-home">Volver al inicio</button></article></div>`;
        $('#back-home').addEventListener('click', () => navigate('dashboard'));
      } catch (submitError) { toast(readableError(submitError)); button.disabled = false; button.textContent = 'Responder'; }
    });
  } catch (error) { $('#content').innerHTML = `<article class="card"><h3>No se pudo cargar la trivia</h3><p>${escapeHtml(readableError(error))}</p></article>`; }
}

async function renderHistory() {
  renderLoading();
  try {
    const attempts = await fetchAttempts({ userId: currentUser.id });
    $('#content').innerHTML = `<article class="card admin-section"><h3>Mi historial completo</h3><p class="card-subtitle">Tus resultados se conservan aunque los indicadores mensuales vuelvan a cero.</p><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Resultado</th><th>Estrellas</th></tr></thead><tbody>${attempts.length ? attempts.map(a => `<tr><td>${formatDate(a.answered_on)}</td><td>${a.is_correct ? '<span class="status eligible">Correcta</span>' : '<span class="status neutral">Incorrecta</span>'}</td><td><b>${a.stars}</b></td></tr>`).join('') : '<tr><td colspan="3" class="empty">Todavía no has respondido preguntas.</td></tr>'}</tbody></table></div></article>`;
  } catch (error) { toast(readableError(error)); }
}

function renderPeriodFilters(prefix, period) {
  return `<div class="filter-row"><label>Mes<select id="${prefix}-month">${MONTHS.map((m,i) => `<option value="${i+1}" ${period.month === i+1 ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label>Año<select id="${prefix}-year">${Array.from({length:75},(_,i)=>2026+i).map(y => `<option value="${y}" ${period.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></label><button class="btn primary" id="${prefix}-apply">Aplicar filtros</button></div>`;
}

async function getAdminPeriodData(period) {
  const bounds = monthBounds(period.year, period.month);
  const [{ data: profiles, error: pError }, attempts] = await Promise.all([
    sb.from('profiles').select('id,email,branch,role,created_at').eq('role','user'),
    fetchAttempts({ start: bounds.start, end: bounds.end })
  ]);
  if (pError) throw pError;
  const profileMap = new Map((profiles || []).map(p => [p.id,p]));
  const rows = new Map();
  attempts.forEach(a => {
    const p = profileMap.get(a.user_id);
    if (!p) return;
    if (!rows.has(a.user_id)) rows.set(a.user_id, { id:a.user_id, email:p.email, branch:p.branch, total:0, correct:0, incorrect:0, stars:0 });
    const row = rows.get(a.user_id);
    row.total += 1;
    row.correct += a.is_correct ? 1 : 0;
    row.incorrect += a.is_correct ? 0 : 1;
    row.stars += Number(a.stars || 0);
  });
  return { profiles: profiles || [], attempts, participants:[...rows.values()] };
}

async function renderAdminDashboard() {
  renderLoading();
  try {
    const { participants, attempts } = await getAdminPeriodData(adminPeriod);
    const correct = attempts.filter(a => a.is_correct).length;
    const incorrect = attempts.length - correct;
    const correctRate = attempts.length ? Math.round(correct * 100 / attempts.length) : 0;
    const incorrectRate = attempts.length ? 100 - correctRate : 0;
    const ranking = participants.slice().sort((a,b) => b.total-a.total || b.stars-a.stars || a.email.localeCompare(b.email));
    $('#content').innerHTML = `<article class="card filter-card"><div><p class="eyebrow">Periodo de análisis</p><h3>${periodLabel(adminPeriod.year,adminPeriod.month)}</h3></div>${renderPeriodFilters('admin-dashboard',adminPeriod)}</article><section class="grid stats">${statCard('Personas que participaron',participants.length,'👥')}${statCard('Preguntas respondidas',attempts.length,'✓')}${statCard('Respuestas correctas',`${correct} · ${correctRate}%`,'✔')}${statCard('Respuestas incorrectas',`${incorrect} · ${incorrectRate}%`,'✕')}</section><article class="card admin-section"><div class="toolbar"><div><h3>Ranking por participación</h3><p class="card-subtitle">Ordenado por quién respondió más preguntas durante el periodo.</p></div><button class="btn secondary" id="export-ranking">Descargar Excel</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Correo</th><th>Sucursal</th><th>Respondidas</th><th>Correctas</th><th>Incorrectas</th><th>Estrellas</th></tr></thead><tbody>${ranking.length ? ranking.map((r,i)=>`<tr><td><span class="rank-pill">${i+1}</span></td><td><b>${escapeHtml(r.email)}</b></td><td>${escapeHtml(r.branch)}</td><td>${r.total}</td><td>${r.correct}</td><td>${r.incorrect}</td><td>${r.stars}</td></tr>`).join('') : '<tr><td colspan="7" class="empty">No existen respuestas en este periodo.</td></tr>'}</tbody></table></div></article>`;
    $('#admin-dashboard-apply').addEventListener('click', () => { adminPeriod = { month:Number($('#admin-dashboard-month').value), year:Number($('#admin-dashboard-year').value) }; renderAdminDashboard(); });
    $('#export-ranking').addEventListener('click', () => exportRowsAsExcel(ranking.map((r,i)=>({Posición:i+1,Correo:r.email,Sucursal:r.branch,Respondidas:r.total,Correctas:r.correct,Incorrectas:r.incorrect,Estrellas:r.stars,Periodo:periodLabel(adminPeriod.year,adminPeriod.month)})), `ranking-${periodKey(adminPeriod.year,adminPeriod.month)}`));
  } catch (error) { $('#content').innerHTML = `<article class="card"><h3>No se pudo cargar el dashboard</h3><p>${escapeHtml(readableError(error))}</p></article>`; }
}

async function seedQuestionsIfNeeded() {
  const { count, error } = await sb.from('questions').select('*', { count:'exact', head:true });
  if (error || count) return;
  const bank = buildQuestionBank().map(q => ({
    sequence:q.sequence, scheduled_date:q.scheduleDate, category:categoryDb(q.category), question_text:q.question,
    option_a:q.options[0], option_b:q.options[1], option_c:q.options[2], correct_index:q.correct + 1,
    explanation:q.explanation, active:true
  }));
  for (let i=0; i<bank.length; i+=100) {
    const { error: insertError } = await sb.from('questions').insert(bank.slice(i,i+100));
    if (insertError) { console.error(insertError); toast('No fue posible cargar automáticamente el banco de preguntas.'); return; }
  }
  toast('Banco de 600 preguntas cargado correctamente.');
}

function questionWhereText(q) { return `${q.question_text} ${q.option_a} ${q.option_b} ${q.option_c} ${q.explanation}`.toLowerCase(); }

async function fetchQuestions() {
  let query = sb.from('questions').select('*').order('scheduled_date', { ascending:true }).limit(700);
  if (questionFilters.day) query = query.eq('scheduled_date', questionFilters.day);
  else {
    if (questionFilters.year) query = query.gte('scheduled_date', `${questionFilters.year}-01-01`).lt('scheduled_date', `${Number(questionFilters.year)+1}-01-01`);
    if (questionFilters.month) {
      const y = Number(questionFilters.year || 2026), m = Number(questionFilters.month);
      const b = monthBounds(y,m); query = query.gte('scheduled_date',b.start).lt('scheduled_date',b.end);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter(q => !questionFilters.search || questionWhereText(q).includes(questionFilters.search.toLowerCase()));
}

async function renderAdminManagement() {
  renderLoading();
  try {
    const [{ data: users, error: uError }, questions] = await Promise.all([
      sb.from('profiles').select('id,email,branch,role,created_at').eq('role','user').order('created_at',{ascending:false}),
      fetchQuestions()
    ]);
    if (uError) throw uError;
    const editUser = editingUserId ? (users || []).find(u => u.id === editingUserId) : null;
    const editQuestion = editingQuestionId ? questions.find(q => q.id === editingQuestionId) : null;
    $('#content').innerHTML = `
      <article class="card admin-section"><div class="toolbar"><div><h3>Personas registradas</h3><p class="card-subtitle">Las claves no se muestran. Puedes enviar un enlace de cambio de clave o eliminar la cuenta.</p></div></div><div class="table-wrap"><table><thead><tr><th>Correo</th><th>Sucursal</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>${(users || []).length ? users.map(u=>`<tr><td><b>${escapeHtml(u.email)}</b></td><td>${escapeHtml(u.branch)}</td><td>${new Intl.DateTimeFormat('es-CL',{dateStyle:'medium'}).format(new Date(u.created_at))}</td><td><div class="table-actions"><button class="btn small ghost edit-user" data-id="${u.id}">Editar sucursal</button><button class="btn small ghost reset-user" data-email="${escapeHtml(u.email)}">Cambiar clave</button><button class="btn small danger delete-user" data-id="${u.id}" data-email="${escapeHtml(u.email)}">Eliminar</button></div></td></tr>`).join('') : '<tr><td colspan="4" class="empty">No existen personas registradas.</td></tr>'}</tbody></table></div>${editUser ? `<form id="edit-user-form" class="inline-editor"><h4>Editar cuenta</h4><div class="form-grid"><label>Correo corporativo<input value="${escapeHtml(editUser.email)}" disabled></label><label>Sucursal<input id="edit-branch" value="${escapeHtml(editUser.branch)}" required></label></div><div class="table-actions"><button class="btn primary" type="submit">Guardar</button><button class="btn ghost" type="button" id="cancel-user-edit">Cancelar</button></div></form>` : ''}</article>
      <article class="card admin-section"><div class="toolbar"><div><h3>Banco de preguntas</h3><p class="card-subtitle">Banco programado por día. Puedes buscar, editar y agregar nuevas preguntas.</p></div><div class="toolbar-actions"><button class="btn primary" id="add-question">+ Agregar pregunta</button><button class="btn ghost" id="export-questions">Descargar banco</button></div></div><div class="question-filter-grid"><label>Día<input id="q-filter-day" type="date" value="${questionFilters.day}"></label><label>Mes<select id="q-filter-month"><option value="">Todos</option>${MONTHS.map((m,i)=>`<option value="${i+1}" ${String(i+1)===String(questionFilters.month)?'selected':''}>${m}</option>`).join('')}</select></label><label>Año<select id="q-filter-year"><option value="">Todos</option>${Array.from({length:75},(_,i)=>2026+i).map(y=>`<option value="${y}" ${String(y)===String(questionFilters.year)?'selected':''}>${y}</option>`).join('')}</select></label><label>Buscar<input id="q-filter-search" value="${escapeHtml(questionFilters.search)}" placeholder="Pregunta o palabra clave"></label><button class="btn secondary" id="apply-q-filters">Buscar</button><button class="btn ghost" id="clear-q-filters">Limpiar</button></div><p class="card-subtitle">${questions.length} pregunta(s) encontrada(s).</p><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Pregunta</th><th>Acción</th></tr></thead><tbody>${questions.length ? questions.map(q=>`<tr><td>${formatDate(q.scheduled_date)}</td><td>${escapeHtml(q.category)}</td><td>${escapeHtml(q.question_text)}</td><td><button class="btn small ghost edit-question" data-id="${q.id}">Editar</button></td></tr>`).join('') : '<tr><td colspan="4" class="empty">No se encontraron preguntas.</td></tr>'}</tbody></table></div>${creatingQuestion ? renderQuestionForm(null, questions) : ''}${editQuestion ? renderQuestionForm(editQuestion, questions) : ''}</article>`;

    $$('.edit-user').forEach(b=>b.addEventListener('click',()=>{editingUserId=b.dataset.id;renderAdminManagement();}));
    $$('.reset-user').forEach(b=>b.addEventListener('click',()=>sendPasswordReset(b.dataset.email)));
    $$('.delete-user').forEach(b=>b.addEventListener('click',()=>deleteUser(b.dataset.id,b.dataset.email)));
    $('#edit-user-form')?.addEventListener('submit', async e=>{e.preventDefault();const branch=$('#edit-branch').value.trim();const {error}=await sb.from('profiles').update({branch}).eq('id',editingUserId);if(error)return toast(readableError(error));editingUserId=null;toast('Sucursal actualizada.');renderAdminManagement();});
    $('#cancel-user-edit')?.addEventListener('click',()=>{editingUserId=null;renderAdminManagement();});
    $('#add-question').addEventListener('click',()=>{creatingQuestion=true;editingQuestionId=null;renderAdminManagement();});
    $$('.edit-question').forEach(b=>b.addEventListener('click',()=>{editingQuestionId=Number(b.dataset.id);creatingQuestion=false;renderAdminManagement();}));
    $('#question-form')?.addEventListener('submit', saveQuestion);
    $('#cancel-question')?.addEventListener('click',()=>{editingQuestionId=null;creatingQuestion=false;renderAdminManagement();});
    $('#apply-q-filters').addEventListener('click',()=>{questionFilters={day:$('#q-filter-day').value,month:$('#q-filter-month').value,year:$('#q-filter-year').value,search:$('#q-filter-search').value.trim()};renderAdminManagement();});
    $('#clear-q-filters').addEventListener('click',()=>{questionFilters={day:'',month:'',year:'',search:''};renderAdminManagement();});
    $('#export-questions').addEventListener('click',()=>exportRowsAsExcel(questions.map(q=>({Secuencia:q.sequence,Fecha:q.scheduled_date,Categoría:q.category,Pregunta:q.question_text,Alternativa_A:q.option_a,Alternativa_B:q.option_b,Alternativa_C:q.option_c,Correcta:q.correct_index,Explicación:q.explanation,Activa:q.active?'Sí':'No'})),'banco-preguntas'));
  } catch (error) { $('#content').innerHTML = `<article class="card"><h3>No se pudo cargar Administración</h3><p>${escapeHtml(readableError(error))}</p></article>`; }
}

function nextQuestionDate(questions) {
  if (!questions.length) return todayKey();
  return addDays(questions.map(q=>q.scheduled_date).sort().at(-1),1);
}
function renderQuestionForm(q, questions) {
  const creating = !q;
  const date = q?.scheduled_date || nextQuestionDate(questions);
  return `<form id="question-form" class="inline-editor"><h4>${creating?'Agregar pregunta':'Editar pregunta'}</h4><div class="form-grid"><label>Fecha<input id="edit-q-date" type="date" value="${date}" required></label><label>Categoría<select id="edit-q-category">${Object.values(CATEGORY_META).map(meta=>`<option value="${meta.name}" ${q?.category===meta.name?'selected':''}>${meta.name}</option>`).join('')}</select></label><label class="span-2">Pregunta<textarea id="edit-q-text" required>${escapeHtml(q?.question_text || '')}</textarea></label><label>Alternativa A<input id="edit-q-a" value="${escapeHtml(q?.option_a || '')}" required></label><label>Alternativa B<input id="edit-q-b" value="${escapeHtml(q?.option_b || '')}" required></label><label>Alternativa C<input id="edit-q-c" value="${escapeHtml(q?.option_c || '')}" required></label><label>Alternativa correcta<select id="edit-q-correct"><option value="1" ${q?.correct_index===1?'selected':''}>A</option><option value="2" ${q?.correct_index===2?'selected':''}>B</option><option value="3" ${q?.correct_index===3?'selected':''}>C</option></select></label><label class="span-2">Explicación<textarea id="edit-q-explanation" required>${escapeHtml(q?.explanation || '')}</textarea></label></div><div class="table-actions"><button class="btn primary" type="submit">Guardar pregunta</button><button class="btn ghost" type="button" id="cancel-question">Cancelar</button></div></form>`;
}
async function saveQuestion(event) {
  event.preventDefault();
  const payload = { scheduled_date:$('#edit-q-date').value, category:$('#edit-q-category').value, question_text:$('#edit-q-text').value.trim(), option_a:$('#edit-q-a').value.trim(), option_b:$('#edit-q-b').value.trim(), option_c:$('#edit-q-c').value.trim(), correct_index:Number($('#edit-q-correct').value), explanation:$('#edit-q-explanation').value.trim(), active:true };
  let error;
  if (editingQuestionId) ({ error } = await sb.from('questions').update(payload).eq('id',editingQuestionId));
  else {
    const { data:maxRow } = await sb.from('questions').select('sequence').order('sequence',{ascending:false}).limit(1).maybeSingle();
    payload.sequence = Number(maxRow?.sequence || 0) + 1;
    ({ error } = await sb.from('questions').insert(payload));
  }
  if (error) return toast(readableError(error));
  editingQuestionId=null;creatingQuestion=false;toast('Pregunta guardada correctamente.');renderAdminManagement();
}
async function sendPasswordReset(email) {
  if (!confirm(`Se enviará un enlace para cambiar la clave a ${email}. ¿Continuar?`)) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) return toast(readableError(error));
  toast('Enlace de cambio de clave enviado al correo corporativo.');
}
async function deleteUser(id,email) {
  if (!confirm(`¿Eliminar definitivamente la cuenta ${email} y sus respuestas?`)) return;
  const { error } = await sb.rpc('admin_delete_user',{ p_user_id:id });
  if (error) return toast('Falta habilitar la eliminación segura de usuarios en Supabase.');
  toast('Usuario eliminado correctamente.');renderAdminManagement();
}

async function renderDraw() {
  renderLoading();
  try {
    const { participants } = await getAdminPeriodData(drawPeriod);
    participants.sort((a,b)=>b.stars-a.stars || b.total-a.total || a.email.localeCompare(b.email));
    const maxStars = participants.length ? Math.max(...participants.map(p=>p.stars)) : 0;
    const eligible = maxStars > 0 ? participants.filter(p=>p.stars===maxStars) : [];
    const { data: drawRows, error:dError } = await sb.from('draws').select('id,draw_year,draw_month,winner_user_id,maximum_stars,eligible_participants,prize_amount,created_at').order('created_at',{ascending:false});
    if (dError) throw dError;
    const winnerIds = [...new Set((drawRows || []).map(d => d.winner_user_id))];
    let winnerProfiles = [];
    if (winnerIds.length) {
      const { data, error } = await sb.from('profiles').select('id,email,branch').in('id', winnerIds);
      if (error) throw error;
      winnerProfiles = data || [];
    }
    const winnerMap = new Map(winnerProfiles.map(p => [p.id, p]));
    const draws = (drawRows || []).map(d => ({ ...d, winner: winnerMap.get(d.winner_user_id) || null }));
    const existing = draws.find(d=>d.draw_year===drawPeriod.year && d.draw_month===drawPeriod.month);
    $('#content').innerHTML = `<article class="card filter-card"><div><p class="eyebrow">Selecciona el periodo</p><h3>${periodLabel(drawPeriod.year,drawPeriod.month)}</h3></div>${renderPeriodFilters('draw',drawPeriod)}</article><section class="grid draw-stats">${statCard('Participantes del periodo',participants.length,'👥')}${statCard('Máximo de Estrellas',maxStars,'★')}${statCard('Personas habilitadas',eligible.length,'🏆')}${statCard('Premio',money(30000),'🎁')}</section><article class="card draw-highlight"><div><p class="eyebrow">Regla del sorteo</p><h3>Participan únicamente quienes alcanzaron el máximo de Estrellas</h3><p>${eligible.length ? `${eligible.length} persona(s) tienen ${maxStars} Estrella(s) y forman el grupo habilitado.` : 'No existen participantes con Estrellas en el periodo seleccionado.'}</p></div><button id="run-period-draw" class="btn primary" ${!eligible.length||existing?'disabled':''}>${existing?'Sorteo ya realizado':'Realizar sorteo'}</button></article>${existing?`<div class="winner-box featured-winner"><p class="eyebrow">Ganador registrado</p><h3>🎉 ${escapeHtml(existing.winner?.email || 'Usuario')}</h3><p>${escapeHtml(existing.winner?.branch || '')} · ${periodLabel(existing.draw_year,existing.draw_month)} · ${money(existing.prize_amount)}</p></div>`:''}<article class="card admin-section"><div class="toolbar"><div><h3>Lista de participantes</h3><p class="card-subtitle">“Habilitado” identifica a quienes tienen el máximo de Estrellas.</p></div><button class="btn secondary" id="export-draw-list">Descargar Excel</button></div><div class="table-wrap"><table><thead><tr><th>Correo</th><th>Sucursal</th><th>Respondidas</th><th>Correctas</th><th>Incorrectas</th><th>Estrellas</th><th>Estado</th></tr></thead><tbody>${participants.length?participants.map(p=>`<tr class="${p.stars===maxStars&&maxStars>0?'eligible-row':''}"><td><b>${escapeHtml(p.email)}</b></td><td>${escapeHtml(p.branch)}</td><td>${p.total}</td><td>${p.correct}</td><td>${p.incorrect}</td><td><b>${p.stars}</b></td><td>${p.stars===maxStars&&maxStars>0?'<span class="status eligible">Habilitado</span>':'<span class="status neutral">No habilitado</span>'}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">No existen participantes en el periodo.</td></tr>'}</tbody></table></div></article><article class="card admin-section"><h3>Historial de sorteos</h3><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Periodo</th><th>Ganador</th><th>Sucursal</th><th>Máximo</th><th>Habilitados</th><th>Premio</th></tr></thead><tbody>${(draws||[]).length?(draws||[]).map(d=>`<tr><td>${new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d.created_at))}</td><td>${periodLabel(d.draw_year,d.draw_month)}</td><td><b>${escapeHtml(d.winner?.email||'')}</b></td><td>${escapeHtml(d.winner?.branch||'')}</td><td>${d.maximum_stars}</td><td>${d.eligible_participants}</td><td>${money(d.prize_amount)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Todavía no se han realizado sorteos.</td></tr>'}</tbody></table></div></article>`;
    $('#draw-apply').addEventListener('click',()=>{drawPeriod={month:Number($('#draw-month').value),year:Number($('#draw-year').value)};renderDraw();});
    $('#run-period-draw')?.addEventListener('click',async()=>{const {data,error}=await sb.rpc('run_monthly_draw',{p_year:drawPeriod.year,p_month:drawPeriod.month});if(error)return toast(readableError(error));toast(`Sorteo realizado. Ganador: ${data?.[0]?.winner_email || ''}`);renderDraw();});
    $('#export-draw-list').addEventListener('click',()=>exportRowsAsExcel(participants.map(p=>({Correo:p.email,Sucursal:p.branch,Respondidas:p.total,Correctas:p.correct,Incorrectas:p.incorrect,Estrellas:p.stars,Estado:p.stars===maxStars&&maxStars>0?'Habilitado':'No habilitado',Periodo:periodLabel(drawPeriod.year,drawPeriod.month)})),`participantes-${periodKey(drawPeriod.year,drawPeriod.month)}`));
  } catch (error) { $('#content').innerHTML = `<article class="card"><h3>No se pudo cargar el sorteo</h3><p>${escapeHtml(readableError(error))}</p></article>`; }
}

function exportRowsAsExcel(rows, filename) {
  if (!rows.length) return toast('No existen datos para descargar.');
  const headers=Object.keys(rows[0]);
  const cell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv='\uFEFF'+[headers,...rows.map(r=>headers.map(h=>r[h]))].map(line=>line.map(cell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${filename}.csv`;link.click();URL.revokeObjectURL(url);toast('Archivo descargado en formato compatible con Excel.');
}


function showPasswordRecovery() {
  const card = document.querySelector('.auth-card');
  if (!card) return;
  document.querySelector('#app-view')?.classList.add('hidden');
  document.querySelector('#auth-view')?.classList.remove('hidden');
  card.innerHTML = `<h2>Cambiar clave</h2><p class="card-subtitle">Crea una nueva clave con mínimo 6 caracteres, una mayúscula y un número.</p><form id="recovery-form" class="auth-form"><label>Nueva clave<input id="recovery-password" type="password" minlength="6" pattern="(?=.*[A-Z])(?=.*\\d).{6,}" required></label><label>Repetir nueva clave<input id="recovery-password-2" type="password" required></label><button class="btn primary full" type="submit">Guardar nueva clave</button><p id="recovery-message" class="form-message"></p></form>`;
  document.querySelector('#recovery-form').addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.querySelector('#recovery-password').value;
    const repeated = document.querySelector('#recovery-password-2').value;
    const message = document.querySelector('#recovery-message');
    if (!passwordMeetsRequirements(password)) { message.textContent = 'La clave debe tener mínimo 6 caracteres, una mayúscula y un número.'; message.className = 'form-message error'; return; }
    if (password !== repeated) { message.textContent = 'Las claves no coinciden.'; message.className = 'form-message error'; return; }
    const { error } = await sb.auth.updateUser({ password });
    if (error) { message.textContent = readableError(error); message.className = 'form-message error'; return; }
    message.textContent = 'Clave actualizada. Ya puedes cerrar esta pestaña e ingresar normalmente.';
    message.className = 'form-message success';
  });
}

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setTimeout(showPasswordRecovery, 0);
});

async function restoreSession() {
  const { data:{ session } } = await sb.auth.getSession();
  if (!session?.user) return;
  try { await enterApp(session.user); } catch (error) { await sb.auth.signOut(); }
}

try {
  bindAuth();
  bindNavigation();
  window.__TRIVIA_APP_READY__ = true;
  restoreSession().catch(error => {
    console.error('No fue posible restaurar la sesión:', error);
    showAuthError('No fue posible conectar con Supabase. Intenta recargar la página.');
  });
} catch (error) {
  console.error('Error al iniciar la aplicación:', error);
  const message = document.querySelector('#auth-message');
  if (message) {
    message.textContent = `Error al iniciar: ${error?.message || error}`;
    message.className = 'form-message error';
  }
}
