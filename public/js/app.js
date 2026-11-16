/* ============================================
   FILE: app.js
   PURPOSE: Dashboard task CRUD operations
   CONNECTS TO: /api/tasks (Express back end)
   USED ON: dashboard.html, create-list.html, list-details.html
   ============================================ */

// The API is served from the same origin: Express locally, a Vercel function in production.
// If you host the back end elsewhere (e.g. Render), set API_BASE to that URL.
const API_BASE = '';
const API_URL = `${API_BASE}/api/tasks`;


// ============================================
// DATA LAYER — real API with an in-browser demo fallback
// If the API can't be reached (no database configured on the live demo),
// tasks are stored in localStorage so every feature still works.
// ============================================

const DEMO_KEY = 'gsd-demo-tasks';
let demoMode = false;

function demoTasks() {
    try {
        const saved = JSON.parse(localStorage.getItem(DEMO_KEY));
        if (Array.isArray(saved)) return saved;
    } catch (e) { /* ignore */ }
    const day = n => new Date(Date.now() + n * 864e5).toISOString().split('T')[0];
    const seed = [
        { title: 'Plan sprint goals', description: 'Pick the top 3 outcomes for the week', dueDate: day(1), completed: false },
        { title: 'Review pull request #42', description: 'Auth middleware refactor', dueDate: day(0), completed: true },
        { title: 'Write API docs', description: 'Document the /api/tasks endpoints', dueDate: day(3), completed: false },
        { title: 'Book dentist', description: 'Before the end of the month', dueDate: day(9), completed: false },
    ].map((t, i) => ({ ...t, _id: 'demo-' + (i + 1), dateCreated: new Date(Date.now() - i * 6e4).toISOString() }));
    localStorage.setItem(DEMO_KEY, JSON.stringify(seed));
    return seed;
}
function saveDemo(tasks) { localStorage.setItem(DEMO_KEY, JSON.stringify(tasks)); }

function demoRequest(method, id, body) {
    let tasks = demoTasks();
    const find = () => tasks.find(t => t._id === id);
    switch (method) {
        case 'GET':
            if (!id) return tasks.slice().sort((a, b) => b.dateCreated.localeCompare(a.dateCreated));
            if (!find()) throw new Error('Task not found');
            return find();
        case 'POST': {
            if (!body.title) throw new Error('Title is required');
            const task = { _id: 'demo-' + Date.now(), completed: false, dateCreated: new Date().toISOString(), ...body };
            tasks.push(task); saveDemo(tasks); return task;
        }
        case 'PUT': {
            const t = find(); if (!t) throw new Error('Task not found');
            Object.assign(t, body); saveDemo(tasks); return t;
        }
        case 'DELETE':
            tasks = tasks.filter(t => t._id !== id); saveDemo(tasks); return null;
    }
}

function enableDemoMode() {
    if (demoMode) return;
    demoMode = true;
    const list = document.getElementById('task-list');
    if (list && !document.getElementById('demo-banner')) {
        const b = document.createElement('div');
        b.id = 'demo-banner';
        b.className = 'mb-3';
        b.style.cssText = 'font-size:.85rem;padding:.6rem .9rem;border-radius:10px;border:1px solid rgba(250,204,21,.35);background:rgba(250,204,21,.08);color:#fde68a;';
        b.innerHTML = '<span class="material-symbols-outlined" style="font-size:1rem;vertical-align:middle;">science</span> Demo mode — no database is connected, so tasks are saved in this browser only.';
        list.parentNode.insertBefore(b, list);
    }
}

async function apiRequest(method, id, body) {
    if (!demoMode) {
        let res;
        try {
            res = await fetch(id ? `${API_URL}/${id}` : API_URL, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            });
        } catch (networkErr) {
            res = null;
        }
        const isJson = res && (res.headers.get('content-type') || '').includes('application/json');
        if (res && isJson && res.status !== 503) {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Request failed');
            }
            return method === 'DELETE' ? null : res.json();
        }
        enableDemoMode(); // API missing, offline, or DB not configured
    }
    return demoRequest(method, id, body);
}


// ============================================
// DASHBOARD — Load All Tasks
// ============================================

async function loadTasks() {
    const container = document.getElementById('task-list');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (!container) return;

    try {
        const tasks = await apiRequest('GET');

        // Get the current filter (all, active, completed)
        const filter = document.querySelector('.filter-tab.active');
        const filterType = filter ? filter.dataset.filter : 'all';

        // Filter tasks based on active tab
        let filtered = tasks;
        if (filterType === 'active') filtered = tasks.filter(t => !t.completed);
        if (filterType === 'completed') filtered = tasks.filter(t => t.completed);

        // Update the progress bar
        if (progressFill && progressText && tasks.length > 0) {
            const done = tasks.filter(t => t.completed).length;
            const percent = Math.round((done / tasks.length) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = `${done} of ${tasks.length} completed`;
        } else if (progressFill && progressText) {
            progressFill.style.width = '0%';
            progressText.textContent = 'No tasks yet';
        }

        // Clear and render
        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">checklist</span>
                    <h3>No tasks here</h3>
                    <p>Add a task above to get started!</p>
                </div>
            `;
            return;
        }

        // Build a card for each task
        filtered.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.dataset.id = task._id;

            // Format the due date nicely
            const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-AU', {
                day: 'numeric', month: 'short', year: 'numeric'
            }) : 'No date';

            item.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
                    onchange="toggleTask('${task._id}', this.checked)">
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">calendar_today</span> ${due}</span>
                        <span>${escapeHtml(task.description || '')}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button onclick="openEditModal('${task._id}')" title="Edit">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="delete-btn" onclick="deleteTask('${task._id}')" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color: var(--danger); padding: 2rem;">Error loading tasks.</p>';
    }
}


// ============================================
// CREATE — Add a New Task
// ============================================

async function addTask(e) {
    e.preventDefault();

    const titleInput = document.getElementById('new-task-title');
    const descInput = document.getElementById('new-task-desc');
    const dateInput = document.getElementById('new-task-date');

    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const dueDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    if (!title) return;

    try {
        await apiRequest('POST', null, { title, description: description || title, dueDate });
        titleInput.value = '';
        if (descInput) descInput.value = '';
        if (dateInput) dateInput.value = '';
        showToast('Task added!', 'success');
        loadTasks();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Error adding task', 'error');
    }
}


// ============================================
// UPDATE — Toggle Task Complete
// ============================================

async function toggleTask(id, completed) {
    try {
        await apiRequest('PUT', id, { completed });
        loadTasks();
    } catch (err) {
        console.error(err);
        showToast('Error updating task', 'error');
    }
}


// ============================================
// UPDATE — Edit Task (via Modal)
// ============================================

async function openEditModal(id) {
    try {
        const task = await apiRequest('GET', id);

        // Fill the modal form with current values
        document.getElementById('edit-task-id').value = task._id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-desc').value = task.description || '';
        document.getElementById('edit-task-date').value = task.dueDate ? task.dueDate.split('T')[0] : '';

        // Show the Bootstrap modal
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    } catch (err) {
        console.error(err);
        showToast('Error loading task details', 'error');
    }
}

function closeEditModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    if (modal) modal.hide();
}

async function saveEdit(e) {
    e.preventDefault();

    const id = document.getElementById('edit-task-id').value;
    const title = document.getElementById('edit-task-title').value.trim();
    const description = document.getElementById('edit-task-desc').value.trim();
    const dueDate = document.getElementById('edit-task-date').value;

    if (!title) return;

    try {
        await apiRequest('PUT', id, { title, description: description || title, dueDate });
        closeEditModal();
        showToast('Task updated!', 'success');
        loadTasks();
    } catch (err) {
        console.error(err);
        showToast('Error updating task', 'error');
    }
}


// ============================================
// DELETE — Remove a Task
// ============================================

async function deleteTask(id) {
    try {
        // Animate the item out before deleting
        const item = document.querySelector(`.task-item[data-id="${id}"]`);
        if (item) {
            item.style.animation = 'fadeOut 0.3s ease forwards';
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        await apiRequest('DELETE', id);
        showToast('Task deleted', 'success');
        loadTasks();
    } catch (err) {
        console.error(err);
        showToast('Error deleting task', 'error');
    }
}


// ============================================
// FILTER TABS — All / Active / Completed
// ============================================

function setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTasks();
        });
    });
}


// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container-gsd');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container-gsd';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-gsd ${type}`;
    const icon = type === 'success' ? 'check_circle' : 'error';

    toast.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// ============================================
// UTILITY — Escape HTML to prevent XSS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================
// INITIALISE — Run when the page loads
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load tasks if we're on the dashboard page
    if (document.getElementById('task-list')) {
        loadTasks();
        setupFilterTabs();
    }

    // Add task form
    const addForm = document.getElementById('add-task-form');
    if (addForm) {
        addForm.addEventListener('submit', addTask);
    }

    // Edit task form (inside modal)
    const editForm = document.getElementById('edit-task-form');
    if (editForm) {
        editForm.addEventListener('submit', saveEdit);
    }
});
