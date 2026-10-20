// URL de tu backend en Render
const API_URL = 'https://hotel-management-system-dun5.onrender.com/api';

// 1. Manejo del Login
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
      showDashboard();
    } else {
      document.getElementById('login-error').innerText = data.mensaje || 'Error al ingresar';
    }
  } catch (err) {
    document.getElementById('login-error').innerText = 'No se pudo conectar con el servidor';
  }
});

// 2. Mostrar Dashboard
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  loadRooms();
}

// 3. Cargar Habitaciones y Propietarios en tiempo real
async function loadRooms() {
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    const rooms = Array.isArray(data) ? data : (data.habitaciones || data.data || []);
    const tbody = document.getElementById('rooms-list');
    tbody.innerHTML = '';

    if (rooms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No hay propiedades registradas.</td></tr>`;
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

      // Botones dinámicos de Check-In / Check-Out
      let actionButtons = '';
      if (estado.toLowerCase() === 'disponible') {
        actionButtons += `<button class="btn-checkin" onclick="realizarCheckIn(${roomId})">Check-In</button> `;
      } else {
        actionButtons += `<button class="btn-checkout" onclick="realizarCheckOut(${roomId})">Check-Out</button> `;
      }

      // Botón para Editar
      actionButtons += `<button onclick="openEditRoomModal(${roomId}, '${numeroApto}', '${tipoApto}', ${precioApto}, '${nombresP}', '${apellidosP}', '${emailP}', '${celularP}')" style="background:#ffc107; border:none; padding:5px 8px; border-radius:3px; cursor:pointer; color: #000; font-weight: bold;">Editar</button>`;

      tbody.innerHTML += `
        <tr>
          <td><strong>${numeroApto}</strong></td>
          <td>${tipoApto}</td>
          <td>$${precioApto}</td>
          <td>${nombreCompleto}<br><small style="color: #666;">${contactoP}</small></td>
          <td><span class="status ${estado}">${estado}</span></td>
          <td>${actionButtons}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error al cargar habitaciones:', err);
  }
}

// 4. Apertura y Cierre de Modal (Crear / Editar)
function openRoomModal() {
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.innerText = 'Registrar Propiedad / Propietario';
  
  const editIdEl = document.getElementById('room-id-edit');
  if (editIdEl) editIdEl.value = ''; // Vacío indica que es un registro nuevo

  const formEl = document.getElementById('room-form');
  if (formEl) formEl.reset();

  const modalEl = document.getElementById('room-modal');
  if (modalEl) {
    modalEl.classList.remove('hidden');
    modalEl.style.display = 'flex';
  }
}

function openEditRoomModal(id, numero, tipo, precio, nombres, apellidos, email, celular) {
  const titleEl = document.getElementById('modal-title');
  if (titleEl) titleEl.innerText = 'Editar Propiedad / Propietario';
  
  const editIdEl = document.getElementById('room-id-edit');
  if (editIdEl) editIdEl.value = id; // Asigna el ID para actualizar
  
  // Rellenar campos
  document.getElementById('room-number').value = numero || '';
  document.getElementById('room-type').value = tipo || 'Apartamento';
  document.getElementById('room-price').value = precio || '';
  document.getElementById('owner-name').value = nombres || '';
  document.getElementById('owner-lastname').value = apellidos || '';
  document.getElementById('owner-email').value = email || '';
  document.getElementById('owner-phone').value = celular || '';

  const modalEl = document.getElementById('room-modal');
  if (modalEl) {
    modalEl.classList.remove('hidden');
    modalEl.style.display = 'flex';
  }
}

function closeRoomModal() {
  const modalEl = document.getElementById('room-modal');
  if (modalEl) {
    modalEl.classList.add('hidden');
    modalEl.style.display = 'none';
  }
  const formEl = document.getElementById('room-form');
  if (formEl) formEl.reset();
}

// 5. Guardar Propiedad (POST si es nuevo, PUT si se está editando)
async function saveRoom(event) {
  event.preventDefault();
  
  const idEdit = document.getElementById('room-id-edit').value;
  const isEditing = idEdit !== '';

  const numero = document.getElementById('room-number').value;
  const tipo = document.getElementById('room-type').value;
  const precio = document.getElementById('room-price').value;

  const payload = {
    numero: numero,
    room_number: numero,
    tipo: tipo,
    type: tipo,
    precio_noche: Number(precio),
    precio: Number(precio),
    price: Number(precio),
    nombres_propietario: document.getElementById('owner-name').value,
    apellidos_propietario: document.getElementById('owner-lastname').value,
    email_propietario: document.getElementById('owner-email').value,
    celular_propietario: document.getElementById('owner-phone').value,
    estado: 'Disponible',
    status: 'Disponible'
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

    const data = await res.json();

    if (res.ok) {
      closeRoomModal();
      loadRooms(); // Actualiza la tabla al instante
    } else {
      console.error('Error de API:', data);
      alert('Error al guardar: ' + (data.mensaje || data.message || JSON.stringify(data)));
    }
  } catch (err) {
    console.error('Error en la petición:', err);
    alert('Error de conexión con el servidor');
  }
}

function createRoom(event) {
  saveRoom(event);
}

// 6. Cambiar entre secciones de la barra lateral
function showSection(section) {
  document.querySelectorAll('.module').forEach(sec => sec.classList.add('hidden'));
  const targetSec = document.getElementById(`sec-${section}`);
  if (targetSec) targetSec.classList.remove('hidden');
}

// 7. Cerrar Sesión
function logout() {
  localStorage.removeItem('jwt_token');
  location.reload();
}

// Validar token existente al abrir la app
if (localStorage.getItem('jwt_token')) {
  showDashboard();
}

// 8. Realizar Check-In
async function realizarCheckIn(id) {
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
      loadRooms();
    } else {
      const errData = await res.json();
      alert(errData.mensaje || 'No se pudo realizar el Check-In');
    }
  } catch (err) {
    console.error('Error en Check-In:', err);
    alert('Error de conexión con el servidor');
  }
}

// 9. Realizar Check-Out
async function realizarCheckOut(id) {
  const token = localStorage.getItem('jwt_token');
  try {
    const res = await fetch(`${API_URL}/habitaciones/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ estado: 'Disponible' }) 
    });

    if (res.ok) {
      loadRooms();
    } else {
      const errData = await res.json();
      alert(errData.mensaje || 'No se pudo realizar el Check-Out');
    }
  } catch (err) {
    console.error('Error en Check-Out:', err);
    alert('Error de conexión con el servidor');
  }
}