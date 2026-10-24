const API_URL = 'https://hotel-management-system-dun5.onrender.com/api';

let allRooms = []; 
let allUsers = [];

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
      
      const rol = data.rol || (data.usuario && data.usuario.rol) || 'propietario';
      localStorage.setItem('user_role', rol.toLowerCase());

      const userId = data.userId || data.id || (data.usuario && (data.usuario.id || data.usuario._id)) || '';
      localStorage.setItem('user_id', userId);

      const userName = data.nombre || (data.usuario && data.usuario.nombre) || email.split('@')[0];
      localStorage.setItem('user_name', userName);

      const userEmail = email.toLowerCase();
      localStorage.setItem('user_email', userEmail);

      showDashboard();
    } else {
      document.getElementById('login-error').innerText = data.mensaje || 'Error al ingresar';
    }
  } catch (err) {
    document.getElementById('login-error').innerText = 'No se pudo conectar con el servidor';
  }
});

function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  applyRolePermissions();
  showHomePortal();
}

function showHomePortal() {
  const sidebar = document.getElementById('main-sidebar');
  if (sidebar) {
    sidebar.classList.add('hidden');
    sidebar.style.display = 'none';
  }

  document.querySelectorAll('.module').forEach(sec => sec.classList.add('hidden'));
  const portal = document.getElementById('sec-home-portal');
  if (portal) portal.classList.remove('hidden');
}

function showSection(section) {
  const sidebar = document.getElementById('main-sidebar');
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.style.display = 'block';
  }

  document.querySelectorAll('.module').forEach(sec => sec.classList.add('hidden'));
  const target = document.getElementById(`sec-${section}`);
  if (target) target.classList.remove('hidden');

  if (section === 'habitaciones') {
    loadRooms();
  } else if (section === 'clientes') {
    loadUsers();
  } else if (section === 'reservas') {
    loadHistorialReservas();
  } else if (section === 'inventario') {
    cargarInventario();
  }
}

/**
 * Aplica los permisos de visualización en la UI según el rol almacenado.
 */
function applyRolePermissions() {
  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';
  const isOperador = role === 'recepcionista' || role === 'operador';

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  document.querySelectorAll('.operador-only').forEach(el => {
    el.style.display = (isAdmin || isOperador) ? '' : 'none';
  });

  const badgeText = isAdmin ? '👑 Administrador' : (isOperador ? '🛎️ Recepcionista / Operador' : '🏠 Propietario');
  const badgeColor = isAdmin ? '#6f42c1' : (isOperador ? '#17a2b8' : '#28a745');

  const badge = document.getElementById('user-role-badge');
  if (badge) {
    badge.innerText = badgeText;
    badge.style.background = badgeColor;
  }

  const homeBadge = document.getElementById('home-user-badge');
  if (homeBadge) {
    homeBadge.innerText = badgeText;
    homeBadge.style.background = badgeColor;
  }
}

// --- MÓDULO DE CLIENTES / USUARIOS / PERFIL ---

async function loadUsers() {
  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';

  if (!isAdmin) {
    document.getElementById('admin-users-view').style.display = 'none';
    document.getElementById('non-admin-profile-view').style.display = 'block';
    document.getElementById('users-module-title').innerText = 'Mi Perfil de Usuario';
    document.getElementById('users-module-desc').innerText = 'Consulta y actualiza tus datos registrados.';

    document.getElementById('profile-nombre').value = localStorage.getItem('user_name') || '';
    document.getElementById('profile-email').value = localStorage.getItem('user_email') || '';
    document.getElementById('profile-rol').value = (role === 'propietario' ? '🏠 Propietario' : '🛎️ Recepcionista');
    return;
  }

  document.getElementById('admin-users-view').style.display = 'block';
  document.getElementById('non-admin-profile-view').style.display = 'none';
  document.getElementById('users-module-title').innerText = 'Gestión de Clientes y Usuarios';
  document.getElementById('users-module-desc').innerText = 'Administra las cuentas registradas, permisos y roles de la plataforma.';

  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/usuarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      allUsers = Array.isArray(data) ? data : (data.usuarios || data.data || []);
      renderUsersTable(allUsers);
    } else {
      console.warn('No se pudo cargar la lista de usuarios desde la API');
    }
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-list');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No hay otros usuarios registrados.</td></tr>`;
    return;
  }

  users.forEach(usr => {
    const uId = usr.id || usr._id;
    const uNombre = usr.nombre || usr.name || 'Sin nombre';
    const uEmail = usr.email || 'Sin correo';
    const uRol = (usr.rol || 'propietario').toLowerCase();

    let rolBadge = '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">🏠 Propietario</span>';
    if (uRol === 'admin' || uRol === 'administrador') {
      rolBadge = '<span style="background:#6f42c1; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">👑 Administrador</span>';
    } else if (uRol === 'recepcionista' || uRol === 'operador') {
      rolBadge = '<span style="background:#17a2b8; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">🛎️ Recepcionista</span>';
    }

    tbody.innerHTML += `
      <tr>
        <td><strong>${uNombre}</strong></td>
        <td>${uEmail}</td>
        <td>${rolBadge}</td>
        <td>
          <button onclick="openUserModal('${uId}', '${uNombre}', '${uEmail}', '${uRol}')" style="background:#ffc107; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; font-weight:bold; color:#000;">✏️ Editar Rol / Datos</button>
          <button onclick="eliminarUsuario('${uId}', '${uNombre}')" style="background:#dc3545; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; font-weight:bold; color:#fff; margin-left:4px;">🗑️ Eliminar</button>
        </td>
      </tr>
    `;
  });
}

function filtrarUsuarios() {
  const texto = document.getElementById('search-users-input').value.toLowerCase();
  const filtered = allUsers.filter(u => {
    const nombre = (u.nombre || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const rol = (u.rol || '').toLowerCase();
    return nombre.includes(texto) || email.includes(texto) || rol.includes(texto);
  });
  renderUsersTable(filtered);
}

// --- CREAR USUARIO DESDE EL PANEL ADMIN ---
function openCreateUserModal() {
  const form = document.getElementById('create-user-form');
  if (form) form.reset();
  
  const modal = document.getElementById('create-user-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

async function guardarNuevoUsuarioAdmin(event) {
  event.preventDefault();
  
  const nombre = document.getElementById('create-user-nombre').value;
  const email = document.getElementById('create-user-email').value;
  const password = document.getElementById('create-user-password').value;
  const rol = document.getElementById('create-user-rol').value;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, email, password, rol })
    });

    const data = await res.json();

    if (res.ok) {
      alert('¡Usuario creado con éxito!');
      closeCreateUserModal();
      loadUsers();
    } else {
      alert('Error al crear usuario: ' + (data.mensaje || data.error || 'No se pudo completar la operación'));
    }
  } catch (err) {
    console.error('Error al crear usuario:', err);
    alert('Error de conexión con el servidor.');
  }
}

// --- EDITAR Y ELIMINAR USUARIOS ---
function openUserModal(id, nombre, email, rol) {
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-nombre').value = nombre;
  document.getElementById('edit-user-email').value = email;
  document.getElementById('edit-user-rol').value = rol.includes('admin') ? 'admin' : (rol.includes('recep') ? 'recepcionista' : 'propietario');
  document.getElementById('edit-user-password').value = '';

  const modal = document.getElementById('user-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeUserModal() {
  const modal = document.getElementById('user-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

async function guardarEdicionUsuario(event) {
  event.preventDefault();
  const uId = document.getElementById('edit-user-id').value;
  const nombre = document.getElementById('edit-user-nombre').value;
  const email = document.getElementById('edit-user-email').value;
  const rol = document.getElementById('edit-user-rol').value;
  const nuevoPassword = document.getElementById('edit-user-password').value;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/usuarios/${uId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, email, rol })
    });

    if (!res.ok) {
      const data = await res.json();
      alert('Error: ' + (data.mensaje || 'No se pudo actualizar el usuario'));
      return;
    }

    if (nuevoPassword.trim() !== '') {
      const resPass = await fetch(`${API_URL}/usuarios/${uId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevoPassword })
      });

      if (!resPass.ok) {
        alert('Se guardaron los datos, pero hubo un error al cambiar la contraseña.');
        return;
      }
    }

    alert('¡Usuario y credenciales actualizados con éxito!');
    document.getElementById('edit-user-password').value = '';
    closeUserModal();
    loadUsers();
  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor');
  }
}

async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar la cuenta de "${nombre}"?`)) return;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      alert('Usuario eliminado correctamente.');
      loadUsers();
    } else {
      alert('No se pudo eliminar el usuario.');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión');
  }
}

async function actualizarMiPerfil(event) {
  event.preventDefault();
  const nuevoNombre = document.getElementById('profile-nombre').value;
  localStorage.setItem('user_name', nuevoNombre);
  alert('¡Perfil actualizado con éxito!');
}

// --- MÓDULO DE HABITACIONES / PROPIEDADES ---

async function loadRooms() {
  const token = localStorage.getItem('jwt_token');
  const role = localStorage.getItem('user_role') || 'propietario';
  const userId = localStorage.getItem('user_id');
  const userEmail = localStorage.getItem('user_email') || '';

  try {
    const res = await fetch(`${API_URL}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    let rooms = Array.isArray(data) ? data : (data.habitaciones || data.data || []);

    if (role === 'propietario') {
      rooms = rooms.filter(room => {
        const idCoincide = userId && String(room.propietario_id || room.user_id || room.usuario_id) === String(userId);
        const emailCoincide = userEmail && String(room.email_propietario || '').toLowerCase() === userEmail;
        return idCoincide || emailCoincide;
      });
    }

    allRooms = rooms;
    renderRoomsTable(allRooms);
    updateKPIs(allRooms);
  } catch (err) {
    console.error('Error al cargar habitaciones:', err);
  }
}

function renderRoomsTable(rooms) {
  const tbody = document.getElementById('rooms-list');
  tbody.innerHTML = '';

  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';
  const isPropietario = role === 'propietario';

  if (rooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay propiedades registradas o asociadas a tu cuenta.</td></tr>`;
    return;
  }

  rooms.forEach(room => {
    const estado = room.estado || room.status || 'Disponible';
    const estadoLower = estado.toLowerCase();
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

    const huespedInfo = room.proximo_huesped ? `<br><small style="color:#007bff; font-weight:bold;">👤 Huésped: ${room.proximo_huesped}</small>` : '';
    
    let fechasInfo = '';
    if (room.fecha_ingreso || room.fecha_inicio) {
      const fInicio = room.fecha_ingreso || room.fecha_inicio;
      const fFin = room.fecha_salida || room.fecha_fin || 'N/A';
      fechasInfo = `<br><small style="color:#28a745; font-weight:bold;">📅 ${fInicio} ➔ ${fFin}</small>`;
    }

    let actionButtons = '';

    if (!isPropietario) {
      if (estadoLower === 'disponible') {
        actionButtons += `<button class="btn-checkin" onclick="realizarCheckIn(${roomId})">Check-In Directo</button> `;
      } 
      else if (estadoLower.includes('reservado') || estadoLower.includes('por llegar')) {
        actionButtons += `<button onclick="confirmarIngresoHuesped(${roomId})" style="background:#28a745; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; margin-right:4px;">✅ Aprobar Check-In</button> `;
      } 
      else if (estadoLower === 'ocupada') {
        actionButtons += `<button class="btn-checkout" onclick="realizarCheckOut(${roomId})">Check-Out</button> `;
      }
    } else {
      if (estadoLower === 'disponible') {
        actionButtons += `<button onclick="openCheckInModal(${roomId}, '${numeroApto}')" style="background:#007bff; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #fff; font-weight: bold;">📅 Informar Reserva</button>`;
      } else if (estadoLower.includes('reservado') || estadoLower.includes('por llegar')) {
        actionButtons += `<button onclick="cancelarPreReserva(${roomId}, '${numeroApto}')" style="background:#dc3545; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; font-weight:bold;">❌ Cancelar Reserva</button>`;
      } else if (estadoLower === 'ocupada') {
        actionButtons += `<small style="color:#e0a800; font-weight:bold;">🔴 Inmueble Ocupado</small>`;
      }
    }

    if (isAdmin) {
      actionButtons += `<button onclick="openEditRoomModal(${roomId}, '${numeroApto}', '${tipoApto}', ${precioApto}, '${nombresP}', '${apellidosP}', '${emailP}', '${celularP}')" style="background:#ffc107; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #000; font-weight: bold; margin-left: 4px; margin-right: 4px;">Editar</button>`;
      actionButtons += `<button onclick="eliminarHabitacion(${roomId}, '${numeroApto}')" style="background:#dc3545; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #fff; font-weight: bold;">Eliminar</button>`;
    }

    let badgeColor = '#28a745'; 
    if (estadoLower.includes('reservado') || estadoLower.includes('por llegar')) badgeColor = '#17a2b8'; 
    if (estadoLower === 'ocupada') badgeColor = '#e0a800'; 

    tbody.innerHTML += `
      <tr>
        <td class="admin-only" style="text-align: center;"><input type="checkbox" class="room-checkbox" value="${roomId}" data-numero="${numeroApto}"></td>
        <td><strong>${numeroApto}</strong></td>
        <td>${tipoApto}</td>
        <td>$${Number(precioApto).toLocaleString()}</td>
        <td>${nombreCompleto}<br><small style="color: #666;">${contactoP}</small></td>
        <td>
          <span class="status" style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">${estado}</span>
          ${huespedInfo}
          ${fechasInfo}
        </td>
        <td>${actionButtons}</td>
      </tr>
    `;
  });

  applyRolePermissions();
}

async function enviarAvisoCheckIn(event) {
  event.preventDefault();
  const roomId = document.getElementById('checkin-room-id').value;
  const fechaInicio = document.getElementById('checkin-fecha-inicio').value;
  const fechaFin = document.getElementById('checkin-fecha-fin').value;
  const huesped = document.getElementById('checkin-huesped').value;

  if (new Date(fechaFin) <= new Date(fechaInicio)) {
    alert('La fecha fin debe ser posterior a la fecha de inicio.');
    return;
  }

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
        fecha_ingreso: fechaInicio,
        fecha_salida: fechaFin
      })
    });

    if (res.ok) {
      alert(`¡Reserva registrada desde el ${fechaInicio} hasta el ${fechaFin}! Queda pendiente de aprobación por recepción.`);
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

async function cancelarPreReserva(id, numeroApto) {
  if (!confirm(`¿Estás seguro de cancelar la reserva para el Apto ${numeroApto}? Volverá a estar Disponible.`)) return;

  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        estado: 'Disponible',
        proximo_huesped: null,
        fecha_ingreso: null,
        fecha_salida: null
      })
    });

    if (res.ok) {
      alert(`Reserva del Apto ${numeroApto} cancelada exitosamente.`);
      loadRooms();
    } else {
      const data = await res.json();
      alert('Error al cancelar: ' + (data.mensaje || 'No se pudo completar la operación'));
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error de conexión con el servidor');
  }
}

// --- FLUJO OPERATIVO DE CHECK-IN CON MODAL ---
function abrirModalRecepcionCheckIn(roomId, huespedPreReserva = '', fIngreso = '', fSalida = '') {
  document.getElementById('checkin-op-room-id').value = roomId;
  document.getElementById('checkin-op-nombre').value = huespedPreReserva;
  
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('checkin-op-entrada').value = fIngreso || hoy;
  document.getElementById('checkin-op-salida').value = fSalida || hoy;
  document.getElementById('checkin-op-documento').value = '';
  document.getElementById('checkin-op-telefono').value = '';
  document.getElementById('checkin-op-boleta').value = '';
  document.getElementById('checkin-op-huespedes').value = '1';
  document.getElementById('checkin-op-placa').value = '';
  document.getElementById('checkin-op-obs').value = '';
  document.getElementById('checkin-op-total').value = '';

  const modal = document.getElementById('recepcion-checkin-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeRecepcionCheckInModal() {
  const modal = document.getElementById('recepcion-checkin-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function realizarCheckIn(id) {
  abrirModalRecepcionCheckIn(id);
}

function confirmarIngresoHuesped(id) {
  const habitacion = allRooms.find(r => r.id === id || r._id === id);
  const huesped = habitacion ? (habitacion.proximo_huesped || '') : '';
  const fIngreso = habitacion ? (habitacion.fecha_ingreso || '') : '';
  const fSalida = habitacion ? (habitacion.fecha_salida || '') : '';

  abrirModalRecepcionCheckIn(id, huesped, fIngreso, fSalida);
}

async function guardarCheckInOficial(event) {
  event.preventDefault();

  const token = localStorage.getItem('jwt_token');
  const habitacion_id = document.getElementById('checkin-op-room-id').value;
  const nombre = document.getElementById('checkin-op-nombre').value;
  const documento = document.getElementById('checkin-op-documento').value;
  const telefono = document.getElementById('checkin-op-telefono').value;
  const fecha_entrada = document.getElementById('checkin-op-entrada').value;
  const fecha_salida = document.getElementById('checkin-op-salida').value;
  const total = Number(document.getElementById('checkin-op-total').value);

  const boleta = document.getElementById('checkin-op-boleta').value;
  const email = `huesped_${documento}@marinabay.com`;

  try {
    let cliente_id = null;

    const resCliente = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, email, telefono, documento })
    });

    const dataCliente = await resCliente.json().catch(() => ({}));

    if (resCliente.ok) {
      cliente_id = dataCliente.id || 
                   (dataCliente.cliente && dataCliente.cliente.id) || 
                   (dataCliente.data && dataCliente.data.id);
    } else {
      alert('Error al procesar el cliente: ' + (dataCliente.error || dataCliente.mensaje || 'Error desconocido'));
      return;
    }

    if (!cliente_id) {
      alert('Error crítico: No se pudo obtener el ID del cliente.');
      return;
    }

    const resReserva = await fetch(`${API_URL}/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        habitacion_id,
        cliente_id,
        fecha_entrada,
        fecha_salida,
        total,
        estado: 'ocupada',
        boleta
      })
    });

    if (!resReserva.ok) {
      const errRes = await resReserva.json().catch(() => ({}));
      alert('Error al registrar la reserva: ' + (errRes.error || errRes.mensaje || 'Error desconocido'));
      return;
    }

    await fetch(`${API_URL}/habitaciones/${habitacion_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        estado: 'Ocupada',
        proximo_huesped: null,
        fecha_ingreso: null,
        fecha_salida: null
      })
    });

    alert('¡Check-In completado con éxito! Boleta validada y reserva generada.');
    closeRecepcionCheckInModal();
    loadRooms();
    loadHistorialReservas();
  } catch (err) {
    console.error('Error al procesar Check-In:', err);
    alert('Ocurrió un error de conexión al procesar el Check-In oficial.');
  }
}

function updateKPIs(rooms) {
  const total = rooms.length;
  const disponibles = rooms.filter(r => (r.estado || r.status || '').toLowerCase() === 'disponible').length;
  const ocupadas = rooms.filter(r => (r.estado || r.status || '').toLowerCase() === 'ocupada').length;

  document.getElementById('kpi-total').innerText = total;
  document.getElementById('kpi-disponibles').innerText = disponibles;
  document.getElementById('kpi-ocupadas').innerText = ocupadas;
}

function filtrarHabitaciones() {
  const texto = document.getElementById('search-input').value.toLowerCase();
  const estadoFiltro = document.getElementById('filter-status').value;

  const filtered = allRooms.filter(room => {
    const numero = (room.numero || room.room_number || '').toLowerCase();
    const nombres = (room.nombres_propietario || '').toLowerCase();
    const apellidos = (room.apellidos_propietario || '').toLowerCase();
    const estado = (room.estado || room.status || '').toLowerCase();

    const coincideTexto = numero.includes(texto) || nombres.includes(texto) || apellidos.includes(texto);
    const coincideEstado = estadoFiltro === 'todos' || estado.includes(estadoFiltro);

    return coincideTexto && coincideEstado;
  });

  renderRoomsTable(filtered);
}

function openCheckInModal(roomId, numero) {
  document.getElementById('checkin-room-id').value = roomId;
  document.getElementById('checkin-room-title').innerText = `Informar Próxima Reserva - Apto ${numero}`;
  const modal = document.getElementById('propietario-checkin-modal');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeCheckInModal() {
  const modal = document.getElementById('propietario-checkin-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}

function toggleSelectAll(source) {
  const checkboxes = document.querySelectorAll('.room-checkbox');
  checkboxes.forEach(cb => cb.checked = source.checked);
}

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
    email_propietario: document.getElementById('owner-email').value,
    nombres_propietario: document.getElementById('owner-name').value,
    apellidos_propietario: document.getElementById('owner-lastname').value,
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

async function realizarCheckOut(id) {
  const token = localStorage.getItem('jwt_token');
  if (!confirm('¿Desea realizar el Check-Out de esta habitación y liberarla?')) return;

  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estado: 'Disponible' })
    });
    if (res.ok) {
      alert('Check-Out realizado con éxito.');
      loadRooms();
    } else {
      alert('No se pudo realizar el Check-Out');
    }
  } catch {
    alert('Error de conexión');
  }
}

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

// --- MÓDULO DE HISTORIAL DE RESERVAS & COMPROBANTES ---
async function loadHistorialReservas() {
  const token = localStorage.getItem('jwt_token');
  const tbody = document.getElementById('historial-list');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Cargando reservas...</td></tr>`;

  try {
    const res = await fetch(`${API_URL}/reservas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      
      let reservas = [];
      if (Array.isArray(data)) {
        reservas = data;
      } else if (data && Array.isArray(data.data)) {
        reservas = data.data;
      } else if (data && Array.isArray(data.reservas)) {
        reservas = data.reservas;
      }

      renderTablaHistorial(reservas);
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">No se pudo cargar el historial de reservas.</td></tr>`;
    }
  } catch (err) {
    console.error('Error al cargar reservas:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Error de conexión con el servidor.</td></tr>`;
  }
}

function renderTablaHistorial(lista) {
  const tbody = document.getElementById('historial-list');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No hay reservas registradas en el sistema.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    const estado = (item.estado || 'pendiente').toLowerCase();
    let estadoBadge = '<span style="background:#17a2b8; color:white; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:12px;">Pendiente</span>';
    
    if (estado === 'ocupada' || estado === 'confirmada') {
      estadoBadge = '<span style="background:#28a745; color:white; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:12px;">Ocupada</span>';
    } else if (estado === 'finalizada') {
      estadoBadge = '<span style="background:#007bff; color:white; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:12px;">Finalizada</span>';
    } else if (estado === 'cancelada') {
      estadoBadge = '<span style="background:#dc3545; color:white; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:12px;">Cancelada</span>';
    }

    const cliente = item.cliente_nombre || item.huesped_nombre || 'Sin cliente asignado';
    const numeroHabitacion = item.habitacion_numero || item.habitacion_id || 'N/A';
    const fechaEntrada = item.fecha_entrada ? item.fecha_entrada.split('T')[0] : 'N/A';
    const fechaSalida = item.fecha_salida ? item.fecha_salida.split('T')[0] : 'N/A';
    const totalEstancia = Number(item.total || 0).toLocaleString();

    tbody.innerHTML += `
      <tr>
        <td><strong>Apto ${numeroHabitacion}</strong></td>
        <td>${cliente}</td>
        <td>📅 ${fechaEntrada} ➔ ${fechaSalida}</td>
        <td>${estadoBadge}</td>
        <td>$${totalEstancia}</td>
        <td>
          <button onclick="descargarComprobantePDF(${item.id})" style="background:#17a2b8; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">
            📄 Ver Comprobante
          </button>
        </td>
      </tr>
    `;
  });
}

// --- FUNCIÓN PARA PREVISUALIZAR EL COMPROBANTE PDF ---
async function descargarComprobantePDF(reservaId) {
  const token = localStorage.getItem('jwt_token');

  if (!token) {
    alert('Debes iniciar sesión para ver el comprobante.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/pdf/comprobante/${reservaId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}` 
      }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const iframe = document.getElementById('pdf-viewer-frame');
      if (iframe) iframe.src = url;

      const downloadBtn = document.getElementById('pdf-download-btn');
      if (downloadBtn) {
        downloadBtn.href = url;
        downloadBtn.download = `Comprobante_Reserva_${reservaId}.pdf`;
      }

      const modal = document.getElementById('pdf-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
    } else {
      const errData = await response.json().catch(() => ({}));
      alert('No se pudo generar el comprobante: ' + (errData.error || 'Error del servidor'));
    }
  } catch (err) {
    console.error('Error al cargar PDF:', err);
    alert('Error de conexión al intentar generar el comprobante PDF.');
  }
}

function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
  const iframe = document.getElementById('pdf-viewer-frame');
  if (iframe) iframe.src = '';
}

// --- MÓDULO DE INVENTARIO ---

async function cargarInventario() {
  cargarBoletas();
  cargarManillas();
}

async function cargarBoletas() {
  const token = localStorage.getItem('jwt_token');
  const tbody = document.getElementById('lista-boletas');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_URL}/inventario/boletas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      tbody.innerHTML = '';

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #666; padding: 15px;">No hay boletas registradas.</td></tr>`;
        return;
      }

      data.forEach(b => {
        const estadoBadge = b.usada 
          ? '<span style="background:#dc3545; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">Usada</span>'
          : '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">Disponible</span>';
        
        const habitacionTexto = b.numero_habitacion ? `Apto ${b.numero_habitacion}` : `ID: ${b.habitacion_id}`;

        tbody.innerHTML += `
          <tr>
            <td><strong>${b.numero_boleta}</strong></td>
            <td>${habitacionTexto}</td>
            <td>${estadoBadge}</td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error('Error al cargar boletas:', err);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: red;">Error al cargar datos.</td></tr>`;
  }
}

async function cargarManillas() {
  const token = localStorage.getItem('jwt_token');
  const tbody = document.getElementById('lista-manillas');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_URL}/inventario/manillas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      tbody.innerHTML = '';

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #666; padding: 15px;">No hay manillas registradas.</td></tr>`;
        return;
      }

      data.forEach(m => {
        const estadoLower = (m.estado || 'libre').toLowerCase();
        let estadoBadge = '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">Libre</span>';
        
        if (estadoLower === 'asignada' || estadoLower === 'ocupada') {
          estadoBadge = '<span style="background:#17a2b8; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">Asignada</span>';
        }

        tbody.innerHTML += `
          <tr>
            <td><strong>${m.codigo_manilla}</strong></td>
            <td>${estadoBadge}</td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error('Error al cargar manillas:', err);
    tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: red;">Error al cargar datos.</td></tr>`;
  }
}

async function registrarBoleta(event) {
  event.preventDefault();
  const numero_boleta = document.getElementById('input-num-boleta').value;
  const habitacion_id = document.getElementById('input-habitacion-id').value;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/inventario/boletas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numero_boleta, habitacion_id })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje || '¡Boleta registrada con éxito!');
      document.getElementById('form-boleta').reset();
      cargarBoletas();
    } else {
      alert('Error: ' + (data.error || 'No se pudo registrar la boleta'));
    }
  } catch (err) {
    console.error('Error al registrar boleta:', err);
    alert('Error de conexión con el servidor.');
  }
}

async function registrarManilla(event) {
  event.preventDefault();
  const codigo_manilla = document.getElementById('input-codigo-manilla').value;
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/inventario/manillas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ codigo_manilla })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje || '¡Manilla registrada con éxito!');
      document.getElementById('form-manilla').reset();
      cargarManillas();
    } else {
      alert('Error: ' + (data.error || 'No se pudo registrar la manilla'));
    }
  } catch (err) {
    console.error('Error al registrar manilla:', err);
    alert('Error de conexión con el servidor.');
  }
}

function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  location.reload();
}

if (localStorage.getItem('jwt_token')) {
  showDashboard();
}