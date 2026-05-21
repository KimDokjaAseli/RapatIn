// State Management
const state = {
    currentUser: null,
    meetings: [],
    currentPage: 'home',
    searchQuery: ''
};

// API Configuration
const API_BASE = window.location.origin.startsWith('file://') ? 'http://localhost:8080/api' : '/api';

// Custom Toast Notification System
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Trigger reflow
    void toast.offsetWidth;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// API Fetch Helper
async function apiFetch(endpoint, options = {}) {
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
    }
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Terjadi kesalahan');
        }
        return data;
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        throw err;
    }
}

async function loadMeetings() {
    if (!state.currentUser) return;
    try {
        const res = await apiFetch(`/meetings?userId=${state.currentUser.id}`);
        state.meetings = res.data || [];
        updateUI();
    } catch (err) {
        showToast(err.message, 'error');
        if (err.message.toLowerCase().includes('not found') || err.message.toLowerCase().includes('unauthorized')) {
            logout();
        }
    }
}

// Core Functions
async function init() {
    setupEventListeners();
    
    // Load data from localStorage
    const savedUser = localStorage.getItem('rapatin_user');

    if (savedUser) {
        state.currentUser = JSON.parse(savedUser);
        document.getElementById('auth-container').classList.add('hidden');
        await loadMeetings();
    } else {
        document.getElementById('auth-container').classList.remove('hidden');
        updateUI();
    }
}

// UI Updating Functions
function updateUI() {
    updateHeader();
    renderPage();
}

function updateHeader() {
    if (state.currentUser) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.name)}&background=800000&color=fff`;
        document.getElementById('header-avatar').src = avatarUrl;
        document.getElementById('header-username').textContent = state.currentUser.name.split(' ')[0];
    }
}

function renderPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = '';
    
    // Add fade-in animation
    container.classList.remove('fade-in');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('fade-in');

    const filteredMeetings = state.meetings.filter(m => 
        m.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        m.location.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    switch(state.currentPage) {
        case 'home':
            renderHomePage(container, filteredMeetings);
            break;
        case 'meetings':
            renderMeetingsPage(container, filteredMeetings);
            break;
        case 'profile':
            renderProfilePage(container);
            break;
        case 'about':
            renderAboutPage(container);
            break;
    }

    // Update nav active states
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-page') === state.currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function renderHomePage(container, filteredMeetings) {
    const nearest = state.meetings.length > 0 ? state.meetings[0] : null;
    
    let html = `
        <section class="home-section">
            <div class="hero-card fade-in">
                <span class="hero-tag">Highlight Rapat</span>
                <h1>${nearest ? nearest.title : 'Belum Ada Rapat'}</h1>
                <div class="hero-info">
                    <div class="info-item"><i class="far fa-calendar"></i> ${nearest ? nearest.date : '-'}</div>
                    <div class="info-item"><i class="fas fa-map-marker-alt"></i> ${nearest ? nearest.location : '-'}</div>
                </div>
            </div>

            <div class="section-header">
                <h2>Daftar Notulensi</h2>
                <button class="btn btn-secondary" onclick="setPage('meetings')">Lihat Semua</button>
            </div>

            <div class="meeting-grid">
                ${filteredMeetings.slice(0, 4).map(m => createMeetingCard(m)).join('')}
                ${filteredMeetings.length === 0 ? '<div class="empty-state">Tidak ada rapat ditemukan</div>' : ''}
            </div>
        </section>
    `;
    container.innerHTML = html;
}

function renderMeetingsPage(container, filteredMeetings) {
    let html = `
        <section class="meetings-section">
            <div class="section-header">
                <h2>Semua Rapat (${filteredMeetings.length})</h2>
            </div>
            <div class="meeting-grid">
                ${filteredMeetings.map(m => createMeetingCard(m)).join('')}
                ${filteredMeetings.length === 0 ? '<div class="empty-state">Tidak ada rapat ditemukan</div>' : ''}
            </div>
        </section>
    `;
    container.innerHTML = html;
}

function renderProfilePage(container) {
    if (!state.currentUser) return;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.name)}&background=800000&color=fff&size=200`;
    
    let html = `
        <div class="profile-container fade-in">
            <div class="profile-header">
                <img src="${avatarUrl}" class="profile-avatar-large" alt="Profile">
                <h2>${state.currentUser.name}</h2>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${state.currentUser.email}</p>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-value">${state.meetings.length}</span>
                        <span class="stat-label">Total Rapat</span>
                    </div>
                </div>
            </div>

            <div class="profile-content" style="background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                <h3>Pengaturan Akun</h3>
                <div style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label>Nama Lengkap</label>
                        <input type="text" value="${state.currentUser.name}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Alamat Email</label>
                        <input type="email" value="${state.currentUser.email}" readonly>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

function renderAboutPage(container) {
    let html = `
        <div class="about-container fade-in" style="max-width: 800px; margin: 0 auto; text-align: center;">
            <div class="auth-logo" style="margin-bottom: 2rem;">
                <i class="fas fa-handshake"></i>
                <h1>RapatIn</h1>
            </div>
            <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 2rem;">
                RapatIn adalah solusi modern untuk mendokumentasikan hasil rapat Anda. 
                Simpan notulensi, jadwal, dan lokasi dengan tampilan yang elegan dan mudah digunakan.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-top: 3rem;">
                <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <i class="fas fa-bolt" style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"></i>
                    <h4>Cepat</h4>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"></i>
                    <h4>Aman</h4>
                </div>
                <div style="background: white; padding: 1.5rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                    <i class="fas fa-cloud" style="font-size: 2rem; color: var(--primary); margin-bottom: 1rem;"></i>
                    <h4>Terintegrasi</h4>
                </div>
            </div>
            <footer style="margin-top: 5rem; color: var(--text-muted);">
                <p>&copy; 2023 RapatIn Team. All rights reserved.</p>
            </footer>
        </div>
    `;
    container.innerHTML = html;
}

function createMeetingCard(meeting) {
    return `
        <div class="meeting-card fade-in" onclick="editMeeting('${meeting.id}')">
            <div class="card-header">
                <span class="card-date">${formatDate(meeting.date)} &bull; ${meeting.time}</span>
                <div class="card-actions">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
            </div>
            <h3>${meeting.title}</h3>
            <p>${meeting.description || 'Tidak ada deskripsi.'}</p>
            <div class="card-footer">
                <div class="location-chip">
                    <i class="fas fa-map-marker-alt"></i>
                    ${meeting.location}
                </div>
                <button class="icon-btn" style="margin-left: auto; width: 32px; height: 32px; border: none; color: #E63946;" onclick="deleteMeeting(event, '${meeting.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
}

// Helpers
function formatDate(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

function setPage(page) {
    state.currentPage = page;
    updateUI();
}

// Event Handlers
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            if (page) setPage(page);
        });
    });

    // Modal
    document.getElementById('add-meeting-btn').addEventListener('click', openAddModal);
    document.getElementById('fab-add').addEventListener('click', openAddModal);
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Form Submissions
    document.getElementById('meeting-form').addEventListener('submit', handleMeetingSubmit);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Auth Switch
    document.getElementById('to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
    });
    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
    });

    // Search
    document.getElementById('global-search').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderPage();
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
}

function openAddModal() {
    document.getElementById('modal-title').textContent = 'Buat Rapat Baru';
    document.getElementById('meeting-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('meeting-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('meeting-modal').classList.remove('active');
}

async function handleMeetingSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const meetingData = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location: document.getElementById('location').value,
        description: document.getElementById('description').value,
        userId: state.currentUser.id
    };

    try {
        if (editId) {
            const res = await apiFetch(`/meetings/${editId}`, {
                method: 'PATCH',
                body: meetingData
            });
            const index = state.meetings.findIndex(m => m.id === editId);
            if (index !== -1) {
                state.meetings[index] = res.data;
            }
            showToast('Notulensi rapat berhasil diperbarui', 'success');
        } else {
            const res = await apiFetch('/meetings', {
                method: 'POST',
                body: meetingData
            });
            state.meetings.unshift(res.data);
            showToast('Notulensi rapat baru berhasil dibuat', 'success');
        }
        closeModal();
        updateUI();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function editMeeting(id) {
    const meeting = state.meetings.find(m => m.id === id);
    if (!meeting) return;

    document.getElementById('modal-title').textContent = 'Edit Rapat';
    document.getElementById('edit-id').value = meeting.id;
    document.getElementById('title').value = meeting.title;
    document.getElementById('date').value = meeting.date;
    document.getElementById('time').value = meeting.time;
    document.getElementById('location').value = meeting.location;
    document.getElementById('description').value = meeting.description;

    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('meeting-modal').classList.add('active');
}

async function deleteMeeting(e, id) {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus notulensi ini?')) {
        try {
            await apiFetch(`/meetings/${id}`, {
                method: 'DELETE'
            });
            state.meetings = state.meetings.filter(m => m.id !== id);
            updateUI();
            showToast('Notulensi rapat berhasil dihapus', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await apiFetch('/login', {
            method: 'POST',
            body: { email, password }
        });
        state.currentUser = res.data;
        saveUser();
        document.getElementById('auth-container').classList.add('hidden');
        showToast('Selamat datang kembali!', 'success');
        await loadMeetings();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        await apiFetch('/register', {
            method: 'POST',
            body: { name, email, password }
        });
        showToast('Pendaftaran berhasil! Silakan masuk.', 'success');
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function logout() {
    state.currentUser = null;
    state.meetings = [];
    saveUser();
    document.getElementById('auth-container').classList.remove('hidden');
    updateUI();
}

// Start App
init();
