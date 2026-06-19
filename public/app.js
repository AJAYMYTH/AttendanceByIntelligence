let currentUser = null;
let currentToken = null;
let attendanceChart = null;
let individualChartInstance = null;

// Avatar color palettes for consistent student coloring
const avatarColors = [
  { class: 'avatar-blue', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { class: 'avatar-purple', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { class: 'avatar-green', gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  { class: 'avatar-amber', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { class: 'avatar-red', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)' },
  { class: 'avatar-teal', gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
];

function getAvatarColor(name) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-symbols-rounded toast-icon">${icons[type] || 'info'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close material-symbols-rounded" onclick="this.closest('.toast').classList.add('removing');setTimeout(()=>this.closest('.toast').remove(),300)">close</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    if (toast.isConnected) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/* ============================================================
   MODAL DIALOG SYSTEM
   ============================================================ */
function showModal({ title, desc, content, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, showCancel = true, variant = 'default' }) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  const bodyEl = document.getElementById('modal-body');
  const actionsEl = document.getElementById('modal-actions');

  titleEl.textContent = title || '';
  descEl.innerHTML = desc || '';
  bodyEl.innerHTML = content || '';
  actionsEl.innerHTML = '';

  if (showCancel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = () => { closeModal(); if (onCancel) onCancel(); };
    actionsEl.appendChild(cancelBtn);
  }
  const confirmBtn = document.createElement('button');
  confirmBtn.className = variant === 'danger' ? 'btn-danger' : 'btn';
  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => { closeModal(); if (onConfirm) onConfirm(); };
  actionsEl.appendChild(confirmBtn);

  overlay.classList.add('active');
  confirmBtn.focus();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { closeModal(); if (onCancel) onCancel(); }
  }, { once: true });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function showPrompt(title, desc, placeholder = '', onConfirm) {
  const content = `<input type="text" id="modal-prompt-input" class="modal-input" placeholder="${placeholder}" autofocus>`;
  showModal({
    title, desc, content,
    confirmText: 'Submit',
    onConfirm: () => {
      const val = document.getElementById('modal-prompt-input')?.value;
      if (val) onConfirm(val);
    }
  });
  setTimeout(() => document.getElementById('modal-prompt-input')?.focus(), 100);
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  document.getElementById('theme-icon').textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
  document.getElementById('theme-color-meta').content = next === 'dark' ? '#0f172a' : '#ffffff';
  localStorage.setItem('abi_theme', next);
}

function loadTheme() {
  const saved = localStorage.getItem('abi_theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').textContent = 'light_mode';
    document.getElementById('theme-color-meta').content = '#0f172a';
  }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function showDashboard() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('dashboard').classList.add('active');
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('passkey-verify-section').style.display = 'none';
  updateNavigationVisibility();
  window.scrollTo(0, 0);
  showTab('attendance');
}

function handleLogout() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('abi_token');
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('login-page').classList.add('active');
  window.scrollTo(0, 0);
  showToast('Signed out successfully', 'info');
}

function updateNavigationVisibility() {
  if (!currentUser) return;
  const isAdmin = currentUser.role === 'ADMIN';
  ['nav-admin', 'mobile-nav-admin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'flex' : 'none';
  });
}

function showTab(tab) {
  const searchStr = tab.toLowerCase();
  document.querySelectorAll('.sidebar-link, .mobile-nav-link').forEach(link => {
    const span = link.querySelector('span:not(.material-symbols-rounded)');
    link.classList.toggle('active', span?.textContent.toLowerCase() === searchStr);
  });

  const content = document.getElementById('tab-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(15px)';
  setTimeout(() => {
    showLoader('tab-content', 'Loading...');
    if (tab === 'attendance') renderAttendance();
    if (tab === 'students') renderStudents();
    if (tab === 'analytics') renderAnalytics();
    if (tab === 'admin') renderAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => {
      content.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  }, 200);
}

/* ============================================================
   LOADER
   ============================================================ */
function showLoader(elementId, message, type = 'spinner') {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (type === 'skeleton-list') {
    el.innerHTML = `<div class="fade-in">${Array(5).fill('<div class="skeleton-card"></div>').join('')}</div>`;
    return;
  }
  el.innerHTML = `<div class="loader-container"><div class="spinner"></div><p>${message}</p></div>`;
}

/* ============================================================
   LOGIN
   ============================================================ */
async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const uid = document.getElementById('uid').value.trim();
  const errorDiv = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-submit-btn');

  if (!username || !password || !uid) {
    errorDiv.textContent = 'All fields are required';
    errorDiv.style.display = 'block';
    return;
  }
  if (!/^G2TC-AS-\d{4}-[AS]$/.test(uid)) {
    errorDiv.textContent = 'Invalid UID format (G2TC-AS-1234-S)';
    errorDiv.style.display = 'block';
    return;
  }

  errorDiv.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.classList.add('btn-loading');
  loginBtn.textContent = 'Signing in...';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, uid })
    });
    const data = await response.json();

    if (response.ok) {
      if (data.passkey_required) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('passkey-verify-section').style.display = 'block';
        document.getElementById('passkey-username-display').textContent = data.username;
        document.getElementById('passkey-auth-btn').onclick = () => handlePasskeyLogin(data.user_id);
        document.getElementById('passkey-cancel-btn').onclick = () => {
          document.getElementById('login-form').style.display = 'block';
          document.getElementById('passkey-verify-section').style.display = 'none';
          resetLoginBtn(loginBtn);
        };
        return;
      }
      currentToken = data.token;
      currentUser = data.user;
      localStorage.setItem('abi_token', currentToken);
      showToast('Welcome back, ' + data.user.username, 'success');
      setTimeout(showDashboard, 400);
    } else {
      errorDiv.textContent = data.message;
      errorDiv.style.display = 'block';
      resetLoginBtn(loginBtn);
    }
  } catch (err) {
    errorDiv.textContent = 'Connection error. Please check your network.';
    errorDiv.style.display = 'block';
    resetLoginBtn(loginBtn);
  }
}

function resetLoginBtn(btn) {
  btn.disabled = false;
  btn.classList.remove('btn-loading');
  btn.innerHTML = 'Sign In <span class="material-symbols-rounded">arrow_forward</span>';
}

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  const token = localStorage.getItem('abi_token');
  if (token) currentToken = token;

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });
});

/* ============================================================
   ATTENDANCE TAB - Enhanced with individual student boxes
   ============================================================ */
function renderAttendance() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('tab-content').innerHTML = `
    <div class="tab-header">
      <h2><span class="material-symbols-rounded">calendar_today</span> Attendance</h2>
      <p>${today}</p>
    </div>
    <div class="card" style="padding: 20px 24px; margin-bottom: 24px; border: 1px solid var(--border);">
      <div class="form-group" style="margin-bottom: 0;">
        <label style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); font-weight: 600; margin-bottom: 10px; display: block;">Select Target Section</label>
        <select id="section-select" onchange="loadStudentsForAttendance()" style="padding: 14px 16px; font-size: 0.95rem;">
          <option value="">Choose a section...</option>
          <option value="1st Year DAIML">1st Year DAIML</option>
          <option value="2nd Year DAIML">2nd Year DAIML</option>
          <option value="3rd Year DAIML">3rd Year DAIML</option>
        </select>
      </div>
    </div>
    <div id="attendance-summary"></div>
    <div id="attendance-list"></div>
  `;
}

async function loadStudentsForAttendance() {
  const section = document.getElementById('section-select').value;
  if (!section) return;

  const summaryDiv = document.getElementById('attendance-summary');
  summaryDiv.innerHTML = '';

  // Create search section with enhanced styling
  let searchSection = document.getElementById('attendance-list').previousElementSibling;
  if (!searchSection || !searchSection.classList.contains('search-section')) {
    searchSection = document.createElement('div');
    searchSection.className = 'search-section';
    searchSection.id = 'student-search-wrapper';
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.parentNode.insertBefore(searchSection, attendanceList);
  }
  searchSection.innerHTML = `
    <div style="position: relative;">
      <span class="material-symbols-rounded" style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--text-tertiary); pointer-events: none;">search</span>
      <input type="text" id="student-search" placeholder="Search by student name or register number..." style="width: 100%; padding: 14px 18px 14px 50px; border-radius: 100px; border: 1px solid var(--border); background: var(--primary); font-size: 0.9rem; transition: all 0.2s ease;">
    </div>
  `;

  showLoader('attendance-list', 'Loading students...', 'skeleton-list');

  const encodedSection = encodeURIComponent(section);

  try {
    console.log('[Attendance] Loading students for section:', section);

    const response = await fetch(`/api/students?section=${encodedSection}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Attendance] Server error:', response.status, errorData);
      document.getElementById('attendance-list').innerHTML = `
        <p class="error-msg">
          <span class="material-symbols-rounded" style="margin-right: 8px;">error</span>
          Server error (${response.status}): ${errorData.message || 'Please try again'}
        </p>
      `;
      return;
    }

    const students = await response.json();
    console.log('[Attendance] Received', students.length, 'students');

    if (!students.length) {
      document.getElementById('attendance-list').innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">person_off</span>
          <h3>No Students Found</h3>
          <p>No students registered in this section yet.</p>
        </div>
      `;
      return;
    }

    const renderList = (data) => {
      const listDiv = document.getElementById('attendance-list');
      if (!data.length) {
        listDiv.innerHTML = `
          <div class="empty-state" style="padding: 48px;">
            <span class="material-symbols-rounded">search_off</span>
            <h3>No matches found</h3>
            <p>Try adjusting your search criteria.</p>
          </div>
        `;
        return;
      }

      listDiv.innerHTML = `
        <div style="display: grid; gap: 12px;">
          ${data.map((s, i) => {
            const color = getAvatarColor(s.name);
            const initials = getInitials(s.name);
            return `
              <div class="student-card" style="animation: listItem 0.4s ease ${i * 0.04}s forwards; opacity: 0;">
                <div class="student-info">
                  <div class="student-avatar ${color.class}" style="background: ${color.gradient};">
                    ${initials}
                  </div>
                  <div>
                    <div class="student-name">${escapeHtml(s.name)}</div>
                    <div class="student-reg">${s.register_number}</div>
                  </div>
                </div>
                <div class="attendance-toggle">
                  <label class="toggle-option">
                    <input type="radio" name="status-${s.id}" value="PRESENT" onchange="updateAttendanceCount()">
                    <span class="toggle-label present">PRESENT</span>
                  </label>
                  <label class="toggle-option">
                    <input type="radio" name="status-${s.id}" value="ABSENT" onchange="updateAttendanceCount()">
                    <span class="toggle-label absent">ABSENT</span>
                  </label>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border);">
          <button id="submit-btn" onclick="confirmAttendance('${section}')" class="btn-full" style="padding: 16px 24px; font-size: 1rem;">
            <span class="material-symbols-rounded">check_circle</span>
            Confirm Attendance
          </button>
        </div>
      `;
      updateAttendanceCount();
    };

    renderList(students);

    const searchInput = document.getElementById('student-search');
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      renderList(students.filter(s =>
        s.name.toLowerCase().includes(q) || s.register_number.toLowerCase().includes(q)
      ));
    };
  } catch (err) {
    document.getElementById('attendance-list').innerHTML = `
      <p class="error-msg" style="padding: 16px;">
        <span class="material-symbols-rounded" style="margin-right: 8px;">error</span>
        Failed to load students. Please check your connection.
      </p>
    `;
  }
}

function updateAttendanceCount() {
  const cards = document.querySelectorAll('.student-card');
  const total = cards.length;
  const present = document.querySelectorAll('input[value="PRESENT"]:checked').length;
  const absent = document.querySelectorAll('input[value="ABSENT"]:checked').length;
  const summaryDiv = document.getElementById('attendance-summary');

  if (total === 0) return;

  let grid = summaryDiv.querySelector('.summary-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'summary-grid';
    summaryDiv.appendChild(grid);
  }

  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  grid.innerHTML = `
    <div class="summary-item">
      <div class="summary-icon"><span class="material-symbols-rounded">groups</span></div>
      <span class="summary-val">${total}</span>
      <span class="summary-label">Total Students</span>
    </div>
    <div class="summary-item">
      <div class="summary-icon"><span class="material-symbols-rounded">check_circle</span></div>
      <span class="summary-val">${present}</span>
      <span class="summary-label">Present</span>
    </div>
    <div class="summary-item">
      <div class="summary-icon"><span class="material-symbols-rounded">cancel</span></div>
      <span class="summary-val">${absent}</span>
      <span class="summary-label">Absent</span>
    </div>
  `;
}

async function confirmAttendance(section) {
  const cards = document.querySelectorAll('.student-card');
  const records = [];
  const absentees = [];

  cards.forEach(card => {
    const checkedInput = card.querySelector('input:checked');
    const status = checkedInput?.value;
    const studentId = card.querySelector('input')?.name.replace('status-', '');
    if (status && studentId) {
      records.push({ student_id: studentId, status });
      if (status === 'ABSENT') {
        const nameEl = card.querySelector('.student-name');
        const regEl = card.querySelector('.student-reg');
        absentees.push({
          name: nameEl?.textContent.trim() || 'Unknown',
          reg: regEl?.textContent.trim() || ''
        });
      }
    }
  });

  if (records.length < cards.length) {
    showToast('Please mark attendance for all students before submission.', 'warning');
    return;
  }

  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Submitting...';

  try {
    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
      body: JSON.stringify({ records, section })
    });
    const data = await response.json();

    if (response.ok) {
      showToast(`Attendance logged successfully! ${records.length} records saved.`, 'success');
      btn.innerHTML = '<span class="material-symbols-rounded">check_circle</span> Submitted Successfully';

      if (data.whatsappUrl) {
        setTimeout(() => {
          showModal({
            title: 'Share Absentee List?',
            desc: `${absentees.length} student(s) marked absent. Share the list via WhatsApp?`,
            confirmText: 'Share on WhatsApp',
            cancelText: 'No, thanks',
            onConfirm: () => {
              const win = window.open(data.whatsappUrl, '_blank');
              if (!win) showToast('Pop-up blocked. Allow pop-ups for WhatsApp sharing.', 'warning');
              renderAttendance();
            },
            onCancel: () => renderAttendance()
          });
        }, 500);
      } else {
        showToast('No absentees to report.', 'info');
        setTimeout(renderAttendance, 1000);
      }
    } else {
      throw new Error(data.message || 'Submission failed');
    }
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    btn.innerHTML = '<span class="material-symbols-rounded">refresh</span> Try Again';
  }
}

/* ============================================================
   STUDENTS TAB
   ============================================================ */
function renderStudents() {
  document.getElementById('tab-content').innerHTML = `
    <div class="tab-header">
      <h2><span class="material-symbols-rounded">group</span> Students</h2>
      <p>Comprehensive student database management</p>
    </div>
    <div class="grid-2" style="margin-bottom: 24px;">
      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-blue);">person_add</span> Manual Enrollment</h4>
        <div class="form-group"><label>Full Name</label><input type="text" id="s-name" placeholder="Enter student full name"></div>
        <div class="form-group"><label>Register Number</label><input type="text" id="s-reg" placeholder="e.g. 2023CS001"></div>
        <div class="form-group"><label>Assigned Section</label>
          <select id="section-select-add">
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
          </select>
        </div>
        <button onclick="addStudentManual()" class="btn-full" style="margin-top: 8px;">Register Student</button>
      </div>
      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-green);">upload_file</span> Bulk Import</h4>
        <p class="card-subtitle" style="margin-bottom: 14px;">Supports .xlsx or .xls files with student data</p>
        <div class="caution-box">
          <span class="material-symbols-rounded">info</span>
          <p>Required columns: "Student Name" & "Register Number"</p>
        </div>
        <div class="form-group"><label>Target Section</label>
          <select id="section-select-manage">
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
          </select>
        </div>
        <input type="file" id="excel-file" accept=".xlsx, .xls" class="w-full" style="margin-bottom: 14px; padding: 12px;">
        <button class="btn-secondary btn-full" onclick="uploadExcel()">Execute Import</button>
      </div>
    </div>
    <div style="margin-top: 20px;">
      <div class="flex items-center justify-between" style="margin-bottom: 20px;">
        <h3 style="font-family: var(--font-heading); font-size: 1.2rem; font-weight: 600;">Registry Browser</h3>
        <select id="section-view-manage" onchange="loadStudentsForManagement()" style="width: auto; min-width: 200px; padding: 12px 16px;">
          <option value="">Select Section</option>
          <option value="1st Year DAIML">1st Year DAIML</option>
          <option value="2nd Year DAIML">2nd Year DAIML</option>
          <option value="3rd Year DAIML">3rd Year DAIML</option>
        </select>
      </div>
      <div id="student-manage-list"></div>
    </div>
  `;
}

async function loadStudentsForManagement() {
  const section = document.getElementById('section-view-manage').value;
  const container = document.getElementById('student-manage-list');
  if (!section) {
    container.innerHTML = '';
    return;
  }

  showLoader('student-manage-list', 'Loading students...');

  const encodedSection = encodeURIComponent(section);

  try {
    const response = await fetch(`/api/students?section=${encodedSection}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Students] Server error:', response.status, errorData);
      container.innerHTML = `<p class="error-msg">Server error: ${errorData.message || response.status}</p>`;
      return;
    }

    const students = await response.json();
    console.log('[Students] Received', students.length, 'students');

    if (!students.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">person_off</span>
          <h3>No Records</h3>
          <p>No students registered in this section.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = students.map((s, i) => {
      const color = getAvatarColor(s.name);
      const initials = getInitials(s.name);
      return `
        <div class="student-card" style="animation: listItem 0.4s ease ${i * 0.03}s forwards; opacity: 0;">
          <div class="student-info">
            <div class="student-avatar ${color.class}" style="background: ${color.gradient};">
              ${initials}
            </div>
            <div>
              <div class="student-name">${escapeHtml(s.name)}</div>
              <div class="student-reg">${s.register_number}</div>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-sm btn-danger" onclick="deleteStudent('${s.id}','${escapeHtml(s.name)}')">
              <span class="material-symbols-rounded" style="font-size: 16px;">delete</span> Remove
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Failed to load student list.</p>';
  }
}

async function deleteStudent(id, name) {
  showModal({
    title: 'Remove Student?',
    desc: `You are about to permanently delete <strong>${escapeHtml(name)}</strong> from the registry. This action cannot be undone.`,
    confirmText: 'Delete',
    variant: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(`/api/students/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
          showToast(`${name} removed successfully.`, 'success');
          loadStudentsForManagement();
        } else {
          showToast('Operation denied.', 'error');
        }
      } catch (err) {
        showToast('Failed to remove student.', 'error');
      }
    }
  });
}

async function uploadExcel() {
  const fileInput = document.getElementById('excel-file');
  const section = document.getElementById('section-select-manage')?.value;
  if (!fileInput.files[0] || !section) {
    showToast('Please select a file and target section.', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('section', section);

  const btn = fileInput.nextElementSibling;
  if (btn) { btn.disabled = true; btn.classList.add('btn-loading'); btn.textContent = 'Importing...'; }

  try {
    const response = await fetch('/api/students/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` },
      body: formData
    });
    const data = await response.json();
    if (response.ok) {
      showToast(`Import successful: ${data.count} records added.`, 'success');
      showTab('students');
    } else {
      showToast('Import failed: ' + data.message, 'error');
    }
  } catch (err) {
    showToast('Upload failed. Check file format.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('btn-loading'); btn.textContent = 'Execute Import'; }
  }
}

async function addStudentManual() {
  const name = document.getElementById('s-name').value.trim();
  const register_number = document.getElementById('s-reg').value.trim();
  const section = document.getElementById('section-select-add').value;

  if (!name || !register_number) {
    showToast('Please fill all required fields.', 'warning');
    return;
  }

  try {
    const response = await fetch('/api/students/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
      body: JSON.stringify({ name, register_number, section })
    });
    if (response.ok) {
      showToast(`${name} registered successfully.`, 'success');
      showTab('students');
    } else {
      const data = await response.json();
      showToast(data.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Server unreachable.', 'error');
  }
}

/* ============================================================
   ANALYTICS TAB - Enhanced with detailed analysis
   ============================================================ */
function renderAnalytics() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  document.getElementById('tab-content').innerHTML = `
    <div class="tab-header">
      <h2><span class="material-symbols-rounded">insights</span> Analytics</h2>
      <p>Detailed attendance analysis and reporting</p>
    </div>

    <div class="analytics-mode-toggle">
      <button id="btn-class-analytics" class="btn" onclick="switchAnalyticsMode('class')">
        <span class="material-symbols-rounded">groups</span> Class Analytics
      </button>
      <button id="btn-individual-analytics" class="btn-secondary" onclick="switchAnalyticsMode('individual')">
        <span class="material-symbols-rounded">person</span> Individual Report
      </button>
    </div>

    <div id="class-analytics-section">
      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-blue);">tune</span> Report Configuration</h4>
        <div class="form-group">
          <label>Select Section</label>
          <select id="section-select-analytics">
            <option value="">All Sections</option>
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
          </select>
        </div>
        <div class="date-range-grid">
          <div class="form-group">
            <label>From Date</label>
            <input type="date" id="start-date" value="${thirtyDaysAgo}">
          </div>
          <div class="form-group">
            <label>To Date</label>
            <input type="date" id="end-date" value="${today}">
          </div>
        </div>
        <button onclick="fetchAndDisplayReport()" class="btn-full" style="margin-top: 8px;">
          <span class="material-symbols-rounded">analytics</span> Generate Report
        </button>

        <div class="export-buttons" style="margin-top: 20px;">
          <button class="btn-secondary" onclick="downloadReport()" style="flex: 1; min-width: 160px;">
            <span class="material-symbols-rounded">download</span> Download CSV
          </button>
          <button id="class-export-advanced" class="btn-secondary" onclick="downloadOpenPyxlReport()" style="flex: 1; min-width: 160px;">
            <span class="material-symbols-rounded">table_view</span> Export Excel
          </button>
          <button id="class-export-all" class="btn-secondary" onclick="downloadAllClassMonthlyReport()" style="flex: 1; min-width: 160px;">
            <span class="material-symbols-rounded">library_add</span> Export All
          </button>
        </div>
      </div>

      <div id="chart-section" class="chart-container" style="display: none;">
        <h4 style="margin-bottom: 16px; font-family: var(--font-heading);">Attendance Trend</h4>
        <canvas id="attendanceChart"></canvas>
      </div>

      <div id="report-container" class="mt-4"></div>
    </div>

    <div id="individual-analytics-section" style="display: none;">
      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-purple);">person_search</span> Individual Attendance Report</h4>

        <div class="form-group">
          <label>Select Section</label>
          <select id="section-select-individual" onchange="loadStudentsForIndividualReport()">
            <option value="">Select Target Section</option>
            <option value="1st Year DAIML">1st Year DAIML</option>
            <option value="2nd Year DAIML">2nd Year DAIML</option>
            <option value="3rd Year DAIML">3rd Year DAIML</option>
          </select>
        </div>

        <div class="form-group" id="student-dropdown-container" style="display: none;">
          <label>Select Student</label>
          <select id="student-select-individual" onchange="fetchAndDisplayIndividualReport()" style="padding: 14px 16px;">
            <option value="">Choose a student...</option>
          </select>
        </div>

        <div class="export-buttons" id="individual-export-btns" style="display: none; margin-top: 16px;">
          <button id="export-pdf-btn" class="btn-secondary" onclick="exportIndividualReportPDF()" style="flex: 1;">
            <span class="material-symbols-rounded">picture_as_pdf</span> Export PDF
          </button>
          <button id="export-excel-individual-btn" class="btn-secondary" onclick="downloadIndividualExcelReport()" style="flex: 1;">
            <span class="material-symbols-rounded">table_chart</span> Export Excel
          </button>
        </div>
      </div>

      <div id="individual-report-container"></div>
    </div>
  `;
}

function switchAnalyticsMode(mode) {
  const classSection = document.getElementById('class-analytics-section');
  const indSection = document.getElementById('individual-analytics-section');
  const btnClass = document.getElementById('btn-class-analytics');
  const btnInd = document.getElementById('btn-individual-analytics');

  if (mode === 'class') {
    classSection.style.display = 'block';
    indSection.style.display = 'none';
    btnClass.className = 'btn';
    btnInd.className = 'btn-secondary';
  } else {
    classSection.style.display = 'none';
    indSection.style.display = 'block';
    btnClass.className = 'btn-secondary';
    btnInd.className = 'btn';
  }
}

async function fetchAndDisplayReport() {
  const section = document.getElementById('section-select-analytics').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const container = document.getElementById('report-container');

  showLoader('report-container', 'Compiling analytics...');

  try {
    const url = `/api/attendance/analytics?section=${section}&startDate=${startDate}&endDate=${endDate}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
    const data = await response.json();

    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">bar_chart</span>
          <h3>No Data Available</h3>
          <p>No attendance activity detected for this date range and section.</p>
        </div>
      `;
      return;
    }

    const dates = [...new Set(data.map(r => r.attendance_date))].sort();
    const students = {};
    data.forEach(r => {
      if (!students[r.student_id]) {
        students[r.student_id] = { name: r.student?.name || 'Unknown', reg: r.student?.register_number || '', logs: {} };
      }
      students[r.student_id].logs[r.attendance_date] = r.status;
    });

    const sorted = Object.values(students).sort((a, b) => a.name.localeCompare(b.name));

    // Calculate statistics
    const totalRecords = data.length;
    const presentCount = data.filter(r => r.status === 'PRESENT').length;
    const absentCount = data.filter(r => r.status === 'ABSENT').length;
    const overallRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

    container.innerHTML = `
      <div class="analytics-stats-grid" style="margin-bottom: 24px;">
        <div class="analytics-stat-item">
          <div class="analytics-stat-value" style="color: var(--accent-blue);">${dates.length}</div>
          <div class="analytics-stat-label">Days Tracked</div>
        </div>
        <div class="analytics-stat-item">
          <div class="analytics-stat-value" style="color: var(--accent-green);">${presentCount}</div>
          <div class="analytics-stat-label">Total Present</div>
        </div>
        <div class="analytics-stat-item">
          <div class="analytics-stat-value" style="color: var(--accent-red);">${absentCount}</div>
          <div class="analytics-stat-label">Total Absent</div>
        </div>
        <div class="analytics-stat-item">
          <div class="analytics-stat-value">${sorted.length}</div>
          <div class="analytics-stat-label">Students</div>
        </div>
        <div class="analytics-stat-item">
          <div class="analytics-stat-value" style="color: ${overallRate >= 75 ? 'var(--accent-green)' : 'var(--accent-red)'};">${overallRate}%</div>
          <div class="analytics-stat-label">Overall Rate</div>
        </div>
      </div>

      <div class="analytics-matrix-wrapper">
        <div style="overflow-x: auto;">
          <table class="matrix-table-modern">
            <thead>
              <tr>
                <th style="min-width: 180px;">Student</th>
                <th>Reg. No.</th>
                ${dates.map(d => `<th style="text-align: center;">${formatDateHeader(d)}</th>`).join('')}
                <th style="text-align: center;">Present</th>
                <th style="text-align: center;">Absent</th>
                <th style="text-align: center;">Rate</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(s => {
                const color = getAvatarColor(s.name);
                const initials = getInitials(s.name);
                const present = Object.values(s.logs).filter(v => v === 'PRESENT').length;
                const absent = Object.values(s.logs).filter(v => v === 'ABSENT').length;
                const rate = dates.length > 0 ? ((present / dates.length) * 100).toFixed(0) : 0;
                const rateClass = rate >= 75 ? 'badge-present' : rate >= 50 ? 'badge-empty' : 'badge-absent';
                return `<tr>
                  <td>
                    <div class="matrix-student-name">
                      <div class="matrix-avatar" style="background: ${color.gradient};">${initials}</div>
                      <span>${escapeHtml(s.name)}</span>
                    </div>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">${s.reg}</td>
                  ${dates.map(d => {
                    const st = s.logs[d];
                    if (st === 'PRESENT') return `<td style="text-align: center;"><span class="badge badge-present">P</span></td>`;
                    if (st === 'ABSENT') return `<td style="text-align: center;"><span class="badge badge-absent">A</span></td>`;
                    return `<td style="text-align: center;"><span class="badge badge-empty">-</span></td>`;
                  }).join('')}
                  <td style="text-align: center; font-weight: 600; color: var(--accent-green);">${present}</td>
                  <td style="text-align: center; font-weight: 600; color: var(--accent-red);">${absent}</td>
                  <td style="text-align: center;"><span class="badge ${rateClass}">${rate}%</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('chart-section').style.display = 'block';
    renderAttendanceChart(dates, data);
  } catch (err) {
    container.innerHTML = `
      <p class="error-msg">
        <span class="material-symbols-rounded" style="margin-right: 8px;">error</span>
        Failed to generate report. Please try again.
      </p>
    `;
  }
}

function formatDateHeader(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderAttendanceChart(dates, data) {
  const ctx = document.getElementById('attendanceChart')?.getContext('2d');
  if (!ctx) return;
  if (attendanceChart) attendanceChart.destroy();

  const stats = dates.map(d => {
    const dayData = data.filter(r => r.attendance_date === d);
    return {
      date: d,
      present: dayData.filter(r => r.status === 'PRESENT').length,
      absent: dayData.filter(r => r.status === 'ABSENT').length
    };
  });

  attendanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates.map(d => formatDateHeader(d)),
      datasets: [
        {
          label: 'Present',
          data: stats.map(s => s.present),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Absent',
          data: stats.map(s => s.absent),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: "'Inter', sans-serif" },
          bodyFont: { family: "'Inter', sans-serif" },
          cornerRadius: 8,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: "'Inter', sans-serif", size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        }
      }
    }
  });
}

async function downloadReport() {
  const section = document.getElementById('section-select-analytics').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  window.open(`/api/attendance/report?section=${section}&startDate=${startDate}&endDate=${endDate}&token=${currentToken}`, '_blank');
}

/* ============================================================
   INDIVIDUAL ANALYTICS
   ============================================================ */
async function loadStudentsForIndividualReport() {
  const section = document.getElementById('section-select-individual').value;
  const container = document.getElementById('student-dropdown-container');
  const select = document.getElementById('student-select-individual');
  const exportBtns = document.getElementById('individual-export-btns');
  document.getElementById('individual-report-container').innerHTML = '';
  if (exportBtns) exportBtns.style.display = 'none';

  if (!section) {
    container.style.display = 'none';
    return;
  }

  const encodedSection = encodeURIComponent(section);

  try {
    const response = await fetch(`/api/students?section=${encodedSection}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Analytics] Server error:', response.status, errorData);
      showToast('Failed to load students: ' + (errorData.message || response.status), 'error');
      return;
    }

    const students = await response.json();
    console.log('[Analytics] Received', students.length, 'students');
    if (!students.length) {
      container.style.display = 'none';
      showToast('No students found in this section.', 'info');
      return;
    }

    // Sort by name
    students.sort((a, b) => a.name.localeCompare(b.name));

    select.innerHTML = '<option value="">Choose a student...</option>' +
      students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.register_number})</option>`).join('');
    container.style.display = 'block';
  } catch (err) {
    showToast('Failed to load students.', 'error');
  }
}

async function fetchAndDisplayIndividualReport() {
  const studentId = document.getElementById('student-select-individual').value;
  const container = document.getElementById('individual-report-container');
  const exportBtns = document.getElementById('individual-export-btns');

  if (!studentId) {
    container.innerHTML = '';
    if (exportBtns) exportBtns.style.display = 'none';
    return;
  }

  showLoader('individual-report-container', 'Compiling individual report...');

  try {
    const response = await fetch(`/api/attendance/student/${studentId}`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p class="error-msg">${data.message || 'Failed to generate report'}</p>`;
      if (exportBtns) exportBtns.style.display = 'none';
      return;
    }

    const student = data.student;
    const records = data.attendance || [];

    if (!records.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-rounded">receipt_long</span>
          <h3>No Records Found</h3>
          <p>No attendance records found for this student.</p>
        </div>
      `;
      if (exportBtns) exportBtns.style.display = 'none';
      return;
    }

    // Sort records by date
    records.sort((a, b) => new Date(b.attendance_date) - new Date(a.attendance_date));

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length
    };
    const percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;

    let percentageClass = 'percentage-good';
    if (percentage < 75) percentageClass = 'percentage-danger';
    else if (percentage < 85) percentageClass = 'percentage-warning';

    const color = getAvatarColor(student.name);
    const initials = getInitials(student.name);

    container.innerHTML = `
      <div id="export-target">
        <div class="individual-report-header">
          <div class="individual-report-avatar" style="background: ${color.gradient}; color: #fff;">
            ${initials}
          </div>
          <div class="individual-report-info">
            <h3>${escapeHtml(student.name)}</h3>
            <p><span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">badge</span> ${student.register_number}</p>
            <p><span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">school</span> ${student.section}</p>
          </div>
          <div style="margin-left: auto; text-align: right;">
            <div class="percentage-display ${percentageClass}">${percentage}%</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Attendance Rate</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: 24px;">
          <div class="analytics-card">
            <h4 style="margin-bottom: 16px; font-size: 1rem;">
              <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 8px; color: var(--accent-green);">check_circle</span>
              Present Days
            </h4>
            <div class="analytics-stat-value" style="color: var(--accent-green); font-size: 2.5rem;">${stats.present}</div>
            <div class="analytics-stat-label">Days attended</div>
          </div>
          <div class="analytics-card">
            <h4 style="margin-bottom: 16px; font-size: 1rem;">
              <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 8px; color: var(--accent-red);">cancel</span>
              Absent Days
            </h4>
            <div class="analytics-stat-value" style="color: var(--accent-red); font-size: 2.5rem;">${stats.absent}</div>
            <div class="analytics-stat-label">Days missed</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="analytics-card">
            <h4 style="margin-bottom: 16px; font-size: 1rem;">
              <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 8px; color: var(--accent-blue);">pie_chart</span>
              Attendance Distribution
            </h4>
            <div style="height: 220px; position: relative;">
              <canvas id="individualPieChart"></canvas>
            </div>
          </div>
          <div class="analytics-card">
            <h4 style="margin-bottom: 16px; font-size: 1rem;">
              <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 8px; color: var(--accent-purple);">history</span>
              Recent Activity
            </h4>
            <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-md);">
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${records.slice(0, 25).map(r => `
                  <li style="padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
                    <span style="color: var(--text-secondary);">${formatDateHeader(r.attendance_date)}</span>
                    <span class="badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}">${r.status}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        </div>

        <div class="analytics-card" style="margin-top: 20px;">
          <h4 style="margin-bottom: 16px; font-size: 1rem;">
            <span class="material-symbols-rounded" style="vertical-align: middle; margin-right: 8px; color: var(--accent-amber);">warning</span>
            Attendance Threshold
          </h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">
            ${percentage >= 75 ? 'Student is meeting the minimum 75% attendance requirement.' : 'Student is below the required 75% attendance threshold. Action recommended.'}
          </p>
          <div style="background: var(--secondary); border-radius: 8px; padding: 4px;">
            <div style="width: ${Math.min(percentage, 100)}%; height: 24px; background: ${percentage >= 75 ? 'linear-gradient(90deg, var(--accent-green), #34d399)' : 'linear-gradient(90deg, var(--accent-red), #f87171)'}; border-radius: 6px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; min-width: 30px;">
              <span style="color: #fff; font-size: 0.75rem; font-weight: 700;">${percentage}%</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.7rem; color: var(--text-tertiary);">
            <span>0%</span>
            <span>75% Required</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    `;

    renderIndividualPieChart(stats.present, stats.absent);
    if (exportBtns) exportBtns.style.display = 'flex';
  } catch (err) {
    container.innerHTML = `
      <p class="error-msg">
        <span class="material-symbols-rounded" style="margin-right: 8px;">error</span>
        Report generation failed. Please try again.
      </p>
    `;
    if (exportBtns) exportBtns.style.display = 'none';
  }
}

function renderIndividualPieChart(present, absent) {
  const ctx = document.getElementById('individualPieChart')?.getContext('2d');
  if (!ctx) return;
  if (individualChartInstance) individualChartInstance.destroy();
  individualChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Present', 'Absent'],
      datasets: [{
        data: [present, absent],
        backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        }
      }
    }
  });
}

function exportIndividualReportPDF() {
  const element = document.getElementById('export-target');
  if (!element) {
    showToast('Please generate a report first.', 'warning');
    return;
  }

  const btn = document.getElementById('export-pdf-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Generating...';

  const { jsPDF } = window.jspdf;
  html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    .then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const select = document.getElementById('student-select-individual');
      const name = select?.options[select.selectedIndex]?.text?.split(' (')[0] || 'Student';
      pdf.save(`Attendance_Report_${name}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('PDF exported successfully.', 'success');
    })
    .catch(() => showToast('Failed to generate PDF.', 'error'))
    .finally(() => {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-rounded">picture_as_pdf</span> Export PDF';
    });
}

async function downloadOpenPyxlReport() {
  const section = document.getElementById('section-select-analytics').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const btn = document.getElementById('class-export-advanced');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Exporting...';
  }

  try {
    const url = `/api/attendance/export-openpyxl?section=${encodeURIComponent(section)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Analytics] Export error:', response.status, errorData);
      showToast('Export failed: ' + (errorData.message || response.status), 'error');
      return;
    }
    const blob = await response.blob();
    downloadBlob(blob, `Class_Analytics_${section || 'All'}_${startDate}_to_${endDate}.xlsx`);
    showToast('Export downloaded successfully.', 'success');
  } catch (err) {
    console.error('[Analytics] Export error:', err);
    showToast('Export failed. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.innerHTML = '<span class="material-symbols-rounded">table_view</span> Export Excel';
    }
  }
}

async function downloadAllClassMonthlyReport() {
  const section = document.getElementById('section-select-analytics').value;
  const btn = document.getElementById('class-export-all');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Exporting...';
  }

  try {
    const url = `/api/attendance/export-openpyxl?section=${encodeURIComponent(section)}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${currentToken}` } });
    if (!response.ok) {
      showToast('Failed to generate export.', 'error');
      return;
    }
    const blob = await response.blob();
    downloadBlob(blob, `Class_AllData_${section || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Export downloaded successfully.', 'success');
  } catch (err) {
    showToast('Export failed. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.innerHTML = '<span class="material-symbols-rounded">library_add</span> Export All';
    }
  }
}

async function downloadIndividualExcelReport() {
  const studentId = document.getElementById('student-select-individual').value;
  if (!studentId) return;
  const btn = document.getElementById('export-excel-individual-btn');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Exporting...';
  }

  try {
    const response = await fetch(`/api/attendance/student/${studentId}/export`, {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!response.ok) {
      showToast('Failed to generate export.', 'error');
      return;
    }
    const blob = await response.blob();
    downloadBlob(blob, `Individual_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Export downloaded successfully.', 'success');
  } catch (err) {
    showToast('Export failed. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.innerHTML = '<span class="material-symbols-rounded">table_chart</span> Export Excel';
    }
  }
}

function downloadBlob(blob, defaultName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

/* ============================================================
   ADMIN TAB
   ============================================================ */
function renderAdmin() {
  if (currentUser?.role !== 'ADMIN') {
    document.getElementById('tab-content').innerHTML = `
      <div class="empty-state" style="padding: 100px;">
        <span class="material-symbols-rounded" style="font-size: 80px; color: var(--accent-red); opacity: 0.6;">lock</span>
        <h3>Access Denied</h3>
        <p>Administrator privileges required to access this area.</p>
      </div>
    `;
    return;
  }

  document.getElementById('tab-content').innerHTML = `
    <div class="tab-header">
      <h2><span class="material-symbols-rounded">admin_panel_settings</span> Admin</h2>
      <p>Security, access control & user management</p>
    </div>

    <div class="grid-2">
      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-blue);">person_add</span> Authorize New User</h4>
        <div class="form-group"><label>Username</label><input type="text" id="new-username" placeholder="Enter username"></div>
        <div class="form-group"><label>Security Key</label><input type="password" id="new-password" placeholder="Minimum 4 characters"></div>
        <div class="form-group"><label>Role</label>
          <select id="new-role">
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        <div class="form-group"><label>UID (Optional)</label><input type="text" id="new-uid" placeholder="Auto-generated if empty"></div>
        <button onclick="createNewUser()" class="btn-full" style="margin-top: 8px;">Grant Access</button>
      </div>

      <div class="management-card">
        <h4><span class="material-symbols-rounded" style="color: var(--accent-purple);">fingerprint</span> Device Passkeys</h4>
        <p class="card-subtitle" style="margin-bottom: 14px;">Register this device for biometric login.</p>
        <div class="form-group"><label>Device Name</label><input type="text" id="reg-device-name" placeholder="e.g. My Laptop"></div>
        <button class="btn-secondary btn-full" onclick="registerPasskey()">Register This Device</button>
        <div id="device-list-container" class="mt-4"></div>
      </div>
    </div>

    <div class="card mt-4">
      <h4 style="margin-bottom: 20px;">Authorized Users</h4>
      <div id="user-list-container"></div>
    </div>
  `;
  loadUsers();
}

async function loadUsers() {
  const container = document.getElementById('user-list-container');
  showLoader('user-list-container', 'Loading users...');

  try {
    const response = await fetch('/api/auth/users', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const users = await response.json();

    if (!users.length) {
      container.innerHTML = `<div class="empty-state" style="padding: 32px;"><p>No users found.</p></div>`;
      return;
    }

    container.innerHTML = users.map(u => {
      const color = getAvatarColor(u.username);
      const initials = getInitials(u.username);
      return `
        <div class="student-card">
          <div class="student-info">
            <div class="student-avatar ${color.class}" style="background: ${color.gradient};">
              ${initials}
            </div>
            <div>
              <div class="student-name">${escapeHtml(u.username)}</div>
              <div class="student-reg">
                <span class="badge ${u.role === 'ADMIN' ? 'badge-present' : 'badge-empty'}">${u.role}</span>
                <span style="margin-left: 8px;">UID: ${u.uid}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn-sm btn-secondary" onclick="changePassword('${u.id}')">
              <span class="material-symbols-rounded" style="font-size: 14px;">key</span> Reset Key
            </button>
            ${u.username !== currentUser?.username ? `
              <button class="btn-sm btn-danger" onclick="deleteUser('${u.id}','${escapeHtml(u.username)}')">
                <span class="material-symbols-rounded" style="font-size: 14px;">delete</span> Revoke
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Failed to load users.</p>';
  }
  loadDevices();
}

async function loadDevices() {
  const container = document.getElementById('device-list-container');
  if (!container) return;
  container.innerHTML = '<div class="loader-container" style="padding: 24px;"><div class="spinner"></div><p>Loading devices...</p></div>';

  try {
    const response = await fetch('/api/auth/passkey/devices', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const devices = await response.json();

    if (!devices.length) {
      container.innerHTML = '<p class="card-subtitle">No devices registered.</p>';
      return;
    }

    container.innerHTML = `
      <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr style="border-bottom: 2px solid var(--border); text-align: left;">
            <th style="padding: 12px 8px;">Device</th>
            <th style="padding: 12px 8px;">Registered</th>
            <th style="padding: 12px 8px;"></th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(d => `
            <tr style="border-bottom: 1px solid var(--border);">
              <td style="padding: 12px 8px; display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-rounded" style="font-size: 18px; color: var(--accent-blue);">devices</span>
                ${escapeHtml(d.device_name)}
              </td>
              <td style="padding: 12px 8px; color: var(--text-secondary);">${new Date(d.created_at).toLocaleDateString()}</td>
              <td style="padding: 12px 8px;">
                <button class="btn-sm btn-danger" onclick="revokeDevice('${d.id}')">Revoke</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Failed to load devices.</p>';
  }
}

async function revokeDevice(id) {
  showModal({
    title: 'Revoke Device?',
    desc: 'You will no longer be able to use this device for biometric login. This action cannot be undone.',
    confirmText: 'Revoke',
    variant: 'danger',
    onConfirm: async () => {
      try {
        const response = await fetch(`/api/auth/passkey/devices/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
          showToast('Device revoked successfully.', 'info');
          loadDevices();
        }
      } catch {
        showToast('Failed to revoke device.', 'error');
      }
    }
  });
}

async function changePassword(id) {
  showPrompt('Reset Security Key', 'Enter the new security key for this user.', 'New security key', async (newPass) => {
    if (newPass.length < 4) {
      showToast('Security key must be at least 4 characters.', 'warning');
      return;
    }
    try {
      const response = await fetch(`/api/auth/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify({ password: newPass })
      });
      if (response.ok) showToast('Security key updated.', 'success');
      else showToast('Failed to update key.', 'error');
    } catch {
      showToast('Operation failed.', 'error');
    }
  });
}

async function deleteUser(id, username) {
  showModal({
    title: 'Revoke User?',
    desc: `Permanently revoke access for <strong>${escapeHtml(username)}</strong>? This action cannot be undone.`,
    confirmText: 'Revoke',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await fetch(`/api/auth/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        showToast(`${username} access revoked.`, 'info');
        loadUsers();
      } catch {
        showToast('Operation failed.', 'error');
      }
    }
  });
}

async function createNewUser() {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  const role = document.getElementById('new-role').value;
  const uid = document.getElementById('new-uid').value.trim();

  if (!username || !password) {
    showToast('Username and security key are required.', 'warning');
    return;
  }
  if (password.length < 4) {
    showToast('Security key must be at least 4 characters.', 'warning');
    return;
  }

  const btn = document.querySelector('#new-uid + button');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Creating...';
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
      body: JSON.stringify({ username, password, role, uid })
    });
    if (response.ok) {
      showToast(`${username} granted ${role} access.`, 'success');
      renderAdmin();
    } else {
      const data = await response.json();
      showToast(data.message || 'Authorization failed.', 'error');
    }
  } catch {
    showToast('Authorization failed.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.innerHTML = 'Grant Access';
    }
  }
}

/* ============================================================
   PASSKEY / WEBAUTHN
   ============================================================ */
async function registerPasskey() {
  const deviceName = document.getElementById('reg-device-name').value.trim() || 'My Device';
  const { startRegistration } = SimpleWebAuthnBrowser;

  try {
    const resp = await fetch('/api/auth/passkey/register/options', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const options = await resp.json();
    if (!resp.ok) throw new Error(options.message || 'Failed to get options');

    const attResp = await startRegistration(options);

    const verifyResp = await fetch('/api/auth/passkey/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
      body: JSON.stringify({ ...attResp, deviceName })
    });
    const verification = await verifyResp.json();
    if (verification.success) {
      showToast('Device registered as Passkey.', 'success');
      loadDevices();
    } else {
      showToast('Registration failed: ' + verification.message, 'error');
    }
  } catch (err) {
    showToast('Passkey registration cancelled or failed.', 'error');
  }
}

async function handlePasskeyLogin(userId) {
  const { startAuthentication } = SimpleWebAuthnBrowser;
  const errorDiv = document.getElementById('login-error');
  const authBtn = document.getElementById('passkey-auth-btn');
  authBtn.disabled = true;
  authBtn.classList.add('btn-loading');
  authBtn.textContent = 'Verifying...';

  try {
    const resp = await fetch('/api/auth/passkey/login/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const options = await resp.json();
    if (!resp.ok) throw new Error(options.message || 'Auth options failed');

    const asseResp = await startAuthentication(options);

    const verifyResp = await fetch('/api/auth/passkey/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...asseResp, userId })
    });
    const data = await verifyResp.json();
    if (data.login_success) {
      currentToken = data.token;
      currentUser = data.user;
      localStorage.setItem('abi_token', currentToken);
      showToast('Biometric verified. Welcome!', 'success');
      showDashboard();
    } else {
      errorDiv.textContent = 'Verification failed.';
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    errorDiv.textContent = 'Biometric verification failed or cancelled.';
    errorDiv.style.display = 'block';
  } finally {
    authBtn.disabled = false;
    authBtn.classList.remove('btn-loading');
    authBtn.innerHTML = 'Authenticate with Passkey';
  }
}

/* ============================================================
   UTILITY
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}