const API_URL = 'https://hotel-management-system-dun5.onrender.com/api';

let allRooms = []; 
let allUsers = [];
let manillasDisponiblesCache = [];

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
  } else if (section === 'visitas') {
    renderTablaVisitas();
  }
}

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
    alert('Error de conexión con el servidor.');
  }
}

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
      await fetch(`${API_URL}/usuarios/${uId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nuevoPassword })
      });
    }

    alert('¡Usuario y credenciales actualizados con éxito!');
    closeUserModal();
    loadUsers();
  } catch (err) {
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
    }
  } catch (err) {
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

    const huespedInfo = room.proximo_huesped ? `<br><small style="color:#007bff; font-weight:bold;">👤 Titular: ${room.proximo_huesped}</small>` : '';
    
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

// --- PARSER DE ESCÁNER PDF417 / CÉDULAS COLOMBIANAS ---

function procesarEscaneoCedula(textoRaw, target) {
  if (!textoRaw || textoRaw.length < 10) return;

  const texto = textoRaw.replace(/[\r\n\t]/g, ' ').trim();
  let doc = '', ap1 = '', ap2 = '', nom1 = '', nom2 = '', gn = '', fdn = '', rh = '';

  if (texto.includes('<') || texto.includes('ICCOL')) {
    const matchesNumeros = texto.match(/\b([0-9]{8,10})\b/g);
    if (matchesNumeros && matchesNumeros.length > 0) {
      doc = matchesNumeros[0];
    } else {
      const matchDocMRZ = texto.match(/ICCOL([0-9]{8,10})/i) || texto.match(/COL([0-9]{8,10})/i);
      if (matchDocMRZ) doc = matchDocMRZ[1];
    }

    const matchNombresMRZ = texto.match(/([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)<<([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)/i) ||
                            texto.match(/([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)<<([A-ZÁÉÍÓÚÑ]+)/i);

    if (matchNombresMRZ) {
      ap1 = matchNombresMRZ[1] || '';
      ap2 = matchNombresMRZ[2] || '';
      nom1 = matchNombresMRZ[3] || '';
      nom2 = matchNombresMRZ[4] || '';
    } else {
      const partesMRZ = texto.split('<<');
      if (partesMRZ.length >= 2) {
        const aps = partesMRZ[0].split('<').filter(Boolean);
        const noms = partesMRZ[1].split('<').filter(Boolean);
        ap1 = aps[aps.length - 2] || aps[0] || '';
        ap2 = aps[aps.length - 1] || '';
        nom1 = noms[0] || '';
        nom2 = noms[1] || '';
      }
    }

    const matchFechaMRZ = texto.match(/([0-9]{6})([0-9])([FM])/i);
    if (matchFechaMRZ) {
      const rawYYMMDD = matchFechaMRZ[1];
      gn = matchFechaMRZ[3].toUpperCase();

      const yy = parseInt(rawYYMMDD.substring(0, 2));
      const mm = rawYYMMDD.substring(2, 4);
      const dd = rawYYMMDD.substring(4, 6);

      const anioFull = (yy > 26 ? '19' : '20') + (yy < 10 ? '0' + yy : yy);
      fdn = `${dd}/${mm}/${anioFull}`;
    }
  } else {
    const regexCC = /([0-9]{8,10})([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]*)\b\s*([MF])([0-9]{8})([0-9A-Z+-]{2,3})/;
    const match = texto.match(regexCC);

    if (match) {
      doc = match[1];
      ap1 = match[2];
      ap2 = match[3];
      nom1 = match[4];
      nom2 = match[5] || '';
      gn = match[6];
      
      const rawFdn = match[7];
      if (rawFdn && rawFdn.length === 8) {
        fdn = `${rawFdn.substring(6, 8)}/${rawFdn.substring(4, 6)}/${rawFdn.substring(0, 4)}`;
      }
      rh = match[8];
    }
  }

  if (target === 'titular') {
    if (doc) document.getElementById('checkin-op-documento').value = doc;
    if (ap1) document.getElementById('checkin-op-apellido1').value = ap1;
    if (ap2) document.getElementById('checkin-op-apellido2').value = ap2;
    if (nom1) document.getElementById('checkin-op-nombre1').value = nom1;
    if (nom2) document.getElementById('checkin-op-nombre2').value = nom2;
    if (gn) document.getElementById('checkin-op-gn').value = gn;
    if (fdn) document.getElementById('checkin-op-fdn').value = fdn;
    if (rh) document.getElementById('checkin-op-rh').value = rh;
  } else if (typeof target === 'string' && target.startsWith('acomp-')) {
    const fila = document.getElementById(target);
    if (fila) {
      if (doc) fila.querySelector('.acomp-doc').value = doc;
      if (ap1) fila.querySelector('.acomp-apellido1').value = ap1;
      if (ap2) fila.querySelector('.acomp-apellido2').value = ap2;
      if (nom1) fila.querySelector('.acomp-nombre1').value = nom1;
      if (nom2) fila.querySelector('.acomp-nombre2').value = nom2;
      if (gn) fila.querySelector('.acomp-gn').value = gn;
      if (fdn) fila.querySelector('.acomp-fdn').value = fdn;
      if (rh) fila.querySelector('.acomp-rh').value = rh;
    }
  }
}

async function obtenerManillasDisponibles() {
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/inventario/manillas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const libres = data
        .filter(m => (m.estado || 'libre').toLowerCase() === 'libre')
        .map(m => m.codigo_manilla)
        .sort((a, b) => parseInt(a) - parseInt(b));
      return libres;
    }
  } catch (err) {
    console.error('Error al consultar manillas libres:', err);
  }
  return [];
}

async function prepararManillasParaCheckIn() {
  manillasDisponiblesCache = await obtenerManillasDisponibles();
}

async function agregarFilaAcompanante(nom1 = '', nom2 = '', ap1 = '', ap2 = '', doc = '', manilla = '', pais = 'COLOMBIA', ciudad = '', tipoDoc = 'CC', gn = '', fdn = '', rh = '', tel = '') {
  const contenedor = document.getElementById('contenedor-acompanantes');
  if (!contenedor) return;

  if (!manilla) {
    const asignadasEnForm = Array.from(document.querySelectorAll('.acomp-manilla')).map(i => i.value);
    const siguienteManilla = manillasDisponiblesCache.find(m => !asignadasEnForm.includes(m));
    manilla = siguienteManilla || '';
  }

  const idFila = 'acomp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const totalFilas = contenedor.querySelectorAll('div').length + 2;

  const div = document.createElement('div');
  div.id = idFila;
  div.style.cssText = 'display: grid; grid-template-columns: 45px 1.1fr 1.4fr 1.2fr 1.2fr 1.2fr 1.2fr 0.6fr 1.1fr 0.7fr 1.1fr 1fr 1fr 1.1fr auto; gap: 5px; align-items: center; background: #fff; padding: 6px; border-radius: 4px; border: 1px solid #e0e0e0; font-size: 11px; margin-bottom: 6px;';

  div.innerHTML = `
    <div style="background: #6f42c1; color: white; text-align: center; font-weight: bold; padding: 6px 0; border-radius: 4px; font-size: 11px;">${totalFilas}</div>
    <select class="acomp-tipo-doc" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
      <option value="CC" ${tipoDoc === 'CC' ? 'selected' : ''}>CC</option>
      <option value="CC | NUEVO FORMATO" ${tipoDoc === 'CC | NUEVO FORMATO' ? 'selected' : ''}>CC | NUEVO FORMATO</option>
      <option value="CE" ${tipoDoc === 'CE' ? 'selected' : ''}>CE</option>
      <option value="PA" ${tipoDoc === 'PA' ? 'selected' : ''}>PA</option>
      <option value="TI" ${tipoDoc === 'TI' ? 'selected' : ''}>TI</option>
      <option value="CD" ${tipoDoc === 'CD' ? 'selected' : ''}>CD</option>
      <option value="DE" ${tipoDoc === 'DE' ? 'selected' : ''}>DE</option>
      <option value="RC" ${tipoDoc === 'RC' ? 'selected' : ''}>RC</option>
    </select>
    <input type="text" class="acomp-doc" value="${doc}" oninput="procesarEscaneoCedula(this.value, '${idFila}')" placeholder="N° Doc / Escáner" required style="padding: 5px; border: 1px solid #007bff; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-apellido1" value="${ap1}" placeholder="1er Apellido" required style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-apellido2" value="${ap2}" placeholder="2do Apellido" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-nombre1" value="${nom1}" placeholder="1er Nombre" required style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-nombre2" value="${nom2}" placeholder="2do Nombre" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-gn" value="${gn}" placeholder="F/M" maxlength="1" style="padding: 5px; text-align:center; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-fdn" value="${fdn}" placeholder="DD/MM/AAAA" style="padding: 5px; text-align:center; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-rh" value="${rh}" placeholder="O+" style="padding: 5px; text-align:center; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-pais" value="${pais}" placeholder="País" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-ciudad" value="${ciudad}" placeholder="Ciudad" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    <input type="text" class="acomp-manilla" value="${manilla}" placeholder="Manilla" required style="padding: 5px; border: 1px solid #007bff; border-radius: 3px; font-size: 11px; font-weight: bold; color: #007bff;">
    <input type="text" class="acomp-tel" value="${tel}" placeholder="Teléfono" style="padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px;">
    
    <input type="hidden" class="acomp-foto-input" value="">
    <button type="button" id="btn-foto-${idFila}" onclick="abrirModalCamara('acomp', '${idFila}')" style="background:#17a2b8; color:white; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; font-size:10px; font-weight:bold;" title="Tomar foto">📷</button>

    <button type="button" onclick="document.getElementById('${idFila}').remove()" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 5px 8px; cursor: pointer; font-weight: bold;" title="Quitar">✕</button>
  `;

  contenedor.appendChild(div);
}

async function abrirModalRecepcionCheckIn(roomId, huespedPreReserva = '', fIngreso = '', fSalida = '') {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('checkin-op-room-id', roomId);
  
  const partesNom = (huespedPreReserva || '').trim().split(' ');
  setVal('checkin-op-nombre1', partesNom[0] || '');
  setVal('checkin-op-nombre2', partesNom[1] || '');
  setVal('checkin-op-apellido1', partesNom[2] || '');
  setVal('checkin-op-apellido2', partesNom[3] || '');

  const hoy = new Date().toISOString().split('T')[0];
  setVal('checkin-op-entrada', fIngreso || hoy);
  setVal('checkin-op-salida', fSalida || hoy);
  setVal('checkin-op-documento', '');
  setVal('checkin-op-gn', '');
  setVal('checkin-op-fdn', '');
  setVal('checkin-op-rh', '');
  setVal('checkin-op-pais', 'COLOMBIA');
  setVal('checkin-op-ciudad', '');
  setVal('checkin-op-telefono', '');
  setVal('checkin-op-boleta', '');
  setVal('checkin-op-placa', '');
  setVal('checkin-op-obs', '');
  setVal('checkin-op-foto-input', '');
  
  const btnFotoTitular = document.getElementById('btn-foto-titular');
  if (btnFotoTitular) {
    btnFotoTitular.innerText = '📷';
    btnFotoTitular.style.background = '#17a2b8';
  }

  await prepararManillasParaCheckIn();

  const manillaTitularInput = document.getElementById('checkin-op-manilla');
  if (manillaTitularInput) {
    manillaTitularInput.value = manillasDisponiblesCache[0] || '';
  }

  const contenedor = document.getElementById('contenedor-acompanantes');
  if (contenedor) {
    contenedor.innerHTML = '';
  }

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

  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const token = localStorage.getItem('jwt_token');
  const habitacion_id = getVal('checkin-op-room-id');
  
  const nom1 = getVal('checkin-op-nombre1');
  const nom2 = getVal('checkin-op-nombre2');
  const ap1 = getVal('checkin-op-apellido1');
  const ap2 = getVal('checkin-op-apellido2');
  
  const nombreCompleto = `${nom1} ${nom2} ${ap1} ${ap2}`.replace(/\s+/g, ' ').trim();
  const tipo_documento_titular = getVal('checkin-op-tipo-doc') || 'CC';
  const documento = getVal('checkin-op-documento');
  const manilla_titular = getVal('checkin-op-manilla');
  const foto_titular = getVal('checkin-op-foto-input');
  const telefono = getVal('checkin-op-telefono');
  const fecha_entrada = getVal('checkin-op-entrada');
  const fecha_salida = getVal('checkin-op-salida');
  const boleta = getVal('checkin-op-boleta');
  const vehiculo = getVal('checkin-op-vehiculo') || 'NO';
  const placa = getVal('checkin-op-placa');
  const observaciones = getVal('checkin-op-obs');
  const email = `huesped_${documento}@marinabay.com`;

  const filasAcompanantes = document.querySelectorAll('#contenedor-acompanantes > div');
  const acompanantes = [];

  filasAcompanantes.forEach(fila => {
    const aTipoDoc = fila.querySelector('.acomp-tipo-doc') ? fila.querySelector('.acomp-tipo-doc').value : 'CC';
    const aDoc = fila.querySelector('.acomp-doc') ? fila.querySelector('.acomp-doc').value : '';
    const aManilla = fila.querySelector('.acomp-manilla') ? fila.querySelector('.acomp-manilla').value : '';
    const aPais = fila.querySelector('.acomp-pais') ? fila.querySelector('.acomp-pais').value : 'COLOMBIA';
    const aCiudad = fila.querySelector('.acomp-ciudad') ? fila.querySelector('.acomp-ciudad').value : '';
    const aNom1 = fila.querySelector('.acomp-nombre1') ? fila.querySelector('.acomp-nombre1').value : '';
    const aNom2 = fila.querySelector('.acomp-nombre2') ? fila.querySelector('.acomp-nombre2').value : '';
    const aAp1 = fila.querySelector('.acomp-apellido1') ? fila.querySelector('.acomp-apellido1').value : '';
    const aAp2 = fila.querySelector('.acomp-apellido2') ? fila.querySelector('.acomp-apellido2').value : '';
    const aGn = fila.querySelector('.acomp-gn') ? fila.querySelector('.acomp-gn').value : '';
    const aFdn = fila.querySelector('.acomp-fdn') ? fila.querySelector('.acomp-fdn').value : '';
    const aRh = fila.querySelector('.acomp-rh') ? fila.querySelector('.acomp-rh').value : '';
    const aTel = fila.querySelector('.acomp-tel') ? fila.querySelector('.acomp-tel').value : '';
    const aFoto = fila.querySelector('.acomp-foto-input') ? fila.querySelector('.acomp-foto-input').value : '';

    const aNombresComp = `${aNom1} ${aNom2}`.trim();
    const aApellidosComp = `${aAp1} ${aAp2}`.trim();

    if (aNom1 && aManilla) {
      acompanantes.push({
        tipo_documento: aTipoDoc,
        documento: aDoc,
        manilla: aManilla,
        pais: aPais,
        ciudad: aCiudad,
        primer_nombre: aNom1,
        segundo_nombre: aNom2,
        primer_apellido: aAp1,
        segundo_apellido: aAp2,
        nombres: aNombresComp,
        apellidos: aApellidosComp,
        genero: aGn,
        fecha_nacimiento: aFdn,
        rh: aRh,
        telefono: aTel,
        foto: aFoto
      });
    }
  });

  try {
    let cliente_id = null;

    const resCliente = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre: nombreCompleto, email, telefono, documento, tipo_documento: tipo_documento_titular })
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

    const payloadReserva = {
      habitacion_id,
      cliente_id,
      fecha_entrada,
      fecha_salida,
      estado: 'ocupada',
      vehiculo,
      placa,
      observaciones,
      manilla_titular,
      tipo_documento_titular,
      foto_titular,
      huespedes_detalle: acompanantes
    };

    if (boleta && boleta.trim() !== '') {
      payloadReserva.boleta = boleta.trim();
    }

    const resReserva = await fetch(`${API_URL}/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payloadReserva)
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

    alert('¡Check-In completado exitosamente! Titular, acompañantes y manillas asignados correctamente.');
    closeRecepcionCheckInModal();
    loadRooms();
    loadHistorialReservas();
  } catch (err) {
    console.error('Error al procesar Check-In:', err);
    alert('Ocurrió un error de conexión al procesar el Check-In oficial.');
  }
}

async function abrirModalGestionAcompanantes(reservaId, numeroApto) {
  document.getElementById('acomp-reserva-id').value = reservaId;
  document.getElementById('acomp-modal-title').innerText = `👥 Gestión de Acompañantes & Manillas - Apto ${numeroApto}`;
  document.getElementById('form-nuevo-acompanante').reset();
  
  const elPais = document.getElementById('add-acomp-pais');
  if (elPais) elPais.value = 'COLOMBIA';
  
  const elFoto = document.getElementById('add-acomp-foto-input');
  if (elFoto) elFoto.value = '';
  
  const btnFotoAdd = document.getElementById('btn-foto-nuevo-acomp');
  if (btnFotoAdd) {
    btnFotoAdd.innerText = '📷 Tomar Foto';
    btnFotoAdd.style.background = '#17a2b8';
  }

  const libres = await obtenerManillasDisponibles();
  const elManilla = document.getElementById('add-acomp-manilla');
  if (elManilla) elManilla.value = libres[0] || '';

  await cargarOcupantesActuales(reservaId);

  const modal = document.getElementById('gestion-acompanantes-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeGestionAcompanantesModal() {
  const modal = document.getElementById('gestion-acompanantes-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

async function cargarOcupantesActuales(reservaId) {
  const token = localStorage.getItem('jwt_token');
  const tbody = document.getElementById('tabla-ocupantes-actuales');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #666;">Cargando acompañantes...</td></tr>';

  try {
    const res = await fetch(`${API_URL}/reservas/${reservaId}/acompanantes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const ocupantes = await res.json();
      tbody.innerHTML = '';

      if (!ocupantes || ocupantes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #666;">No hay acompañantes adicionales registrados.</td></tr>';
        return;
      }

      ocupantes.forEach(o => {
        const fotoMini = o.foto ? `<img src="${o.foto}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;" title="Con foto">` : 'Sin foto';
        tbody.innerHTML += `
          <tr>
            <td><strong>${o.tipo_documento || 'CC'} ${o.documento || 'N/A'}</strong></td>
            <td><strong style="color: #007bff;">📿 #${o.codigo_manilla || o.manilla || 'N/A'}</strong></td>
            <td>${o.nombres || ''} ${o.apellidos || ''}</td>
            <td>${o.edad || 'N/A'}</td>
            <td>${o.pais || 'COLOMBIA'} (${o.ciudad || '-'})</td>
            <td>${fotoMini}</td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #e53e3e;">No se pudo cargar la lista de acompañantes.</td></tr>';
    }
  } catch (err) {
    console.error('Error al obtener acompañantes:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px; color: #e53e3e;">Error de conexión con el servidor.</td></tr>';
  }
}

async function guardarNuevoAcompananteExistente(event) {
  event.preventDefault();
  const token = localStorage.getItem('jwt_token');
  const reserva_id = document.getElementById('acomp-reserva-id').value;

  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const payload = {
    tipo_documento: getVal('add-acomp-tipo-doc') || 'CC',
    nombres: getVal('add-acomp-nombres'),
    apellidos: getVal('add-acomp-apellidos'),
    documento: getVal('add-acomp-doc'),
    manilla: getVal('add-acomp-manilla'),
    edad: getVal('add-acomp-edad'),
    pais: getVal('add-acomp-pais') || 'COLOMBIA',
    ciudad: getVal('add-acomp-ciudad'),
    foto: getVal('add-acomp-foto-input')
  };

  try {
    const res = await fetch(`${API_URL}/reservas/${reserva_id}/acompanantes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('¡Acompañante agregado y manilla asignada con éxito!');
      document.getElementById('form-nuevo-acompanante').reset();
      
      const elPais = document.getElementById('add-acomp-pais');
      if (elPais) elPais.value = 'COLOMBIA';
      
      const elFoto = document.getElementById('add-acomp-foto-input');
      if (elFoto) elFoto.value = '';
      
      await cargarOcupantesActuales(reserva_id);
      const libres = await obtenerManillasDisponibles();
      
      const elManilla = document.getElementById('add-acomp-manilla');
      if (elManilla) elManilla.value = libres[0] || '';
      
      loadHistorialReservas();
    } else {
      const errData = await res.json();
      alert('Error: ' + (errData.error || 'No se pudo agregar el acompañante'));
    }
  } catch (err) {
    console.error('Error al agregar acompañante:', err);
    alert('Error de conexión con el servidor.');
  }
}

let currentVideoElement = null;
let currentCanvasElement = null;
let activePhotoInputTarget = null;
let activePhotoButtonTarget = null;

function abrirModalCamara(tipo, idFila = '') {
  if (tipo === 'titular') {
    activePhotoInputTarget = document.getElementById('checkin-op-foto-input');
    activePhotoButtonTarget = document.getElementById('btn-foto-titular');
  } else if (tipo === 'nuevo-acomp') {
    activePhotoInputTarget = document.getElementById('add-acomp-foto-input');
    activePhotoButtonTarget = document.getElementById('btn-foto-nuevo-acomp');
  } else if (tipo === 'acomp') {
    const fila = document.getElementById(idFila);
    if (fila) {
      activePhotoInputTarget = fila.querySelector('.acomp-foto-input');
      activePhotoButtonTarget = fila.querySelector(`#btn-foto-${idFila}`);
    }
  }

  let modalCam = document.getElementById('modal-camara-captura');
  if (!modalCam) {
    modalCam = document.createElement('div');
    modalCam.id = 'modal-camara-captura';
    modalCam.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999;';
    modalCam.innerHTML = `
      <div style="background:#fff; padding:20px; border-radius:8px; text-align:center; max-width:400px; width:100%;">
        <h3>Tomar Fotografía del Huésped</h3>
        <video id="cam-preview" autoplay playsinline style="width:100%; height:250px; background:#000; border-radius:4px; object-fit:cover;"></video>
        <canvas id="cam-canvas" style="display:none;"></canvas>
        <div style="margin-top:15px; display:flex; justify-content:space-around;">
          <button type="button" onclick="capturarFotoReal()" style="background:#28a745; color:#fff; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;">📸 Capturar</button>
          <button type="button" onclick="cerrarModalCamara()" style="background:#dc3545; color:#fff; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;">❌ Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalCam);
  } else {
    modalCam.style.display = 'flex';
  }

  currentVideoElement = document.getElementById('cam-preview');
  currentCanvasElement = document.getElementById('cam-canvas');

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(stream => {
      if (currentVideoElement) currentVideoElement.srcObject = stream;
    })
    .catch(err => {
      alert('No se pudo acceder a la cámara: ' + err.message);
      cerrarModalCamara();
    });
}

function capturarFotoReal() {
  if (!currentVideoElement || !currentCanvasElement || !activePhotoInputTarget) return;

  const context = currentCanvasElement.getContext('2d');
  currentCanvasElement.width = currentVideoElement.videoWidth || 320;
  currentCanvasElement.height = currentVideoElement.videoHeight || 240;
  context.drawImage(currentVideoElement, 0, 0, currentCanvasElement.width, currentCanvasElement.height);

  const dataURL = currentCanvasElement.toDataURL('image/jpeg', 0.8);
  activePhotoInputTarget.value = dataURL;

  if (activePhotoButtonTarget) {
    activePhotoButtonTarget.innerText = '✅ Foto Lista';
    activePhotoButtonTarget.style.background = '#28a745';
  }

  cerrarModalCamara();
}

function cerrarModalCamara() {
  if (currentVideoElement && currentVideoElement.srcObject) {
    let tracks = currentVideoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
  const modalCam = document.getElementById('modal-camara-captura');
  if (modalCam) modalCam.style.display = 'none';
}

async function cargarSelectHabitaciones() {
  const select = document.getElementById('input-boleta-habitacion-id');
  if (!select) return;

  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const rooms = Array.isArray(data) ? data : (data.habitaciones || data.data || []);
      
      select.innerHTML = '<option value="">Seleccione un apartamento...</option>';
      rooms.forEach(r => {
        const rId = r.id || r._id;
        const rNum = r.numero || r.room_number || 'S/N';
        select.innerHTML += `<option value="${rId}">Apto ${rNum}</option>`;
      });
    }
  } catch (err) {
    console.error('Error al cargar habitaciones:', err);
  }
}

async function registrarBoletasMasivas(event) {
  event.preventDefault();
  const habitacion_id = document.getElementById('input-boleta-habitacion-id').value;
  const inicio = parseInt(document.getElementById('input-boleta-inicio').value);
  const fin = parseInt(document.getElementById('input-boleta-fin').value);

  if (fin < inicio) {
    alert('La boleta final no puede ser menor que la boleta inicial.');
    return;
  }

  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/inventario/boletas/masivo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ habitacion_id, inicio, fin })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`¡Se crearon exitosamente ${fin - inicio + 1} boletas de acceso!`);
      document.getElementById('form-boleta').reset();
      cargarBoletas();
    } else {
      alert('Error: ' + (data.error || 'No se pudieron crear las boletas'));
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

async function registrarManillasMasivas(event) {
  event.preventDefault();
  const inicio = parseInt(document.getElementById('input-manilla-inicio').value);
  const fin = parseInt(document.getElementById('input-manilla-fin').value);

  if (fin < inicio) {
    alert('La manilla final no puede ser menor que la manilla inicial.');
    return;
  }

  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/inventario/manillas/masivo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ inicio, fin })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`¡Se crearon exitosamente ${fin - inicio + 1} manillas en el inventario!`);
      document.getElementById('form-manilla').reset();
      cargarManillas();
    } else {
      alert('Error: ' + (data.error || 'No se pudieron registrar las manillas'));
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

async function cargarInventario() {
  cargarBoletas();
  cargarManillas();
  cargarSelectHabitaciones();
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
  }
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

// --- HISTORIAL DE RESERVAS & COMPROBANTES ---
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
      let reservas = Array.isArray(data) ? data : (data.data || data.reservas || []);
      renderTablaHistorial(reservas);
    }
  } catch (err) {
    console.error('Error al cargar reservas:', err);
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
    }

    const cliente = item.cliente_nombre || item.huesped_nombre || 'Sin cliente asignado';
    const numeroHabitacion = item.habitacion_numero || item.habitacion_id || 'N/A';
    const fechaEntrada = item.fecha_entrada ? item.fecha_entrada.split('T')[0] : 'N/A';
    const fechaSalida = item.fecha_salida ? item.fecha_salida.split('T')[0] : 'N/A';

    tbody.innerHTML += `
      <tr>
        <td><strong>Apto ${numeroHabitacion}</strong></td>
        <td>${cliente}</td>
        <td>
          <button onclick="abrirModalGestionAcompanantes(${item.id}, '${numeroHabitacion}')" style="background:#6f42c1; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">
            👥 Acompañantes / Manillas
          </button>
        </td>
        <td>📅 ${fechaEntrada} ➔ ${fechaSalida}</td>
        <td>${estadoBadge}</td>
        <td>
          <button onclick="descargarComprobantePDF(${item.id})" style="background:#17a2b8; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">
            📄 Ver Comprobante
          </button>
        </td>
      </tr>
    `;
  });
}

async function descargarComprobantePDF(reservaId) {
  const token = localStorage.getItem('jwt_token');

  try {
    const response = await fetch(`${API_URL}/pdf/comprobante/${reservaId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
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
    }
  } catch (err) {
    console.error('Error al cargar PDF:', err);
  }
}

function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
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

function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  location.reload();
}

// --- LÓGICA DE GESTIÓN DE VISITAS Y PERSONAL (CONECTADO A API BACKEND) ---

function escaparHtmlVisitas(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function actualizarSelectsApartamentosVisitas() {
  const selects = [document.getElementById('emp-apto'), document.getElementById('vis-apto')];

  if (!allRooms || allRooms.length === 0) {
    await loadRooms();
  }

  const nombres = [...new Set((allRooms || []).map(room => {
    const num = String(room.numero || room.room_number || 'S/N').trim();
    return /^apto/i.test(num) ? num : `Apto ${num}`;
  }))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  selects.forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">Seleccione apartamento...</option>';
    nombres.forEach(nombre => {
      const opt = document.createElement('option');
      opt.value = nombre;
      opt.textContent = nombre;
      select.appendChild(opt);
    });
  });
}

async function abrirModalRegistroPersonal() {
  await actualizarSelectsApartamentosVisitas();
  document.getElementById('emp-doc').value = '';
  document.getElementById('emp-nombre').value = '';
  document.getElementById('emp-detalles').value = '';

  const modal = document.getElementById('modal-reg-empleado');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function cerrarModalEmpleado() {
  const modal = document.getElementById('modal-reg-empleado');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

async function abrirModalRegistroVisitante() {
  await actualizarSelectsApartamentosVisitas();
  document.getElementById('vis-doc').value = '';
  document.getElementById('vis-nombre').value = '';
  document.getElementById('vis-autorizacion').value = 'Autorizado';

  const modal = document.getElementById('modal-reg-visitante');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function cerrarModalVisitante() {
  const modal = document.getElementById('modal-reg-visitante');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function extraerDatosCedulaTexto(textoRaw) {
  const texto = textoRaw.replace(/[\r\n\t]/g, ' ').trim();
  let doc = '', ap1 = '', ap2 = '', nom1 = '', nom2 = '';

  if (texto.includes('<') || texto.includes('ICCOL')) {
    const matchesNumeros = texto.match(/\b([0-9]{8,10})\b/g);
    if (matchesNumeros && matchesNumeros.length > 0) {
      doc = matchesNumeros[0];
    } else {
      const matchDocMRZ = texto.match(/ICCOL([0-9]{8,10})/i) || texto.match(/COL([0-9]{8,10})/i);
      if (matchDocMRZ) doc = matchDocMRZ[1];
    }

    const matchNombresMRZ = texto.match(/([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)<<([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)/i) ||
                            texto.match(/([A-ZÁÉÍÓÚÑ]+)<([A-ZÁÉÍÓÚÑ]+)<<([A-ZÁÉÍÓÚÑ]+)/i);

    if (matchNombresMRZ) {
      ap1 = matchNombresMRZ[1] || '';
      ap2 = matchNombresMRZ[2] || '';
      nom1 = matchNombresMRZ[3] || '';
      nom2 = matchNombresMRZ[4] || '';
    } else {
      const partesMRZ = texto.split('<<');
      if (partesMRZ.length >= 2) {
        const aps = partesMRZ[0].split('<').filter(Boolean);
        const noms = partesMRZ[1].split('<').filter(Boolean);
        ap1 = aps[aps.length - 2] || aps[0] || '';
        ap2 = aps[aps.length - 1] || '';
        nom1 = noms[0] || '';
        nom2 = noms[1] || '';
      }
    }
  } else {
    const regexCC = /([0-9]{8,10})([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]+)\b\s*([A-ZÁÉÍÓÚÑ]*)\b\s*([MF])([0-9]{8})([0-9A-Z+-]{2,3})/;
    const match = texto.match(regexCC);
    if (match) {
      doc = match[1];
      ap1 = match[2];
      ap2 = match[3];
      nom1 = match[4];
      nom2 = match[5] || '';
    }
  }

  const nombre = [nom1, nom2, ap1, ap2].filter(Boolean).join(' ');
  return { doc, nombre };
}

function procesarEscaneoCedulaPersonal(textoRaw, tipoForm) {
  if (!textoRaw || textoRaw.length < 10) return;

  const { doc, nombre } = extraerDatosCedulaTexto(textoRaw);

  if (tipoForm === 'emp') {
    if (doc) document.getElementById('emp-doc').value = doc;
    if (nombre) document.getElementById('emp-nombre').value = nombre;
  } else if (tipoForm === 'vis') {
    if (doc) document.getElementById('vis-doc').value = doc;
    if (nombre) document.getElementById('vis-nombre').value = nombre;
  }
}

['emp-doc', 'vis-doc'].forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.preventDefault();
    });
  }
});

async function guardarRegistroEmpleado(event) {
  event.preventDefault();
  const token = localStorage.getItem('jwt_token');

  const nuevoRegistro = {
    tipo: 'empleado',
    apartamento: document.getElementById('emp-apto').value,
    documento: document.getElementById('emp-doc').value.trim(),
    nombre: document.getElementById('emp-nombre').value.trim(),
    detalles: document.getElementById('emp-detalles').value.trim(),
    rol: document.getElementById('emp-rol').value
  };

  try {
    const res = await fetch(`${API_URL}/visitas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(nuevoRegistro)
    });

    if (res.ok) {
      cerrarModalEmpleado();
      renderTablaVisitas();
      alert('¡Entrada de personal registrada con éxito en la base de datos!');
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'No se pudo registrar el ingreso'));
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

async function guardarRegistroVisitante(event) {
  event.preventDefault();
  const token = localStorage.getItem('jwt_token');
  const autorizacion = document.getElementById('vis-autorizacion').value;

  const nuevoRegistro = {
    tipo: 'visitante',
    apartamento: document.getElementById('vis-apto').value,
    documento: document.getElementById('vis-doc').value.trim(),
    nombre: document.getElementById('vis-nombre').value.trim(),
    detalles: 'Visitante Temporal',
    autorizacion: autorizacion
  };

  try {
    const res = await fetch(`${API_URL}/visitas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(nuevoRegistro)
    });

    if (res.ok) {
      cerrarModalVisitante();
      renderTablaVisitas();
      if (autorizacion === 'Autorizado') {
        alert('¡Visitante registrado con éxito!');
      } else if (autorizacion === 'Pendiente') {
        alert('Visitante registrado en estado Pendiente.');
      } else {
        alert('Se registró el acceso como Rechazado.');
      }
    } else {
      const data = await res.json();
      alert('Error: ' + (data.error || 'No se pudo registrar el visitante'));
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

async function renderTablaVisitas() {
  const token = localStorage.getItem('jwt_token');
  const tbody = document.getElementById('tabla-visitas-personal');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">Cargando registros de visitas...</td></tr>`;

  try {
    const res = await fetch(`${API_URL}/visitas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      const datos = await res.json();
      tbody.innerHTML = '';

      if (!datos || datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay registros activos de visitas o personal.</td></tr>`;
        return;
      }

      const e = escaparHtmlVisitas;

      datos.forEach(item => {
        const tipoBadge = item.tipo === 'empleado'
          ? '<span style="background:#28a745; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">👷 Empleado / Mantenimiento</span>'
          : '<span style="background:#007bff; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">🚪 Visitante</span>';

        let detalleBadge = '';
        if (item.tipo === 'empleado') {
          detalleBadge = `<strong style="color: #333;">${e(item.rol)}</strong><br><small style="color:#666;">${e(item.detalles)}</small>`;
        } else {
          const authEstado = item.autorizacion || 'Autorizado';
          let colorAuth = '#28a745';
          if (authEstado === 'Pendiente') colorAuth = '#ffc107';
          if (authEstado === 'Rechazado') colorAuth = '#dc3545';
          detalleBadge = `<span style="background:${colorAuth}; color:white; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${e(authEstado)}</span>`;
        }

        let colorEstado = '#28a745';
        let textoEstado = item.estado || 'En Torre';
        if (textoEstado === 'Esperando autorización' || item.autorizacion === 'Pendiente') colorEstado = '#e0a800';
        if (textoEstado === 'Acceso denegado' || item.autorizacion === 'Rechazado') colorEstado = '#dc3545';
        if (textoEstado === 'Retirado') colorEstado = '#666';

        let accionBtn = '<span style="color: #666; font-size: 11px;">—</span>';
        if (textoEstado === 'En Torre') {
          accionBtn = `<button onclick="marcarSalidaVisita(${item.id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">🚪 Registrar Salida</button>`;
        } else if (item.autorizacion === 'Pendiente') {
          accionBtn = `
            <button onclick="resolverAutorizacionVisita(${item.id}, 'Autorizado')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px; margin-right:4px;">✅ Autorizar</button>
            <button onclick="resolverAutorizacionVisita(${item.id}, 'Rechazado')" style="background:#6c757d; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">⛔ Denegar</button>`;
        } else if (textoEstado === 'Retirado') {
          accionBtn = '<span style="color: #666; font-size: 11px;">Salida registrada</span>';
        }

        const horaEntradaFmt = item.hora_entrada ? new Date(item.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        const fechaFmt = item.creado_en ? item.creado_en.split('T')[0] : '';

        tbody.innerHTML += `
          <tr>
            <td>${tipoBadge}</td>
            <td><strong>${e(item.apartamento)}</strong></td>
            <td><strong>${e(item.nombre)}</strong><br><small style="color:#666;">Doc: ${e(item.documento)}</small></td>
            <td>${detalleBadge}</td>
            <td><span style="color:${colorEstado}; font-weight:bold;">${e(textoEstado)}</span></td>
            <td>⏰ ${e(horaEntradaFmt)}<br><small style="color:#666;">${e(fechaFmt)}</small></td>
            <td>${accionBtn}</td>
          </tr>
        `;
      });
    }
  } catch (err) {
    console.error('Error al cargar visitas:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Error al conectar con el servidor.</td></tr>`;
  }
}

async function marcarSalidaVisita(id) {
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/visitas/${id}/salida`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      renderTablaVisitas();
    } else {
      alert('No se pudo registrar la salida.');
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

async function resolverAutorizacionVisita(id, nuevoEstadoAuth) {
  const token = localStorage.getItem('jwt_token');

  try {
    const res = await fetch(`${API_URL}/visitas/${id}/autorizacion`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ autorizacion: nuevoEstadoAuth })
    });

    if (res.ok) {
      renderTablaVisitas();
    } else {
      alert('No se pudo actualizar la autorización.');
    }
  } catch (err) {
    alert('Error de conexión con el servidor.');
  }
}

function filtrarVisitasPersonal() {
  renderTablaVisitas();
}

if (localStorage.getItem('jwt_token')) {
  showDashboard();
}