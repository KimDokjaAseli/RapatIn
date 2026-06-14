// State Management
const state = {
    currentUser: null,
    meetings: [],
    currentPage: 'home',
    searchQuery: '',
    currentView: 'list', // 'list' or 'calendar'
    selectedFilterTag: '', // for tag filtering
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    selectedTags: [] // temporary tags for modal
};

// API Configuration
const API_BASE = (window.location.origin.startsWith('file://') || !window.location.origin.includes('8080')) 
    ? 'http://localhost:8080/api' 
    : '/api';

// Save current user session to localStorage
function saveUser() {
    if (state.currentUser) {
        localStorage.setItem('rapatin_user', JSON.stringify(state.currentUser));
    } else {
        localStorage.removeItem('rapatin_user');
    }
}

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
    
    // Add X-Admin-ID header if user is logged in
    if (state.currentUser) {
        options.headers = {
            ...options.headers,
            'X-Admin-ID': state.currentUser.id
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
    updateNavigationVisibility();
}

function updateHeader() {
    if (state.currentUser) {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.currentUser.name)}&background=800000&color=fff`;
        document.getElementById('header-avatar').src = avatarUrl;
        document.getElementById('header-username').textContent = state.currentUser.name.split(' ')[0];
    }
}

function updateNavigationVisibility() {
    const sidebarAdmin = document.getElementById('sidebar-admin-link');
    const mobileAdmin = document.getElementById('mobile-admin-link');
    
    if (state.currentUser && state.currentUser.role === 'admin') {
        if (sidebarAdmin) sidebarAdmin.classList.remove('hidden');
        if (mobileAdmin) mobileAdmin.classList.remove('hidden');
    } else {
        if (sidebarAdmin) sidebarAdmin.classList.add('hidden');
        if (mobileAdmin) mobileAdmin.classList.add('hidden');
    }
}

function renderPage() {
    const container = document.getElementById('page-container');
    container.innerHTML = '';
    
    // Add fade-in animation
    container.classList.remove('fade-in');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('fade-in');

    let filteredMeetings = state.meetings;
    if (state.selectedFilterTag) {
        filteredMeetings = filteredMeetings.filter(m => m.tags && m.tags.includes(state.selectedFilterTag));
    }
    filteredMeetings = filteredMeetings.filter(m => 
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
        case 'admin':
            renderAdminPage(container);
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
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div class="view-controls">
                        <button class="btn-toggle-view ${state.currentView === 'list' ? 'active' : ''}" onclick="setView('list')">
                            <i class="fas fa-list"></i> Daftar
                        </button>
                        <button class="btn-toggle-view ${state.currentView === 'calendar' ? 'active' : ''}" onclick="setView('calendar')">
                            <i class="fas fa-calendar-alt"></i> Kalender
                        </button>
                    </div>
                    <button class="btn btn-secondary" onclick="setPage('meetings')">Lihat Semua</button>
                </div>
            </div>

            ${renderTagFilters()}

            ${state.currentView === 'list' 
                ? `
                <div class="meeting-grid">
                    ${filteredMeetings.slice(0, 4).map(m => createMeetingCard(m)).join('')}
                    ${filteredMeetings.length === 0 ? '<div class="empty-state">Tidak ada rapat ditemukan</div>' : ''}
                </div>`
                : renderCalendarView()
            }
        </section>
    `;
    container.innerHTML = html;
}

function renderMeetingsPage(container, filteredMeetings) {
    let html = `
        <section class="meetings-section">
            <div class="section-header">
                <h2>Semua Rapat (${filteredMeetings.length})</h2>
                <div class="view-controls">
                    <button class="btn-toggle-view ${state.currentView === 'list' ? 'active' : ''}" onclick="setView('list')">
                        <i class="fas fa-list"></i> Daftar
                    </button>
                    <button class="btn-toggle-view ${state.currentView === 'calendar' ? 'active' : ''}" onclick="setView('calendar')">
                        <i class="fas fa-calendar-alt"></i> Kalender
                    </button>
                </div>
            </div>

            ${renderTagFilters()}

            ${state.currentView === 'list'
                ? `
                <div class="meeting-grid">
                    ${filteredMeetings.map(m => createMeetingCard(m)).join('')}
                    ${filteredMeetings.length === 0 ? '<div class="empty-state">Tidak ada rapat ditemukan</div>' : ''}
                </div>`
                : renderCalendarView()
            }
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
                <p style="color: var(--text-muted); margin-bottom: 0.5rem;">${state.currentUser.position || 'Member'}</p>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem; font-style: italic;">"${state.currentUser.bio || 'Belum ada bio.'}"</p>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-value">${state.meetings.length}</span>
                        <span class="stat-label">Total Rapat</span>
                    </div>
                </div>
            </div>

            <div class="profile-content" style="background: white; padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 2rem;">
                <h3>Pengaturan Akun</h3>
                <form id="profile-form" style="margin-top: 1.5rem;">
                    <div class="form-group">
                        <label for="profile-name">Nama Lengkap</label>
                        <input type="text" id="profile-name" value="${state.currentUser.name || ''}" required placeholder="Nama Lengkap">
                    </div>
                    <div class="form-group">
                        <label for="profile-position">Jabatan / Posisi</label>
                        <input type="text" id="profile-position" value="${state.currentUser.position || ''}" placeholder="Contoh: Project Manager">
                    </div>
                    <div class="form-group">
                        <label for="profile-bio">Bio Singkat</label>
                        <textarea id="profile-bio" rows="3" placeholder="Tulis bio singkat Anda...">${state.currentUser.bio || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="profile-email">Alamat Email</label>
                        <input type="email" id="profile-email" value="${state.currentUser.email || ''}" required placeholder="nama@email.com">
                    </div>
                    <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary" id="save-profile-btn">
                            <i class="fas fa-save"></i> Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    // Attach event listener immediately to the dynamic form
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
}

function renderTagFilters() {
    const allTagsSet = new Set();
    state.meetings.forEach(m => {
        if (m.tags) {
            m.tags.forEach(t => allTagsSet.add(t));
        }
    });
    const uniqueTags = Array.from(allTagsSet);

    if (uniqueTags.length === 0) return '';

    return `
        <div class="tag-filters-container fade-in">
            <span class="filter-label"><i class="fas fa-filter"></i> Filter Tag:</span>
            <span class="tag-pill ${!state.selectedFilterTag ? 'active' : ''}" onclick="filterByTag('')">Semua</span>
            ${uniqueTags.map(tag => `
                <span class="tag-pill ${state.selectedFilterTag === tag ? 'active' : ''}" onclick="filterByTag('${tag}')">${tag}</span>
            `).join('')}
        </div>
    `;
}

function filterByTag(tag) {
    state.selectedFilterTag = tag;
    renderPage();
}

function setView(view) {
    state.currentView = view;
    renderPage();
}

function renderCalendarView() {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1);
    const totalDays = new Date(state.selectedYear, state.selectedMonth + 1, 0).getDate();
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const prevMonthTotalDays = new Date(state.selectedYear, state.selectedMonth, 0).getDate();

    let calendarCellsHtml = '';

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        calendarCellsHtml += `<div class="calendar-cell inactive"><span class="calendar-cell-num">${dayNum}</span></div>`;
    }

    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const isToday = today.getDate() === day && today.getMonth() === state.selectedMonth && today.getFullYear() === state.selectedYear;
        const dateStr = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayMeetings = state.meetings.filter(m => m.date === dateStr);

        let meetingsHtml = '';
        if (dayMeetings.length > 0) {
            meetingsHtml = `
                <div class="calendar-cell-meetings">
                    ${dayMeetings.map(m => `
                        <div class="calendar-meeting-item" onclick="event.stopPropagation(); editMeeting('${m.id}')" title="${m.title} (${m.time})">
                            ${m.time} ${m.title}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        calendarCellsHtml += `
            <div class="calendar-cell ${isToday ? 'today' : ''}" onclick="openAddModalWithDate('${dateStr}')">
                <span class="calendar-cell-num">${day}</span>
                ${meetingsHtml}
            </div>
        `;
    }

    const totalCells = startDayOfWeek + totalDays;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        calendarCellsHtml += `<div class="calendar-cell inactive"><span class="calendar-cell-num">${i}</span></div>`;
    }

    return `
        <div class="calendar-view-container fade-in">
            <div class="calendar-view-header">
                <h3>${monthNames[state.selectedMonth]} ${state.selectedYear}</h3>
                <div class="calendar-nav-controls">
                    <button class="calendar-nav-btn" onclick="navigateCalendar(-1)"><i class="fas fa-chevron-left"></i></button>
                    <button class="calendar-nav-btn" onclick="navigateCalendar(1)"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            
            <div class="calendar-grid-header">
                <div>Sen</div>
                <div>Sel</div>
                <div>Rab</div>
                <div>Kam</div>
                <div>Jum</div>
                <div>Sab</div>
                <div>Min</div>
            </div>
            
            <div class="calendar-grid-days">
                ${calendarCellsHtml}
            </div>
        </div>
    `;
}

function navigateCalendar(dir) {
    state.selectedMonth += dir;
    if (state.selectedMonth < 0) {
        state.selectedMonth = 11;
        state.selectedYear--;
    } else if (state.selectedMonth > 11) {
        state.selectedMonth = 0;
        state.selectedYear++;
    }
    renderPage();
}

function openAddModalWithDate(dateStr) {
    openAddModal();
    document.getElementById('date').value = dateStr;
}

async function renderAdminPage(container) {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
        setPage('home');
        return;
    }

    container.innerHTML = `
        <div class="admin-container">
            <div class="section-header">
                <h2>Admin Panel</h2>
            </div>
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
                <p style="margin-top: 1rem; color: var(--text-muted);">Memuat data admin...</p>
            </div>
        </div>
    `;

    try {
        const statsRes = await apiFetch('/admin/stats');
        const usersRes = await apiFetch('/admin/users');
        const meetingsRes = await apiFetch('/admin/meetings');

        const stats = statsRes.data || { totalUsers: 0, totalMeetings: 0 };
        const users = usersRes.data || [];
        const meetings = meetingsRes.data || [];

        let html = `
            <div class="admin-container fade-in">
                <div class="section-header">
                    <h2>Admin Panel</h2>
                </div>

                <!-- Stats Cards -->
                <div class="admin-stats">
                    <div class="admin-card">
                        <div class="admin-card-icon"><i class="fas fa-users"></i></div>
                        <div class="admin-card-info">
                            <h4>Total Pengguna</h4>
                            <span>${stats.totalUsers}</span>
                        </div>
                    </div>
                    <div class="admin-card">
                        <div class="admin-card-icon"><i class="fas fa-handshake"></i></div>
                        <div class="admin-card-info">
                            <h4>Total Rapat</h4>
                            <span>${stats.totalMeetings}</span>
                        </div>
                    </div>
                </div>

                <!-- User Management Table -->
                <div class="admin-table-section">
                    <h3>Manajemen Pengguna</h3>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Jabatan</th>
                                    <th>Role</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td><strong>${u.name}</strong></td>
                                        <td>${u.email}</td>
                                        <td>${u.position || '-'}</td>
                                        <td><span class="role-badge ${u.role}">${u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                                        <td>
                                            ${u.id === state.currentUser.id 
                                                ? '<span style="color: var(--text-muted); font-size: 0.85rem;">Anda Sendiri</span>' 
                                                : `<button class="btn-sm" onclick="toggleUserRole('${u.id}', '${u.role === 'admin' ? 'user' : 'admin'}')">
                                                    Ubah ke ${u.role === 'admin' ? 'User' : 'Admin'}
                                                   </button>`
                                            }
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Meetings Moderation Table -->
                <div class="admin-table-section">
                    <h3>Moderasi Notulensi Rapat</h3>
                    <div class="table-responsive">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Judul Rapat</th>
                                    <th>Tanggal & Waktu</th>
                                    <th>Lokasi</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${meetings.map(m => `
                                    <tr>
                                        <td><strong>${m.title}</strong></td>
                                        <td>${formatDate(m.date)} &bull; ${m.time}</td>
                                        <td>${m.location}</td>
                                        <td>
                                            <button class="btn-sm btn-sm-danger" onclick="adminDeleteMeeting('${m.id}')">
                                                <i class="fas fa-trash"></i> Hapus
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${meetings.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Tidak ada rapat dalam sistem.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

    } catch (err) {
        showToast(err.message, 'error');
        container.innerHTML = `
            <div class="admin-container">
                <div class="section-header">
                    <h2>Admin Panel</h2>
                </div>
                <div style="text-align: center; padding: 3rem; color: #E63946;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p>Gagal memuat data admin: ${err.message}</p>
                </div>
            </div>
        `;
    }
}

async function toggleUserRole(userId, newRole) {
    if (confirm(`Apakah Anda yakin ingin mengubah role pengguna ini menjadi ${newRole === 'admin' ? 'Admin' : 'User'}?`)) {
        try {
            await apiFetch(`/admin/users/${userId}/role`, {
                method: 'PUT',
                body: { role: newRole }
            });
            showToast('Role pengguna berhasil diubah', 'success');
            renderPage();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

async function adminDeleteMeeting(meetingId) {
    if (confirm('Apakah Anda yakin ingin menghapus rapat ini secara permanen sebagai Admin?')) {
        try {
            await apiFetch(`/admin/meetings/${meetingId}`, {
                method: 'DELETE'
            });
            showToast('Rapat berhasil dihapus oleh Admin', 'success');
            renderPage();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
}

function createMeetingCard(meeting) {
    const tagsHtml = meeting.tags && meeting.tags.length > 0 
        ? `<div class="meeting-tags">
            ${meeting.tags.map(t => `<span class="tag-badge ${getTagColorClass(t)}">${t}</span>`).join('')}
           </div>`
        : '';

    return `
        <div class="meeting-card fade-in" onclick="editMeeting('${meeting.id}')">
            <div class="card-header">
                <span class="card-date">${formatDate(meeting.date)} &bull; ${meeting.time}</span>
                <div class="card-actions">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
            </div>
            <h3>${meeting.title}</h3>
            ${tagsHtml}
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

function getTagColorClass(tag) {
    const lower = tag.toLowerCase();
    if (lower === 'proyek') return 'tag-proyek';
    if (lower === 'pemasaran') return 'tag-pemasaran';
    if (lower === 'evaluasi') return 'tag-evaluasi';
    if (lower === 'harian') return 'tag-harian';
    return 'tag-other';
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

    // Header Profile Trigger (pindah ke pojok kanan atas)
    const profileTrigger = document.getElementById('header-profile-trigger');
    if (profileTrigger) {
        profileTrigger.addEventListener('click', () => {
            setPage('profile');
        });
    }

    // Modal Tag pills click handlers
    document.querySelectorAll('#modal-tag-selector .tag-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const tag = pill.getAttribute('data-tag');
            if (state.selectedTags.includes(tag)) {
                state.selectedTags = state.selectedTags.filter(t => t !== tag);
                pill.classList.remove('active');
            } else {
                state.selectedTags.push(tag);
                pill.classList.add('active');
            }
        });
    });

    // Native Date & Time Picker showPicker trigger on focus/click
    const triggerPicker = function() {
        try {
            this.showPicker();
        } catch (e) {
            console.log("showPicker not supported");
        }
    };
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('click', triggerPicker);
        dateInput.addEventListener('focus', triggerPicker);
    }
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.addEventListener('click', triggerPicker);
        timeInput.addEventListener('focus', triggerPicker);
    }

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
    
    // Reset tags
    state.selectedTags = [];
    document.querySelectorAll('#modal-tag-selector .tag-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('custom-tags').value = '';

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

    const customTagsStr = document.getElementById('custom-tags').value;
    const customTags = customTagsStr 
        ? customTagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];
    const allTags = [...state.selectedTags, ...customTags];

    const meetingData = {
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        location: document.getElementById('location').value,
        description: document.getElementById('description').value,
        tags: allTags,
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

    // Set selected tags
    state.selectedTags = meeting.tags || [];
    const predefined = ["Proyek", "Pemasaran", "Evaluasi", "Harian"];
    
    document.querySelectorAll('#modal-tag-selector .tag-pill').forEach(p => {
        const tag = p.getAttribute('data-tag');
        if (state.selectedTags.includes(tag)) {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    const custom = state.selectedTags.filter(t => !predefined.includes(t));
    document.getElementById('custom-tags').value = custom.join(', ');

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

async function handleProfileUpdate(e) {
    e.preventDefault();
    const updatedData = {
        name: document.getElementById('profile-name').value,
        position: document.getElementById('profile-position').value,
        bio: document.getElementById('profile-bio').value,
        email: document.getElementById('profile-email').value,
        profileImagePath: state.currentUser.profileImagePath || ''
    };

    try {
        const res = await apiFetch(`/user/${state.currentUser.id}`, {
            method: 'PUT',
            body: updatedData
        });
        
        // Update local state and localStorage
        state.currentUser = res.data;
        saveUser();
        
        showToast('Profil berhasil diperbarui', 'success');
        updateUI();
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
