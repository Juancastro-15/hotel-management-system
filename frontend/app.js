// URL de tu backend en Render
const API_URL = 'https://hotel-management-system-dun5.onrender.com/api';

let allRooms = []; // Memoria global para filtros y búsqueda

// 1. Cambiar entre Login y Registro en la interfaz
function toggleAuthView(view) {
  const loginContainer = document.getElementById('form-login-container');
  const registerContainer = document.getElementById('form-register-container');
  
  if (view === 'register') {
    loginContainer.classList.add('hidden');
    loginContainer.style.display = 'none';
    registerContainer.classList.remove('hidden');
    registerContainer.style.display = 'block';
  } else {
    registerContainer.classList.add('hidden');
    registerContainer.style.display = 'none';
    loginContainer.classList.remove('hidden');
    loginContainer.style.display = 'block';
  }
}

// 2. Registrar un nuevo usuario (enviando a POST /api/auth/register)
async function registrarNuevoUsuario(event) {
  event.preventDefault();
  
  const nombre = document.getElementById('reg-nombre').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const rol = document.getElementById('reg-rol').value;

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol })
    });

    const data = await res.json();

    if (res.ok) {
      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      document.getElementById('register-form').reset();
      toggleAuthView('login');
    } else {
      document.getElementById('register-error').innerText = data.mensaje || 'Error al registrarse';
    }
  } catch (err) {
    console.error('Error en registro:', err);
    document.getElementById('register-error').innerText = 'No se pudo conectar con el servidor';
  }
}

// 3. Manejo del Login (capturando rol y ID de usuario)
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('jwt_token', data.token);
      
      // Asignamos el rol enviado por el backend
      const rol = data.rol || (data.usuario && data.usuario.rol) || 'propietario';
      localStorage.setItem('user_role', rol.toLowerCase());

      // Guardamos el ID del usuario
      const userId = data.userId || data.id || (data.usuario && (data.usuario.id || data.usuario._id)) || '';
      localStorage.setItem('user_id', userId);

      showDashboard();
    } else {
      document.getElementById('login-error').innerText = data.mensaje || 'Error al ingresar';
    }
  } catch (err) {
    document.getElementById('login-error').innerText = 'No se pudo conectar con el servidor';
  }
});

// 4. Mostrar Dashboard y aplicar permisos según el rol
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  applyRolePermissions();
  loadRooms();
}

function applyRolePermissions() {
  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';
  const isOperador = role === 'recepcionista' || role === 'operador';

  // Mostrar/Ocultar elementos exclusivos de Administrador
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  // Badge visual en la cabecera
  const badge = document.getElementById('user-role-badge');
  if (badge) {
    if (isAdmin) {
      badge.innerText = '👑 Administrador';
      badge.style.background = '#6f42c1';
    } else if (isOperador) {
      badge.innerText = '🛎️ Recepcionista / Operador';
      badge.style.background = '#17a2b8';
    } else {
      badge.innerText = '🏠 Propietario';
      badge.style.background = '#28a745';
    }
  }
}

// 5. Cargar Habitaciones con filtrado inteligente por Rol
async function loadRooms() {
  const token = localStorage.getItem('jwt_token');
  const role = localStorage.getItem('user_role') || 'propietario';
  const userId = localStorage.getItem('user_id');

  try {
    const res = await fetch(`${API_URL}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    let rooms = Array.isArray(data) ? data : (data.habitaciones || data.data || []);

    // Si el rol es Propietario, filtramos únicamente sus propiedades asociadas
    if (role === 'propietario' && userId) {
      rooms = rooms.filter(room => 
        String(room.propietario_id || room.user_id || room.usuario_id) === String(userId)
      );
    }

    allRooms = rooms;
    renderRoomsTable(allRooms);
    updateKPIs(allRooms);
  } catch (err) {
    console.error('Error al cargar habitaciones:', err);
  }
}

// 6. Renderizar la tabla de habitaciones
function renderRoomsTable(rooms) {
  const tbody = document.getElementById('rooms-list');
  tbody.innerHTML = '';

  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';
  const isPropietario = role === 'propietario';

  if (rooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay propiedades registradas o asociadas.</td></tr>`;
    return;
  }

  rooms.forEach(room => {
    const estado = room.estado || room.status || 'Disponible';
    const roomId = room.id || room._id;
    const numeroApto = room.numero || room.room_number || '';
    const tipoApto = room.tipo || room.type || '';
    const precioApto = room.precio_noche || room.precio || room.price || 0;
    
    const nombresP = room.nombres_propietario || '';
    const apellidosP = room.apellidos_propietario || '';
    const emailP = room.email_propietario || '';
    const celularP = room.celular_propietario || '';
    
    const nombreCompleto = nombresP ? `${nombresP} ${apellidosP}` : 'Administración';
    const contactoP = celularP || emailP || 'N/A';

    let actionButtons = '';

    // Botones de Check-In / Check-Out operativos (Admin y Operador)
    if (!isPropietario) {
      if (estado.toLowerCase() === 'disponible') {
        actionButtons += `<button class="btn-checkin" onclick="realizarCheckIn(${roomId})">Check-In</button> `;
      } else {
        actionButtons += `<button class="btn-checkout" onclick="realizarCheckOut(${roomId})">Check-Out</button> `;
      }
    } else {
      // Botón especial para el Propietario
      actionButtons += `<button onclick="openCheckInModal(${roomId}, '${numeroApto}')" style="background:#007bff; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #fff; font-weight: bold;">📅 Informar Check-In</button>`;
    }

    // Botones exclusivos de Admin (Editar / Eliminar)
    if (isAdmin) {
      actionButtons += `<button onclick="openEditRoomModal(${roomId}, '${numeroApto}', '${tipoApto}', ${precioApto}, '${nombresP}', '${apellidosP}', '${emailP}', '${celularP}')" style="background:#ffc107; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #000; font-weight: bold; margin-right: 4px;">Editar</button>`;
      actionButtons += `<button onclick="eliminarHabitacion(${roomId}, '${numeroApto}')" style="background:#dc3545; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #fff; font-weight: bold;">Eliminar</button>`;
    }

    tbody.innerHTML += `
      <tr>
        <td class="admin-only" style="text-align: center;"><input type="checkbox" class="room-checkbox" value="${roomId}" data-numero="${numeroApto}"></td>
        <td><strong>${numeroApto}</strong></td>
        <td>${tipoApto}</td>
        <td>$${Number(precioApto).toLocaleString()}</td>
        <td>${nombreCompleto}<br><small style="color: #666;">${contactoP}</small></td>
        <td><span class="status ${estado}">${estado}</span></td>
        <td>${actionButtons}</td>
      </tr>
    `;
  });

  applyRolePermissions();
}

// 7. Actualizar KPIs (Tarjetas de resumen)
function updateKPIs(rooms) {
  const total = rooms.length;
  const disponibles = rooms.filter(r => (r.estado || r.status || '').toLowerCase() === 'disponible').length;
  const ocupadas = total - disponibles;

  document.getElementById('kpi-total').innerText = total;
  document.getElementById('kpi-disponibles').innerText = disponibles;
  document.getElementById('kpi-ocupadas').innerText = ocupadas;
}

// 8. Filtrar habitaciones en tiempo real
function filtrarHabitaciones() {
  const texto = document.getElementById('search-input').value.toLowerCase();
  const estadoFiltro = document.getElementById('filter-status').value;

  const filtered = allRooms.filter(room => {
    const numero = (room.numero || room.room_number || '').toLowerCase();
    const nombres = (room.nombres_propietario || '').toLowerCase();
    const apellidos = (room.apellidos_propietario || '').toLowerCase();
    const estado = (room.estado || room.status || '').toLowerCase();

    const coincideTexto = numero.includes(texto) || nombres.includes(texto) || apellidos.includes(texto);
    const coincideEstado = estadoFiltro === 'todos' || estado === estadoFiltro;

    return coincideTexto && coincideEstado;
  });

  renderRoomsTable(filtered);
}

// 9. Modal de Propietario (Informar Check-In)
function openCheckInModal(roomId, numero) {
  document.getElementById('checkin-room-id').value = roomId;
  document.getElementById('checkin-room-title').innerText = `Informar Próximo Check-In - Apto ${numero}`;
  const modal = document.getElementById('propietario-checkin-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeCheckInModal() {
  const modal = document.getElementById('propietario-checkin-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

async function enviarAvisoCheckIn(event) {
  event.preventDefault();
  const roomId = document.getElementById('checkin-room-id').value;
  const fecha = document.getElementById('checkin-fecha').value;
  const huesped = document.getElementById('checkin-huesped').value;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/habitaciones/${roomId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        estado: 'Reservado / Por llegar', 
        proximo_huesped: huesped, 
        fecha_ingreso: fecha 
      })
    });

    if (res.ok) {
      alert('¡Aviso de check-in enviado con éxito a la administración!');
      closeCheckInModal();
      loadRooms();
    } else {
      const data = await res.json();
      alert('Error: ' + (data.mensaje || 'No se pudo registrar el aviso'));
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error de conexión con el servidor');
  }
}

// 10. Seleccionar todos (Admin)
function toggleSelectAll(source) {
  const checkboxes = document.querySelectorAll('.room-checkbox');
  checkboxes.forEach(cb => cb.checked = source.checked);
}

// 11. Eliminar múltiples seleccionados (Admin)
async function eliminarSeleccionados() {
  const checkboxes = document.querySelectorAll('.room-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Selecciona al menos una propiedad.');
    return;
  }

  if (!confirm(`¿Eliminar las ${checkboxes.length} propiedades seleccionadas?`)) return;

  const token = localStorage.getItem('jwt_token');
  const promesas = Array.from(checkboxes).map(async (cb) => {
    try {
      const res = await fetch(`${API_URL}/habitaciones/${cb.value}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  });

  const resultados = await Promise.all(promesas);
  const exitosos = resultados.filter(Boolean).length;
  alert(`Se eliminaron correctamente ${exitosos} de ${checkboxes.length} propiedades.`);
  loadRooms();
}

// 12. Modales de Administración (Crear / Editar)
function openRoomModal() {
  document.getElementById('modal-title').innerText = 'Registrar Propiedad';
  document.getElementById('room-id-edit').value = '';
  document.getElementById('room-form').reset();
  const modal = document.getElementById('room-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function openEditRoomModal(id, numero, tipo, precio, nombres, apellidos, email, celular) {
  document.getElementById('modal-title').innerText = 'Editar Propiedad';
  document.getElementById('room-id-edit').value = id;
  document.getElementById('room-number').value = numero || '';
  document.getElementById('room-type').value = tipo || 'Apartamento';
  document.getElementById('room-price').value = precio || '';
  document.getElementById('owner-name').value = nombres || '';
  document.getElementById('owner-lastname').value = apellidos || '';
  document.getElementById('owner-email').value = email || '';
  document.getElementById('owner-phone').value = celular || '';

  const modal = document.getElementById('room-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeRoomModal() {
  const modal = document.getElementById('room-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

async function saveRoom(event) {
  event.preventDefault();
  const idEdit = document.getElementById('room-id-edit').value;
  const isEditing = idEdit !== '';

  const payload = {
    numero: document.getElementById('room-number').value,
    tipo: document.getElementById('room-type').value,
    precio_noche: Number(document.getElementById('room-price').value),
    nombres_propietario: document.getElementById('owner-name').value,
    apellidos_propietario: document.getElementById('owner-lastname').value,
    email_propietario: document.getElementById('owner-email').value,
    celular_propietario: document.getElementById('owner-phone').value,
    estado: 'Disponible'
  };

  const token = localStorage.getItem('jwt_token');
  const url = isEditing ? `${API_URL}/habitaciones/${idEdit}` : `${API_URL}/habitaciones`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeRoomModal();
      loadRooms();
    } else {
      const data = await res.json();
      alert('Error al guardar: ' + (data.mensaje || 'Error desconocido'));
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor');
  }
}

// 13. Operaciones Operativas (Check-In / Check-Out)
async function realizarCheckIn(id) {
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: 'Ocupada' })
    });
    if (res.ok) loadRooms();
    else alert('No se pudo realizar el Check-In');
  } catch {
    alert('Error de conexión');
  }
}

async function realizarCheckOut(id) {
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: 'Disponible' })
    });
    if (res.ok) loadRooms();
    else alert('No se pudo realizar el Check-Out');
  } catch {
    alert('Error de conexión');
  }
}

// 14. Eliminar individual
async function eliminarHabitacion(id, numero) {
  if (!confirm(`¿Eliminar la propiedad "${numero}"?`)) return;
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) loadRooms();
    else alert('No se pudo eliminar');
  } catch {
    alert('Error de conexión');
  }
}

function showSection(section) {
  document.querySelectorAll('.module').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`sec-${section}`);
  if (target) target.classList.remove('hidden');
}

function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_id');
  location.reload();
}

// Validar sesión activa al cargar la página
if (localStorage.getItem('jwt_token')) {
  showDashboard();
}
