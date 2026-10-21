const API_URL = 'https://hotel-management-system-dun5.onrender.com/api';

let allRooms = []; 

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
      alert('¡Cuenta de propietario creada con éxito! Ahora puedes iniciar sesión.');
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
  loadRooms();
}

function applyRolePermissions() {
  const role = localStorage.getItem('user_role') || 'propietario';
  const isAdmin = role === 'admin' || role === 'administrador';
  const isOperador = role === 'recepcionista' || role === 'operador';

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

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

    const huespedInfo = room.proximo_huesped ? `<br><small style="color:#007bff; font-weight:bold;">Huésped: ${room.proximo_huesped}</small>` : '';
    const diasInfo = room.dias_estancia ? `<br><small style="color:#28a745; font-weight:bold;">Estancia: ${room.dias_estancia} día(s)</small>` : '';

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
        actionButtons += `<button onclick="openCheckInModal(${roomId}, '${numeroApto}')" style="background:#007bff; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #fff; font-weight: bold;">📅 Informar Check-In</button>`;
      } else if (estadoLower.includes('reservado') || estadoLower.includes('por llegar')) {
        actionButtons += `<small style="color:#17a2b8; font-weight:bold;">⏳ Pendiente de aprobación</small>`;
      } else if (estadoLower === 'ocupada') {
        actionButtons += `<small style="color:#e0a800; font-weight:bold;">🔴 Inmueble Ocupado</small>`;
      }
    }

    if (isAdmin) {
      actionButtons += `<button onclick="openEditRoomModal(${roomId}, '${numeroApto}', '${tipoApto}', ${precioApto}, '${nombresP}', '${apellidosP}', '${emailP}', '${celularP}')" style="background:#ffc107; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #000; font-weight: bold; margin-right: 4px;">Editar</button>`;
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
          ${diasInfo}
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
  const fecha = document.getElementById('checkin-fecha').value;
  const dias = document.getElementById('checkin-dias').value;
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
        fecha_ingreso: fecha,
        dias_estancia: Number(dias)
      })
    });

    if (res.ok) {
      alert(`¡Aviso de reserva registrado! (${dias} días). Queda pendiente de aprobación por recepción.`);
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

async function confirmarIngresoHuesped(id) {
  if (!confirm('¿Confirmar la llegada del huésped y realizar el Check-In oficial?')) return;
  
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ estado: 'Ocupada' })
    });

    if (res.ok) {
      alert('¡Check-In aprobado con éxito! La habitación ahora está Ocupada.');
      loadRooms();
    } else {
      alert('No se pudo confirmar el Check-In.');
    }
  } catch (err) {
    console.error(err);
    alert('Error de conexión con el servidor.');
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
  localStorage.removeItem('user_email');
  location.reload();
}

if (localStorage.getItem('jwt_token')) {
  showDashboard();
}
