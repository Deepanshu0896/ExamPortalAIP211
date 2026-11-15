/**
 * ONLINE EXAM SYSTEM - MAIN CONTROLLER (main.js)
 * Clean, modular Vanilla JS for state synchronization, authentication,
 * protected exam lobby gating, paper switching, search-driven scorecards,
 * and dual-mode execution (PHP server & static/VS Code testing).
 */

// --- 1. User Session Helpers (Dual-Storage: localStorage + sessionStorage) ---
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('examUser') || sessionStorage.getItem('examUser');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    if (!user) {
        clearCurrentUser();
        return;
    }
    const val = JSON.stringify(user);
    try { localStorage.setItem('examUser', val); } catch (e) {}
    try { sessionStorage.setItem('examUser', val); } catch (e) {}
}

function clearCurrentUser() {
    try { localStorage.removeItem('examUser'); } catch (e) {}
    try { sessionStorage.removeItem('examUser'); } catch (e) {}
    try { sessionStorage.removeItem('lastExamResult'); } catch (e) {}
}

// --- Helper: Escape HTML strings to prevent HTML tag interpretation ---
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// --- 2. Main DOM Initializer ---
document.addEventListener('DOMContentLoaded', () => {

    const currentUser = getCurrentUser();

    // ========================================================
    // A. SYNC NAVIGATION BAR & AUTHENTICATION SLOTS
    // ========================================================
    const navAuthSlot = document.getElementById('navAuthSlot');
    if (navAuthSlot) {
        if (currentUser) {
            navAuthSlot.innerHTML = `
                <a href="#" id="navLogoutBtn" class="btn-nav btn-nav-accent hover-scale" title="Sign out of current examination session">
                    Logout (${currentUser.roll_no})
                </a>
            `;
            const navLogoutBtn = document.getElementById('navLogoutBtn');
            if (navLogoutBtn) {
                navLogoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    clearCurrentUser();

                    // If running on a web server, notify backend in background
                    if (window.location.protocol.startsWith('http')) {
                        try {
                            fetch('../backend/logout.php').catch(() => {});
                        } catch (err) {}
                    }

                    alert("🔒 You have been safely logged out.");
                    window.location.href = 'index.html';
                });
            }
        } else {
            navAuthSlot.innerHTML = `
                <a href="login.html" class="btn-nav btn-nav-accent hover-scale">Portal Login</a>
            `;
        }
    }

    // Admin Logout button handler (admin.html)
    const btnAdminLogout = document.getElementById('btnAdminLogout');
    if (btnAdminLogout) {
        btnAdminLogout.addEventListener('click', (e) => {
            e.preventDefault();
            clearCurrentUser();

            // If running on a live web server, terminate server session in background
            if (window.location.protocol.startsWith('http')) {
                try {
                    fetch('../backend/logout.php').catch(() => {});
                } catch (err) {}
            }

            alert("🔒 Faculty Admin session ended successfully.");
            window.location.href = 'index.html';
        });
    }

    // ========================================================
    // A2. UNIVERSAL PAPER LOCK/UNLOCK (admin.html — all subjects)
    // ========================================================

    // --- Base-subject lock state helpers (WT, DS, DBMS) ---
    function getBaseLockState() {
        try {
            const raw = localStorage.getItem('basePaperStatus') || sessionStorage.getItem('basePaperStatus');
            return raw ? JSON.parse(raw) : { WT: 'active', DS: 'active', DBMS: 'locked' };
        } catch(e) { return { WT: 'active', DS: 'active', DBMS: 'locked' }; }
    }
    function saveBaseLockState(obj) {
        localStorage.setItem('basePaperStatus', JSON.stringify(obj));
        sessionStorage.setItem('basePaperStatus', JSON.stringify(obj));
    }

    // Sync DBMS badge + legacy key (backward-compat)
    function syncAllBaseBadges() {
        const state = getBaseLockState();
        // Sync legacy dbmsUnlocked key
        const dbmsOn = state['DBMS'] === 'active';
        localStorage.setItem('dbmsUnlocked', dbmsOn ? '1' : '0');
        sessionStorage.setItem('dbmsUnlocked', dbmsOn ? '1' : '0');

        ['WT', 'DS', 'DBMS'].forEach(code => {
            const badge = document.getElementById(`badge_${code}`);
            const btn   = document.getElementById(`btnToggle${code}`);
            const isActive = state[code] === 'active';
            if (badge) {
                badge.className   = isActive ? 'badge-status-active' : 'badge-status-locked';
                badge.textContent = isActive ? '🟢 Active / Live' : '🔒 Locked (Sealed)';
            }
            if (btn) {
                btn.textContent = isActive ? '🔒 Lock Paper' : '🔓 Unlock Paper';
            }
        });

        // Also update num-questions display for base subjects
        const baseQCfg = getBaseQConfig();
        ['WT', 'DS', 'DBMS'].forEach(code => {
            const n = baseQCfg[code] || 5;
            const marks = (10 / n).toFixed(1);
            const qsEl  = document.getElementById(`qs_${code}`);
            const mpqEl = document.getElementById(`mpq_${code}`);
            if (qsEl)  qsEl.textContent  = `${n} Qs / 10 Marks`;
            if (mpqEl) mpqEl.textContent = `${marks} Marks`;
        });
    }

    // Base subject question-count config
    function getBaseQConfig() {
        try {
            const raw = localStorage.getItem('baseQConfig') || sessionStorage.getItem('baseQConfig');
            return raw ? JSON.parse(raw) : { WT: 5, DS: 5, DBMS: 5 };
        } catch(e) { return { WT: 5, DS: 5, DBMS: 5 }; }
    }
    function saveBaseQConfig(obj) {
        localStorage.setItem('baseQConfig', JSON.stringify(obj));
        sessionStorage.setItem('baseQConfig', JSON.stringify(obj));
    }

    // Wire base-subject Lock/Unlock buttons (WT, DS)
    ['WT', 'DS'].forEach(code => {
        const btn = document.getElementById(`btnToggle${code}`);
        if (btn) {
            btn.addEventListener('click', () => {
                const state = getBaseLockState();
                const wasActive = state[code] === 'active';
                state[code] = wasActive ? 'locked' : 'active';
                saveBaseLockState(state);
                syncAllBaseBadges();
                const msg = wasActive
                    ? `🔒 ${code} Paper LOCKED — students blocked.`
                    : `🔓 ${code} Paper UNLOCKED — students can access.`;
                alert(msg);
                if (window.location.protocol.startsWith('http')) {
                    const fd = new FormData();
                    fd.append('action', 'toggle_status');
                    fd.append('subject_code', code);
                    fetch('../backend/admin_manage.php', { method: 'POST', body: fd })
                        .then(() => syncSubjectsFromBackend())
                        .catch(() => {});
                }
            });
        }
    });

    // Wire DBMS form (keeps backward-compat form-based approach)
    const formToggleDBMS = document.getElementById('formToggleDBMS');
    if (formToggleDBMS) {
        formToggleDBMS.addEventListener('submit', (e) => {
            e.preventDefault();
            const state = getBaseLockState();
            const wasActive = state['DBMS'] === 'active';
            state['DBMS'] = wasActive ? 'locked' : 'active';
            saveBaseLockState(state);
            syncAllBaseBadges();
            if (window.location.protocol.startsWith('http')) {
                fetch('../backend/admin_manage.php', { method: 'POST', body: new FormData(formToggleDBMS) })
                    .then(() => syncSubjectsFromBackend())
                    .catch(() => {});
            }
            alert(wasActive
                ? '🔒 CS203 DBMS Paper LOCKED — student access blocked.'
                : '🔓 CS203 DBMS Paper UNLOCKED — students can now access it.');
        });
    }

    // Run badge sync on page load
    if (document.getElementById('subjectsInventoryTable') || document.getElementById('formToggleDBMS')) {
        syncAllBaseBadges();
    }

    // ========================================================
    // A2-B. BACKEND SUBJECTS & LOCK STATE SYNCHRONIZATION
    // ========================================================
    function syncSubjectsFromBackend(callback) {
        if (!window.location.protocol.startsWith('http')) {
            if (typeof callback === 'function') callback();
            return;
        }

        fetch('../backend/get_subjects.php')
            .then(res => res.json())
            .then(data => {
                if (data && data.status === 'success' && Array.isArray(data.subjects)) {
                    const baseState = getBaseLockState();
                    const baseQCfg  = getBaseQConfig();
                    const extras    = [];

                    data.subjects.forEach(sub => {
                        const code = sub.code.toUpperCase();
                        if (['WT', 'DS', 'DBMS'].includes(code)) {
                            baseState[code] = sub.status;
                            if (sub.num_questions) baseQCfg[code] = sub.num_questions;
                        } else {
                            extras.push({
                                code: sub.code,
                                course_code: sub.course_code || sub.code,
                                name: sub.name,
                                status: sub.status,
                                desc: sub.description,
                                num_questions: sub.num_questions || 5,
                                total_marks: sub.total_marks || 10,
                                question_count: sub.question_count || 0
                            });
                        }
                    });

                    saveBaseLockState(baseState);
                    saveBaseQConfig(baseQCfg);
                    saveExtraSubjects(extras);

                    syncAllBaseBadges();
                    renderExtraSubjectRows();
                    syncSubjectDropdowns();
                    updateAdminStats();
                    renderHomeSubjectCards();
                    syncNavSubjectDropdowns();
                }
                if (typeof callback === 'function') callback();
            })
            .catch(() => {
                if (typeof callback === 'function') callback();
            });
    }

    // Trigger immediate backend sync on all pages
    syncSubjectsFromBackend();

    // ========================================================
    // A3. ADD SUBJECT FORM — offline-first (admin.html)
    // ========================================================
    const formAddSubject = document.getElementById('formAddSubject');
    const msgSubject     = document.getElementById('msgSubject');

    // Helper: show inline message
    function showAdminMsg(el, text, isError) {
        if (!el) return;
        el.className = isError ? 'msg-error' : 'msg-success';
        el.textContent = text;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    }

    // Helper: get extra subjects from persistent storage (localStorage + sessionStorage)
    function getExtraSubjects() {
        try {
            const raw = localStorage.getItem('adminExtraSubjects') || sessionStorage.getItem('adminExtraSubjects');
            return raw ? JSON.parse(raw) : [];
        } catch(e) { return []; }
    }
    function saveExtraSubjects(arr) {
        localStorage.setItem('adminExtraSubjects', JSON.stringify(arr));
        sessionStorage.setItem('adminExtraSubjects', JSON.stringify(arr));
    }

    // Render extra subjects into the inventory table
    function renderExtraSubjectRows() {
        const container = document.getElementById('extraSubjectsContainer');
        const tbody = document.getElementById('subjectsTbody');
        if (!tbody) { if (container) container.innerHTML = ''; return; }

        // Remove old extra rows
        tbody.querySelectorAll('.extra-subject-row').forEach(r => r.remove());
        if (container) container.innerHTML = '';

        const extras = getExtraSubjects();
        if (!extras.length) return;

        extras.forEach(s => {
            const isActive = s.status === 'active';
            const nQ = s.num_questions || 5;
            const mpq = (10 / nQ).toFixed(1);
            const tr = document.createElement('tr');
            tr.className = 'extra-subject-row';
            tr.setAttribute('data-extra-code', s.code);
            tr.innerHTML = `
                <td class="text-center"><strong>${escapeHtml(s.code)}</strong></td>
                <td>${escapeHtml(s.name)}</td>
                <td>${nQ} Qs / 10 Marks</td>
                <td>${mpq} Marks</td>
                <td><span id="badge_extra_${escapeHtml(s.code)}" class="badge-status-${isActive ? 'active' : 'locked'}">${isActive ? '🟢 Active / Live' : '🔒 Locked (Sealed)'}</span></td>
                <td class="text-center">
                    <div class="action-btn-group">
                        <button class="btn btn-secondary btn-sm hover-scale btn-toggle-extra" data-code="${escapeHtml(s.code)}">${isActive ? '🔒 Lock' : '🔓 Unlock'}</button>
                        <a href="exam.html?subject=${encodeURIComponent(s.code)}" class="btn btn-outline btn-sm">Preview</a>
                        <button class="btn btn-danger btn-sm hover-scale btn-delete-extra" data-code="${escapeHtml(s.code)}">🗑 Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Wire toggle buttons for extra subjects
        tbody.querySelectorAll('.btn-toggle-extra').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                const extras = getExtraSubjects();
                const idx = extras.findIndex(s => s.code === code);
                if (idx < 0) return;
                const wasActive = extras[idx].status === 'active';
                extras[idx].status = wasActive ? 'locked' : 'active';
                saveExtraSubjects(extras);
                renderExtraSubjectRows();
                renderHomeSubjectCards();
                showAdminMsg(msgSubject, `${wasActive ? '🔒 Locked' : '🔓 Unlocked'} paper: ${extras[idx].name} (${code})`, false);
                // Backend sync
                if (window.location.protocol.startsWith('http')) {
                    const fd = new FormData();
                    fd.append('action', 'toggle_status');
                    fd.append('subject_code', code);
                    fetch('../backend/admin_manage.php', { method: 'POST', body: fd })
                        .then(() => syncSubjectsFromBackend())
                        .catch(() => {});
                }
            });
        });

        // Wire delete buttons for extra subjects
        tbody.querySelectorAll('.btn-delete-extra').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                const extras = getExtraSubjects();
                const sub = extras.find(s => s.code === code);
                if (!sub) return;
                if (!confirm(`⚠️ Delete subject "${sub.name}" (${code})?\n\nThis will also remove all its custom questions from the question bank. This action cannot be undone.`)) return;

                // Remove subject
                const newExtras = extras.filter(s => s.code !== code);
                saveExtraSubjects(newExtras);

                // Remove its custom questions
                const customQs = getCustomQuestions().filter(q => q.subject_code !== code);
                saveCustomQuestions(customQs);

                renderExtraSubjectRows();
                syncSubjectDropdowns();
                updateAdminStats();
                renderHomeSubjectCards();
                syncNavSubjectDropdowns();
                showAdminMsg(msgSubject, `🗑 Subject "${sub.name}" (${code}) deleted successfully.`, false);

                // Backend sync
                if (window.location.protocol.startsWith('http')) {
                    const fd = new FormData();
                    fd.append('action', 'delete_subject');
                    fd.append('subject_code', code);
                    fetch('../backend/admin_manage.php', { method: 'POST', body: fd })
                        .then(() => syncSubjectsFromBackend())
                        .catch(() => {});
                }
            });
        });
    }

    // Update stat counters
    function updateAdminStats() {
        const subjectCountEl  = document.getElementById('statSubjectCount');
        const questionCountEl = document.getElementById('statQuestionCount');
        const extras  = getExtraSubjects();
        const qbank   = getAllQuestions();
        const baseState = getBaseLockState();
        const totalSubs = 3 + extras.length;
        const activeSubs = Object.values(baseState).filter(v => v === 'active').length
            + extras.filter(s => s.status === 'active').length;
        const lockedSubs = totalSubs - activeSubs;

        if (subjectCountEl)  subjectCountEl.textContent  = totalSubs;
        if (questionCountEl) questionCountEl.textContent = 15 + qbank.filter(q => q.isCustom).length;

        const activeEl  = document.querySelector('.stat-card:nth-child(3) .stat-number');
        const lockedEl  = document.querySelector('.stat-card:nth-child(4) .stat-number');
        if (activeEl)  activeEl.textContent  = activeSubs;
        if (lockedEl)  lockedEl.textContent  = lockedSubs;
    }

    // Dynamic dropdown & Question Bank tab synchronization
    function syncSubjectDropdowns() {
        const targetSelect = document.getElementById('target_subject');
        const filterSubject = document.getElementById('filter_subject');
        const extras = getExtraSubjects();

        if (targetSelect) {
            const baseSubjects = [
                { code: 'WT', name: 'CS201 — Web Development' },
                { code: 'DS', name: 'CS202 — Data Structures & Algorithms' },
                { code: 'DBMS', name: 'CS203 — Database Management Systems' }
            ];
            const allSubjects = [...baseSubjects];
            extras.forEach(ex => {
                if (!allSubjects.some(s => s.code === ex.code)) {
                    allSubjects.push({ code: ex.code, name: `${ex.code} — ${ex.name}` });
                }
            });

            const currVal = targetSelect.value;
            targetSelect.innerHTML = allSubjects.map(s => `
                <option value="${escapeHtml(s.code)}" ${s.code === currVal ? 'selected' : ''}>${escapeHtml(s.name)}</option>
            `).join('');
        }

        if (filterSubject) {
            const currVal = filterSubject.value || 'ALL';
            let optionsHtml = '<option value="ALL">All Enrolled Courses</option>';
            optionsHtml += '<option value="WT">Web Development (CS201)</option>';
            optionsHtml += '<option value="DS">Data Structures &amp; Algorithms (CS202)</option>';
            optionsHtml += '<option value="DBMS">Database Systems (CS203)</option>';
            extras.forEach(ex => {
                optionsHtml += `<option value="${escapeHtml(ex.code)}">${escapeHtml(ex.name)} (${escapeHtml(ex.code)})</option>`;
            });
            filterSubject.innerHTML = optionsHtml;
            filterSubject.value = currVal;
        }

        // Sync Question Bank tab buttons
        const tabBar = document.querySelector('.admin-tab-bar');
        if (tabBar) {
            let tabsHtml = `
                <button class="btn btn-outline btn-sm admin-tab-btn ${activeQFilter === 'WT' ? 'active-tab' : ''}" data-filter="WT">CS201 — Web Dev</button>
                <button class="btn btn-outline btn-sm admin-tab-btn ${activeQFilter === 'DS' ? 'active-tab' : ''}" data-filter="DS">CS202 — DSA</button>
                <button class="btn btn-outline btn-sm admin-tab-btn ${activeQFilter === 'DBMS' ? 'active-tab' : ''}" data-filter="DBMS">CS203 — DBMS</button>
            `;
            extras.forEach(ex => {
                tabsHtml += `
                    <button class="btn btn-outline btn-sm admin-tab-btn ${activeQFilter === ex.code ? 'active-tab' : ''}" data-filter="${escapeHtml(ex.code)}">${escapeHtml(ex.code)} — ${escapeHtml(ex.name)}</button>
                `;
            });
            tabsHtml += `
                <button class="btn btn-outline btn-sm admin-tab-btn ${activeQFilter === 'ALL' ? 'active-tab' : ''}" data-filter="ALL">All Subjects</button>
            `;
            tabBar.innerHTML = tabsHtml;

            tabBar.querySelectorAll('.admin-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    tabBar.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active-tab'));
                    btn.classList.add('active-tab');
                    renderQBank(btn.getAttribute('data-filter'));
                });
            });
        }
    }

    if (formAddSubject) {
        formAddSubject.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(formAddSubject);
            const code = (fd.get('subject_code') || '').trim().toUpperCase();
            const name = (fd.get('subject_name') || '').trim();
            const status = fd.get('status') || 'locked';
            const desc = (fd.get('description') || '').trim();
            const num_questions = Math.max(1, parseInt(fd.get('num_questions') || '5', 10) || 5);

            if (!code || !name) {
                showAdminMsg(msgSubject, '⚠️ Please fill in both Subject Code and Title.', true);
                return;
            }

            const extras = getExtraSubjects();
            const existing = extras.findIndex(s => s.code === code);
            if (existing >= 0) {
                extras[existing] = { code, name, status, desc, num_questions };
                showAdminMsg(msgSubject, `✅ Subject "${name}" (${code}) updated. ${num_questions} questions per paper.`, false);
            } else {
                extras.push({ code, name, status, desc, num_questions });
                showAdminMsg(msgSubject, `✅ Subject "${name}" (${code}) registered. ${num_questions} questions per paper.`, false);
            }
            saveExtraSubjects(extras);
            formAddSubject.reset();
            renderExtraSubjectRows();
            syncSubjectDropdowns();
            updateAdminStats();
            renderHomeSubjectCards();
            syncNavSubjectDropdowns();
            renderQBank(code);

            // Also try backend if on PHP server
            if (window.location.protocol.startsWith('http')) {
                fetch('../backend/admin_manage.php', { method: 'POST', body: fd })
                    .then(() => syncSubjectsFromBackend())
                    .catch(() => {});
            }
        });
    }

    // ========================================================
    // A4. ADD QUESTION FORM — offline-first (admin.html)
    // ========================================================
    const formAddQuestion = document.getElementById('formAddQuestion');
    const msgQuestion     = document.getElementById('msgQuestion');

    // Built-in static question bank
    const BUILTIN_QUESTIONS = [
        // CS201 — Web Development (WT)
        { subject_code: 'WT', subject_name: 'Web Development', num: 1, question_text: 'Which of the following is considered an HTML5 Semantic Tag that clearly describes its structural meaning to both browser and search engine?', opt_a: '<div>', opt_b: '<article>', opt_c: '<span>', opt_d: '<font>', correct_opt: 'B' },
        { subject_code: 'WT', subject_name: 'Web Development', num: 2, question_text: 'Which CSS property controls the text size?', opt_a: 'text-style', opt_b: 'font-size', opt_c: 'text-size', opt_d: 'font-weight', correct_opt: 'B' },
        { subject_code: 'WT', subject_name: 'Web Development', num: 3, question_text: 'What does the "C" stand for in CSS?', opt_a: 'Computer', opt_b: 'Cascading', opt_c: 'Creative', opt_d: 'Colorful', correct_opt: 'B' },
        { subject_code: 'WT', subject_name: 'Web Development', num: 4, question_text: 'Which JavaScript method selects an element by ID?', opt_a: 'getElement()', opt_b: 'getElementById()', opt_c: 'queryId()', opt_d: 'selectId()', correct_opt: 'B' },
        { subject_code: 'WT', subject_name: 'Web Development', num: 5, question_text: 'Which HTTP method is used to send form data securely in the request body?', opt_a: 'GET', opt_b: 'POST', opt_c: 'PUT', opt_d: 'HEAD', correct_opt: 'B' },
        // CS202 — Data Structures (DS)
        { subject_code: 'DS', subject_name: 'Data Structures & Algorithms', num: 1, question_text: 'Which data structure uses FIFO order?', opt_a: 'Stack', opt_b: 'Queue', opt_c: 'Tree', opt_d: 'Graph', correct_opt: 'B' },
        { subject_code: 'DS', subject_name: 'Data Structures & Algorithms', num: 2, question_text: 'What is the time complexity of binary search?', opt_a: 'O(n)', opt_b: 'O(log n)', opt_c: 'O(n²)', opt_d: 'O(1)', correct_opt: 'B' },
        { subject_code: 'DS', subject_name: 'Data Structures & Algorithms', num: 3, question_text: 'Which traversal visits root first in a binary tree?', opt_a: 'Inorder', opt_b: 'Preorder', opt_c: 'Postorder', opt_d: 'Level-order', correct_opt: 'B' },
        { subject_code: 'DS', subject_name: 'Data Structures & Algorithms', num: 4, question_text: 'Which sorting algorithm has the best average case O(n log n)?', opt_a: 'Bubble Sort', opt_b: 'Merge Sort', opt_c: 'Insertion Sort', opt_d: 'Selection Sort', correct_opt: 'B' },
        { subject_code: 'DS', subject_name: 'Data Structures & Algorithms', num: 5, question_text: 'Which data structure is used for depth-first search (DFS)?', opt_a: 'Queue', opt_b: 'Linked List', opt_c: 'Stack', opt_d: 'Heap', correct_opt: 'C' },
        // CS203 — DBMS
        { subject_code: 'DBMS', subject_name: 'Database Management Systems', num: 1, question_text: 'Which of the following models represents data as entities and relationships?', opt_a: 'Relational Model', opt_b: 'ER Model', opt_c: 'Hierarchical Model', opt_d: 'Network Model', correct_opt: 'B' },
        { subject_code: 'DBMS', subject_name: 'Database Management Systems', num: 2, question_text: 'A relation is in 3NF if it is in 2NF and no transitive dependencies exist for which type of attribute?', opt_a: 'Primary key', opt_b: 'Foreign key', opt_c: 'Non-prime attribute', opt_d: 'Composite key', correct_opt: 'C' },
        { subject_code: 'DBMS', subject_name: 'Database Management Systems', num: 3, question_text: 'Which relational algebra operation is used to extract rows from a relation?', opt_a: 'Projection (π)', opt_b: 'Selection (σ)', opt_c: 'Join (⋈)', opt_d: 'Union (∪)', correct_opt: 'B' },
        { subject_code: 'DBMS', subject_name: 'Database Management Systems', num: 4, question_text: 'Which ACID property ensures that a transaction\'s intermediate states are hidden from other transactions?', opt_a: 'Atomicity', opt_b: 'Consistency', opt_c: 'Isolation', opt_d: 'Durability', correct_opt: 'C' },
        { subject_code: 'DBMS', subject_name: 'Database Management Systems', num: 5, question_text: 'Which SQL clause is used to filter groups after GROUP BY?', opt_a: 'WHERE', opt_b: 'ORDER BY', opt_c: 'HAVING', opt_d: 'DISTINCT', correct_opt: 'C' },
    ];

    function getCustomQuestions() {
        try {
            const raw = localStorage.getItem('adminCustomQuestions') || sessionStorage.getItem('adminCustomQuestions');
            return raw ? JSON.parse(raw) : [];
        } catch(e) { return []; }
    }
    function saveCustomQuestions(arr) {
        localStorage.setItem('adminCustomQuestions', JSON.stringify(arr));
        sessionStorage.setItem('adminCustomQuestions', JSON.stringify(arr));
    }
    function getAllQuestions(filterCode) {
        const custom = getCustomQuestions().map(q => ({ ...q, isCustom: true }));
        const all = [...BUILTIN_QUESTIONS, ...custom];
        if (filterCode && filterCode !== 'ALL') return all.filter(q => q.subject_code === filterCode);
        return all;
    }

    if (formAddQuestion) {
        formAddQuestion.addEventListener('submit', (e) => {
            e.preventDefault();
            const fd = new FormData(formAddQuestion);
            const subject_code = fd.get('subject_code') || 'WT';
            const question_text = (fd.get('question_text') || '').trim();
            const opt_a = (fd.get('opt_a') || '').trim();
            const opt_b = (fd.get('opt_b') || '').trim();
            const opt_c = (fd.get('opt_c') || '').trim();
            const opt_d = (fd.get('opt_d') || '').trim();
            const correct_opt = fd.get('correct_opt') || 'A';
            const subjectNames = { WT: 'Web Development', DS: 'Data Structures & Algorithms', DBMS: 'Database Management Systems' };
            const extrasList = getExtraSubjects();
            const matchedExtra = extrasList.find(s => s.code === subject_code);
            const subject_name = matchedExtra ? matchedExtra.name : (subjectNames[subject_code] || subject_code);

            if (!question_text || !opt_a || !opt_b) {
                showAdminMsg(msgQuestion, '⚠️ Please fill in the question text and at least options A & B.', true);
                return;
            }

            const customs = getCustomQuestions();
            const existing = getAllQuestions(subject_code);
            const num = existing.length + 1;
            customs.push({ subject_code, subject_name, num, question_text, opt_a, opt_b, opt_c, opt_d, correct_opt, isCustom: true });
            saveCustomQuestions(customs);
            formAddQuestion.reset();
            showAdminMsg(msgQuestion, `✅ Question added to ${subject_name} bank successfully. (Q${num})`, false);
            updateAdminStats();
            renderQBank(subject_code);

            // Also try backend if on PHP server
            if (window.location.protocol.startsWith('http')) {
                fetch('../backend/admin_manage.php', { method: 'POST', body: fd })
                    .then(() => syncSubjectsFromBackend())
                    .catch(() => {});
            }
        });
    }

    // ========================================================
    // A5. QUESTION BANK VIEWER (admin.html)
    // ========================================================
    const qbankList = document.getElementById('qbankList');
    const tabBtns   = document.querySelectorAll('.admin-tab-btn');
    let activeQFilter = 'WT';

    function renderQBank(filterCode) {
        if (!qbankList) return;
        activeQFilter = filterCode || activeQFilter;
        const questions = getAllQuestions(activeQFilter === 'ALL' ? null : activeQFilter);

        if (!questions.length) {
            qbankList.innerHTML = '<p class="qbank-empty">No questions found for this subject.</p>';
            return;
        }

        qbankList.innerHTML = questions.map((q, idx) => `
            <div class="qbank-item">
                <div class="qbank-item-header">
                    <span class="qbank-item-num">Q${idx + 1}${q.isCustom ? ' ★' : ''}</span>
                    <span class="qbank-subject-tag">${escapeHtml(q.subject_code)} — ${escapeHtml(q.subject_name)}</span>
                </div>
                <div class="qbank-question-text">${escapeHtml(q.question_text)}</div>
                <ul class="qbank-options">
                    <li class="${q.correct_opt === 'A' ? 'correct-opt' : ''}">A) ${escapeHtml(q.opt_a)}${q.correct_opt === 'A' ? ' ✓' : ''}</li>
                    <li class="${q.correct_opt === 'B' ? 'correct-opt' : ''}">B) ${escapeHtml(q.opt_b)}${q.correct_opt === 'B' ? ' ✓' : ''}</li>
                    <li class="${q.correct_opt === 'C' ? 'correct-opt' : ''}">C) ${escapeHtml(q.opt_c) || '—'}${q.correct_opt === 'C' ? ' ✓' : ''}</li>
                    <li class="${q.correct_opt === 'D' ? 'correct-opt' : ''}">D) ${escapeHtml(q.opt_d) || '—'}${q.correct_opt === 'D' ? ' ✓' : ''}</li>
                </ul>
            </div>
        `).join('');
    }

    // Wire tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active-tab'));
            btn.classList.add('active-tab');
            renderQBank(btn.getAttribute('data-filter'));
        });
    });

    // Initial render on admin page
    if (qbankList) {
        renderExtraSubjectRows();
        syncSubjectDropdowns();
        updateAdminStats();
        renderQBank('WT');
    }

    // ========================================================
    // B. HOME & INSTRUCTIONS PAGE DYNAMIC CTAs & SUBJECT CARDS
    // ========================================================
    const heroActionBtn = document.getElementById('heroActionBtn');
    if (heroActionBtn) {
        if (currentUser) {
            heroActionBtn.textContent = 'Enter Exam Lobby (CS201) ➔';
            heroActionBtn.setAttribute('href', 'exam.html?subject=WT');
        } else {
            heroActionBtn.textContent = 'Login to Attempt Exam';
            heroActionBtn.setAttribute('href', 'login.html?subject=WT');
        }
    }

    // Dynamic 3D Card injection on Home page for any custom subject registered by admin
    function renderHomeSubjectCards() {
        const grid = document.querySelector('.card-grid');
        if (!grid) return;

        const baseState = getBaseLockState();

        // Update Base Card 1: Web Development (WT)
        const wtCard = grid.querySelector('.card-3d-scene:nth-child(1)');
        if (wtCard) {
            const isWtActive = baseState['WT'] !== 'locked';
            const badge = wtCard.querySelector('.card-badge');
            const hint  = wtCard.querySelector('.card-link-hint');
            const backA = wtCard.querySelector('.card-3d-back a');
            if (badge) {
                badge.className = `card-badge ${isWtActive ? 'badge-live' : 'badge-locked'}`;
                badge.textContent = isWtActive ? '🟢 Live Now' : '🔒 Paper Locked';
            }
            if (hint) hint.textContent = isWtActive ? 'View Exam Specs ➔' : 'View Status ➔';
            if (backA) {
                if (isWtActive) {
                    backA.setAttribute('href', currentUser ? 'exam.html?subject=WT' : 'login.html?subject=WT');
                    backA.textContent = currentUser ? 'Start Test (CS201) ➔' : 'Login to Start Test';
                    backA.className   = 'btn btn-white hover-scale card-test-btn';
                } else {
                    backA.setAttribute('href', 'exam.html?subject=WT');
                    backA.textContent = 'View Lock Notice';
                    backA.className   = 'btn btn-white hover-scale';
                }
            }
        }

        // Update Base Card 2: Data Structures & Algorithms (DS)
        const dsCard = grid.querySelector('.card-3d-scene:nth-child(2)');
        if (dsCard) {
            const isDsActive = baseState['DS'] !== 'locked';
            const badge = dsCard.querySelector('.card-badge');
            const hint  = dsCard.querySelector('.card-link-hint');
            const backA = dsCard.querySelector('.card-3d-back a');
            if (badge) {
                badge.className = `card-badge ${isDsActive ? 'badge-live' : 'badge-locked'}`;
                badge.textContent = isDsActive ? '🟢 Live Now' : '🔒 Paper Locked';
            }
            if (hint) hint.textContent = isDsActive ? 'View Exam Specs ➔' : 'View Status ➔';
            if (backA) {
                if (isDsActive) {
                    backA.setAttribute('href', currentUser ? 'exam.html?subject=DS' : 'login.html?subject=DS');
                    backA.textContent = currentUser ? 'Start Test (CS202) ➔' : 'Login to Start Test';
                    backA.className   = 'btn btn-white hover-scale card-test-btn';
                } else {
                    backA.setAttribute('href', 'exam.html?subject=DS');
                    backA.textContent = 'View Lock Notice';
                    backA.className   = 'btn btn-white hover-scale';
                }
            }
        }

        // Update Base Card 3: Database Management Systems (DBMS)
        const dbmsCard = grid.querySelector('.card-3d-scene:nth-child(3)');
        if (dbmsCard) {
            const isDbmsActive = baseState['DBMS'] === 'active';
            const badge = dbmsCard.querySelector('.card-badge');
            const hint  = dbmsCard.querySelector('.card-link-hint');
            const backA = dbmsCard.querySelector('.card-3d-back a');
            if (badge) {
                badge.className = `card-badge ${isDbmsActive ? 'badge-live' : 'badge-locked'}`;
                badge.textContent = isDbmsActive ? '🟢 Live Now' : '🔒 Paper Locked';
            }
            if (hint) hint.textContent = isDbmsActive ? 'View Exam Specs ➔' : 'View Status ➔';
            if (backA) {
                if (isDbmsActive) {
                    backA.setAttribute('href', currentUser ? 'exam.html?subject=DBMS' : 'login.html?subject=DBMS');
                    backA.textContent = currentUser ? 'Start Test (CS203) ➔' : 'Login to Start Test';
                    backA.className   = 'btn btn-white hover-scale card-test-btn';
                } else {
                    backA.setAttribute('href', 'exam.html?subject=DBMS');
                    backA.textContent = 'View Lock Notice';
                    backA.className   = 'btn btn-white hover-scale';
                }
            }
        }

        // Clean out previously injected custom cards
        grid.querySelectorAll('.extra-subject-card').forEach(c => c.remove());

        const extras = getExtraSubjects();
        if (!extras.length) return;

        extras.forEach(s => {
            const isActive = s.status === 'active';
            const nQ = s.num_questions || 5;
            const card = document.createElement('div');
            card.className = 'card-3d-scene extra-subject-card animate-fade-in';
            card.setAttribute('data-subject', s.code);
            card.innerHTML = `
                <div class="card-3d-inner">
                    <div class="card-3d-front">
                        <span class="card-badge ${isActive ? 'badge-live' : 'badge-locked'}">
                            ${isActive ? '🟢 Live Now' : '🔒 Paper Locked'}
                        </span>
                        <div class="card-icon">📚</div>
                        <h3 class="card-title">${escapeHtml(s.name)}</h3>
                        <p class="card-body">${escapeHtml(s.desc || 'Comprehensive undergraduate evaluation module registered by faculty administrator.')}</p>
                        <span class="card-link-hint">${isActive ? 'View Exam Specs ➔' : 'View Status ➔'}</span>
                    </div>
                    <div class="card-3d-back">
                        <h3>${escapeHtml(s.code)} Specifications</h3>
                        <p><strong>Course:</strong> ${escapeHtml(s.name)}<br>
                           <strong>Total Marks:</strong> 10 Marks (${nQ} MCQs)<br>
                           <strong>Status:</strong> ${isActive ? 'Active (Ready)' : 'Restricted (Sealed by Admin)'}</p>
                        ${isActive 
                            ? `<a href="${currentUser ? `exam.html?subject=${encodeURIComponent(s.code)}` : `login.html?subject=${encodeURIComponent(s.code)}`}" class="btn btn-white hover-scale card-test-btn" data-subject="${escapeHtml(s.code)}">
                                  ${currentUser ? `Start Test (${escapeHtml(s.code)}) ➔` : 'Login to Start Test'}
                               </a>`
                            : `<a href="exam.html?subject=${encodeURIComponent(s.code)}" class="btn btn-white hover-scale">View Lock Notice</a>`
                        }
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Sync all navbar dropdown menus with newly added subjects
    function syncNavSubjectDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        const extras = getExtraSubjects();
        const baseState = getBaseLockState();

        dropdowns.forEach(menu => {
            let html = `
                <li><a href="exam.html?subject=WT">Web Development (CS201) [${baseState['WT'] !== 'locked' ? 'Live' : 'Locked'}]</a></li>
                <li><a href="exam.html?subject=DS">Data Structures &amp; Algorithms (CS202) [${baseState['DS'] !== 'locked' ? 'Live' : 'Locked'}]</a></li>
                <li><a href="exam.html?subject=DBMS">Database Systems (CS203) [${baseState['DBMS'] === 'active' ? 'Live' : 'Locked'}]</a></li>
            `;
            extras.forEach(s => {
                html += `<li><a href="exam.html?subject=${encodeURIComponent(s.code)}">${escapeHtml(s.name)} (${escapeHtml(s.code)}) [${s.status === 'active' ? 'Live' : 'Locked'}]</a></li>`;
            });
            menu.innerHTML = html;
        });
    }

    renderHomeSubjectCards();
    syncNavSubjectDropdowns();

    const cardTestBtns = document.querySelectorAll('.card-test-btn');
    cardTestBtns.forEach(btn => {
        const subj = btn.getAttribute('data-subject') || 'WT';
        if (currentUser) {
            btn.textContent = `Start Test (${subj === 'WT' ? 'CS201' : (subj === 'DS' ? 'CS202' : subj)}) ➔`;
            btn.setAttribute('href', `exam.html?subject=${subj}`);
        } else {
            btn.textContent = 'Login to Start Test';
            btn.setAttribute('href', `login.html?subject=${subj}`);
        }
    });

    const instructionProceedBtn = document.getElementById('instructionProceedBtn');
    if (instructionProceedBtn) {
        if (currentUser) {
            instructionProceedBtn.setAttribute('href', 'exam.html?subject=WT');
        } else {
            instructionProceedBtn.setAttribute('href', 'login.html?subject=WT');
        }
    }

    // ========================================================
    // C. LOGIN FORM HANDLER (login.html)
    // ========================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            const rollInput = document.getElementById('roll_no');
            const passInput = document.getElementById('password');
            const rollVal = rollInput ? rollInput.value.trim() : '';
            const passVal = passInput ? passInput.value.trim() : '';

            const urlParams = new URLSearchParams(window.location.search);
            const targetSubject = (urlParams.get('subject') || 'WT').toUpperCase();
            const nextParam = urlParams.get('next') || urlParams.get('redirect');

            // Admin identification
            if (rollVal.toUpperCase() === 'ADMIN01' || rollVal.toUpperCase() === 'ADMIN') {
                const adminUser = {
                    roll_no: 'ADMIN01',
                    name: 'Faculty Administrator',
                    role: 'admin'
                };
                setCurrentUser(adminUser);

                // If running in static preview mode (file:// or Live Server without PHP), handle client-side
                if (window.location.protocol === 'file:' || window.location.port === '5500') {
                    e.preventDefault();
                    alert(`👑 Welcome, ${adminUser.name}! Entering Faculty Admin Settings.`);
                    window.location.href = nextParam === 'results' ? 'results.html' : 'admin.html';
                }
            } else {
                // Student identification
                const knownStudents = {
                    '21CS101': 'Rahul Sharma',
                    '21CS102': 'Priya Patel'
                };
                const studentUser = {
                    roll_no: rollVal || '21CS101',
                    name: knownStudents[rollVal] || 'Student Examinee',
                    role: 'student'
                };
                setCurrentUser(studentUser);

                // If running in static preview mode (file:// or Live Server without PHP), handle client-side
                if (window.location.protocol === 'file:' || window.location.port === '5500') {
                    e.preventDefault();
                    if (nextParam === 'results') {
                        alert(`🎓 Welcome, ${studentUser.name} (${studentUser.roll_no})! Loading Academic Scoreboard.`);
                        window.location.href = 'results.html';
                    } else {
                        alert(`🎓 Welcome, ${studentUser.name} (${studentUser.roll_no})! Entering Examination Session.`);
                        window.location.href = `exam.html?subject=${targetSubject}`;
                    }
                }
            }
        });
    }

    // ========================================================
    // D. EXAM SESSION CONTROLLER & PROTECTED MODE GATEWAY (exam.html)
    // ========================================================
    const examForm = document.getElementById('examForm');
    const loginRequiredNotice = document.getElementById('loginRequiredNotice');
    const lockedNotice = document.getElementById('lockedPaperNotice');
    const timerBar = document.getElementById('timerBar');

    // --- Dynamic Question Renderer ---
    // Picks `numQs` random questions from the pool for a subject,
    // renders them into the target section div, returns the answer key map.
    function renderDynamicQuestions(subjectCode, targetSectionId, numQs, customPool) {
        const targetSection = document.getElementById(targetSectionId);
        if (!targetSection) return null;

        // Determine question pool
        const pool = (Array.isArray(customPool) && customPool.length > 0) ? customPool : getAllQuestions(subjectCode);
        const subjectLabels = { WT: 'Web Development', DS: 'Data Structures & Algorithms', DBMS: 'Database Management Systems' };
        const extrasList = getExtraSubjects();
        const customObj = extrasList.find(e => e.code.toUpperCase() === subjectCode.toUpperCase());
        const subjectLabel = customObj ? customObj.name : (subjectLabels[subjectCode] || subjectCode);

        // Determine how many questions to show
        let count = parseInt(numQs, 10);
        if (!count || count < 1) {
            if (customObj && customObj.num_questions) {
                count = parseInt(customObj.num_questions, 10) || 5;
            } else {
                const baseCfg = getBaseQConfig();
                count = baseCfg[subjectCode] || 5;
            }
        }
        count = Math.min(count, pool.length || count); // Don't exceed available questions

        if (!pool.length) {
            targetSection.innerHTML = `
                <article class="ui-card hover-lift question-card text-center py-40">
                    <h3>📝 Question Bank In Preparation</h3>
                    <p class="text-muted">No multiple-choice questions have been enrolled for <strong>${escapeHtml(subjectLabel)} (${escapeHtml(subjectCode)})</strong> yet.<br>
                    Faculty can insert questions through the Admin Control Console.</p>
                </article>
            `;
            return null;
        }

        // Shuffle pool (Fisher-Yates) and take `count` questions
        const shuffled = [...pool];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const selected = shuffled.slice(0, count);
        const totalQs = selected.length;

        // Marks per question = 10 / totalQs (rounded to 2 decimal places for display)
        const marksPerQ = (10 / totalQs).toFixed(2);

        // Build answer key map: { q1: 'B', q2: 'C', ... }
        const dynamicAnswerKey = {};
        selected.forEach((q, idx) => {
            dynamicAnswerKey[`q${idx + 1}`] = q.correct_opt;
        });

        // Store total Qs and marks-per-Q on the form for scoring
        const formSubjectCodeEl = document.getElementById('formSubjectCode');
        if (formSubjectCodeEl) {
            formSubjectCodeEl.setAttribute('data-num-qs', totalQs);
            formSubjectCodeEl.setAttribute('data-marks-per-q', marksPerQ);
        }

        // Render HTML with question_ids hidden inputs and radio options
        targetSection.innerHTML = selected.map((q, idx) => {
            const qNum = idx + 1;
            const qId  = q.id || qNum;
            const opts = ['A', 'B', 'C', 'D'];
            const optTexts = { A: q.opt_a, B: q.opt_b, C: q.opt_c || '', D: q.opt_d || '' };
            const optCards = opts.filter(o => optTexts[o]).map(opt => `
                <div class="option-card">
                    <input type="radio" id="dyn_q${qNum}_${opt.toLowerCase()}" name="q${qNum}" value="${opt}" data-qid="${qId}"${qNum === 1 ? ' required' : ''}>
                    <label for="dyn_q${qNum}_${opt.toLowerCase()}">${opt}) ${escapeHtml(optTexts[opt])}</label>
                </div>
            `).join('');
            return `
                <article class="ui-card hover-lift question-card">
                    <div class="question-header">
                        <span class="question-number">Question ${qNum} of ${totalQs} (${escapeHtml(subjectLabel)})</span>
                        <span class="question-points">+${marksPerQ} Marks</span>
                    </div>
                    <input type="hidden" name="question_ids[]" value="${qId}">
                    <p class="question-text">${escapeHtml(q.question_text)}</p>
                    ${optCards}
                </article>
            `;
        }).join('');

        // Re-attach option selection feedback for newly rendered cards
        targetSection.querySelectorAll('.option-card input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const name = radio.getAttribute('name');
                targetSection.querySelectorAll(`input[name="${name}"]`).forEach(s => {
                    const card = s.closest('.option-card');
                    if (card) card.classList.remove('option-selected');
                });
                const chosen = radio.closest('.option-card');
                if (chosen) chosen.classList.add('option-selected');
            });
        });

        return dynamicAnswerKey;
    }

    if (examForm || loginRequiredNotice) {
        const urlParams = new URLSearchParams(window.location.search);
        const subjectParam = (urlParams.get('subject') || 'WT').toUpperCase();

        const candidateDisplay = document.getElementById('candidateDisplay');
        const formRollNo = document.getElementById('formRollNo');
        const sectionWebDev = document.getElementById('sectionWebDev');
        const sectionDSA = document.getElementById('sectionDSA');
        const displaySubjectName = document.getElementById('displaySubjectName');
        const formSubject = document.getElementById('formSubject');
        const formSubjectCode = document.getElementById('formSubjectCode');
        const btnAuthLogin = document.getElementById('btnAuthLogin');

        // Holds the answer key for the dynamically rendered question set
        let activeDynamicAnswerKey = null;

        // Helper: loads questions from MySQL backend or offline pool, then renders
        function setupAndLoadExam(subjectCode, subjectTitle, numQs, targetSectionId) {
            if (displaySubjectName) displaySubjectName.textContent = `Subject: ${subjectTitle} (${subjectCode})`;
            if (formSubject) formSubject.value = subjectTitle;
            if (formSubjectCode) formSubjectCode.value = subjectCode;

            if (window.location.protocol.startsWith('http')) {
                fetch(`../backend/get_questions.php?subject=${encodeURIComponent(subjectCode)}`)
                    .then(res => res.json())
                    .then(data => {
                        let pool = [];
                        if (data && data.status === 'success' && Array.isArray(data.questions) && data.questions.length > 0) {
                            pool = data.questions;
                        } else {
                            pool = getAllQuestions(subjectCode);
                        }
                        activeDynamicAnswerKey = renderDynamicQuestions(subjectCode, targetSectionId, numQs, pool);
                    })
                    .catch(() => {
                        activeDynamicAnswerKey = renderDynamicQuestions(subjectCode, targetSectionId, numQs, getAllQuestions(subjectCode));
                    });
            } else {
                activeDynamicAnswerKey = renderDynamicQuestions(subjectCode, targetSectionId, numQs, getAllQuestions(subjectCode));
            }
        }

        // Initialize exam lobby state after backend sync
        function initExamLobby() {
            // OPTION 2 (PROTECTED MODE): Strictly check authentication
            if (!currentUser) {
                if (timerBar) timerBar.classList.add('hidden');
                if (examForm) examForm.classList.add('hidden');
                if (lockedNotice) lockedNotice.classList.add('hidden');
                if (loginRequiredNotice) {
                    loginRequiredNotice.classList.remove('hidden');
                    if (btnAuthLogin) {
                        btnAuthLogin.setAttribute('href', `login.html?subject=${subjectParam}`);
                    }
                }
                return;
            }

            // Authenticated candidate: Set examinee details
            if (candidateDisplay) {
                candidateDisplay.textContent = `${currentUser.roll_no} (${currentUser.name || 'Candidate'})`;
            }
            if (formRollNo) {
                formRollNo.value = currentUser.roll_no;
            }
            if (loginRequiredNotice) loginRequiredNotice.classList.add('hidden');

            const baseLockState = getBaseLockState();
            let normalizedSubj = subjectParam;
            if (normalizedSubj === 'CS201') normalizedSubj = 'WT';
            else if (normalizedSubj === 'CS202') normalizedSubj = 'DS';
            else if (normalizedSubj === 'CS203') normalizedSubj = 'DBMS';

            const extraSubject = getExtraSubjects().find(s => 
                (s.code && s.code.toUpperCase() === normalizedSubj) ||
                (s.course_code && s.course_code.toUpperCase() === normalizedSubj) ||
                (s.name && s.name.toUpperCase() === normalizedSubj)
            );

            if (extraSubject) {
                if (extraSubject.status === 'locked') {
                    // LOCKED CUSTOM PAPER
                    if (timerBar) timerBar.classList.add('hidden');
                    if (examForm) examForm.classList.add('hidden');
                    if (lockedNotice) {
                        lockedNotice.classList.remove('hidden');
                        const lockedTitle = document.getElementById('lockedSubjectTitle');
                        if (lockedTitle) lockedTitle.textContent = `${extraSubject.code}: ${extraSubject.name}`;
                    }
                } else {
                    // ACTIVE CUSTOM PAPER
                    if (lockedNotice) lockedNotice.classList.add('hidden');
                    if (timerBar) timerBar.classList.remove('hidden');
                    if (examForm) examForm.classList.remove('hidden');

                    if (sectionWebDev) sectionWebDev.classList.add('hidden');
                    if (sectionDSA) sectionDSA.classList.add('hidden');
                    const sectionDBMS = document.getElementById('sectionDBMS');
                    if (sectionDBMS) sectionDBMS.classList.add('hidden');

                    let sectionCustom = document.getElementById('sectionCustom');
                    if (!sectionCustom) {
                        sectionCustom = document.createElement('div');
                        sectionCustom.id = 'sectionCustom';
                        const submitBox = document.getElementById('submitContainer') || examForm.querySelector('.action-center') || examForm.lastElementChild;
                        if (submitBox && submitBox.parentNode) {
                            submitBox.parentNode.insertBefore(sectionCustom, submitBox);
                        } else {
                            examForm.appendChild(sectionCustom);
                        }
                    }
                    sectionCustom.classList.remove('hidden');
                    setupAndLoadExam(extraSubject.code, extraSubject.name, extraSubject.num_questions, 'sectionCustom');
                }
            } else if (normalizedSubj === 'DBMS') {
                const isDbmsActive = baseLockState['DBMS'] === 'active' || (localStorage.getItem('dbmsUnlocked') === '1');
                if (!isDbmsActive) {
                    if (timerBar) timerBar.classList.add('hidden');
                    if (examForm) examForm.classList.add('hidden');
                    if (lockedNotice) {
                        lockedNotice.classList.remove('hidden');
                        const lockedTitle = document.getElementById('lockedSubjectTitle');
                        if (lockedTitle) lockedTitle.textContent = 'CS203: Database Management Systems';
                    }
                } else {
                    if (lockedNotice) lockedNotice.classList.add('hidden');
                    if (timerBar) timerBar.classList.remove('hidden');
                    if (examForm) examForm.classList.remove('hidden');
                    if (sectionWebDev) sectionWebDev.classList.add('hidden');
                    if (sectionDSA) sectionDSA.classList.add('hidden');
                    const sectionDBMS = document.getElementById('sectionDBMS');
                    if (sectionDBMS) sectionDBMS.classList.remove('hidden');
                    setupAndLoadExam('DBMS', 'Database Management Systems', getBaseQConfig()['DBMS'], 'sectionDBMS');
                }
            } else if (normalizedSubj === 'DS') {
                if (baseLockState['DS'] === 'locked') {
                    if (timerBar) timerBar.classList.add('hidden');
                    if (examForm) examForm.classList.add('hidden');
                    if (lockedNotice) {
                        lockedNotice.classList.remove('hidden');
                        const lockedTitle = document.getElementById('lockedSubjectTitle');
                        if (lockedTitle) lockedTitle.textContent = 'CS202: Data Structures & Algorithms';
                    }
                } else {
                    if (lockedNotice) lockedNotice.classList.add('hidden');
                    if (timerBar) timerBar.classList.remove('hidden');
                    if (examForm) examForm.classList.remove('hidden');
                    if (sectionWebDev) sectionWebDev.classList.add('hidden');
                    if (sectionDSA) sectionDSA.classList.remove('hidden');
                    const sectionDBMS = document.getElementById('sectionDBMS');
                    if (sectionDBMS) sectionDBMS.classList.add('hidden');
                    setupAndLoadExam('DS', 'Data Structures & Algorithms', getBaseQConfig()['DS'], 'sectionDSA');
                }
            } else if (normalizedSubj === 'WT') {
                // WT (Web Development - Default)
                if (baseLockState['WT'] === 'locked') {
                    if (timerBar) timerBar.classList.add('hidden');
                    if (examForm) examForm.classList.add('hidden');
                    if (lockedNotice) {
                        lockedNotice.classList.remove('hidden');
                        const lockedTitle = document.getElementById('lockedSubjectTitle');
                        if (lockedTitle) lockedTitle.textContent = 'CS201: Web Development';
                    }
                } else {
                    if (lockedNotice) lockedNotice.classList.add('hidden');
                    if (timerBar) timerBar.classList.remove('hidden');
                    if (examForm) examForm.classList.remove('hidden');
                    if (sectionWebDev) sectionWebDev.classList.remove('hidden');
                    if (sectionDSA) sectionDSA.classList.add('hidden');
                    const sectionDBMS = document.getElementById('sectionDBMS');
                    if (sectionDBMS) sectionDBMS.classList.add('hidden');
                    setupAndLoadExam('WT', 'Web Development', getBaseQConfig()['WT'], 'sectionWebDev');
                }
            } else {
                // Unrecognized subject code
                if (timerBar) timerBar.classList.add('hidden');
                if (examForm) examForm.classList.add('hidden');
                if (lockedNotice) {
                    lockedNotice.classList.remove('hidden');
                    const lockedTitle = document.getElementById('lockedSubjectTitle');
                    if (lockedTitle) lockedTitle.textContent = `Course Not Found: ${subjectParam}`;
                    const lockedDesc = lockedNotice.querySelector('.locked-desc');
                    if (lockedDesc) {
                        lockedDesc.textContent = `The examination paper for code "${subjectParam}" has not been scheduled or registered in the curriculum.`;
                    }
                }
            }
        }

        // Initialize lobby — sync with backend first if on server
        if (window.location.protocol.startsWith('http')) {
            syncSubjectsFromBackend(initExamLobby);
        } else {
            initExamLobby();
        }

            // Dual-mode exam submission:
            // If running on file:// or static server (without PHP parser), evaluate client-side
            examForm.addEventListener('submit', (e) => {
                const isStaticMode = window.location.protocol === 'file:' || window.location.port === '5500';
                if (isStaticMode) {
                    e.preventDefault();

                    const currSubjCode = formSubjectCode ? formSubjectCode.value : 'WT';

                    // Use the dynamically rendered question answer key (random questions picked at load time)
                    // Falls back to built-in defaults if dynamic render didn't run
                    const fallbackKeys = {
                        'WT':   { q1: 'B', q2: 'A', q3: 'B', q4: 'B', q5: 'B' },
                        'DS':   { q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'C' },
                        'DBMS': { q1: 'B', q2: 'C', q3: 'B', q4: 'C', q5: 'C' }
                    };
                    const activeKey = activeDynamicAnswerKey || fallbackKeys[currSubjCode] || fallbackKeys['WT'];
                    const totalQs = Object.keys(activeKey).length || 5;

                    // Read marks-per-question from data attr (set by renderDynamicQuestions)
                    let marksPerQ = 2.0;
                    if (formSubjectCode) {
                        const mpqAttr = parseFloat(formSubjectCode.getAttribute('data-marks-per-q'));
                        if (mpqAttr && mpqAttr > 0) marksPerQ = mpqAttr;
                    }
                    const totalMarks = parseFloat((marksPerQ * totalQs).toFixed(2));

                    let correctCount = 0;
                    for (let q = 1; q <= totalQs; q++) {
                        const chosen = document.querySelector(`input[name="q${q}"]:checked`);
                        if (chosen && chosen.value === activeKey[`q${q}`]) {
                            correctCount++;
                        }
                    }

                    const score = parseFloat((correctCount * marksPerQ).toFixed(2));
                    const percentage = (score / totalMarks) * 100;
                    let letterGrade = 'F';
                    let gradePoint = 0;

                    if (percentage >= 90) { letterGrade = 'A+'; gradePoint = 10; }
                    else if (percentage >= 80) { letterGrade = 'A'; gradePoint = 9; }
                    else if (percentage >= 70) { letterGrade = 'B+'; gradePoint = 8; }
                    else if (percentage >= 60) { letterGrade = 'B'; gradePoint = 7; }
                    else if (percentage >= 50) { letterGrade = 'C+'; gradePoint = 6; }
                    else if (percentage >= 40) { letterGrade = 'C'; gradePoint = 5; }
                    else if (percentage >= 35) { letterGrade = 'D'; gradePoint = 4; }
                    else { letterGrade = 'F'; gradePoint = 0; }

                    const courseCode = currSubjCode === 'WT' ? 'CS201' : (currSubjCode === 'DS' ? 'CS202' : (currSubjCode === 'DBMS' ? 'CS203' : currSubjCode));
                    const examResult = {
                        roll_no: currentUser.roll_no,
                        name: currentUser.name || 'Candidate',
                        subject_code: currSubjCode,
                        course_code: courseCode,
                        subject_name: formSubject ? formSubject.value : 'Web Development',
                        score: score,
                        total_marks: totalMarks,
                        percentage: percentage,
                        grade: letterGrade,
                        grade_point: gradePoint
                    };

                    sessionStorage.setItem('lastExamResult', JSON.stringify(examResult));
                    alert(`✅ Examination Submitted Successfully!\nObtained Score: ${score}/${totalMarks} (${percentage.toFixed(1)}%)\nIIIT Kota Grade: ${letterGrade} (${gradePoint} Points)\n\nNavigating to your verified scorecard...`);
                    window.location.href = `results.html?roll_no=${encodeURIComponent(currentUser.roll_no)}`;
                }
            });
        }
    }

    // ========================================================
    // E. SEARCH-DRIVEN SCORECARD CONTROLLER (results.html)
    // ========================================================
    const scorecardSearchForm      = document.getElementById('scorecardSearchForm');
    const marksheetSection         = document.getElementById('marksheetSection');
    const initialSearchNotice      = document.getElementById('initialSearchNotice');
    const noRecordNotice           = document.getElementById('noRecordNotice');
    const searchedRollText         = document.getElementById('searchedRollText');
    const filterRollInput          = document.getElementById('filter_roll');
    const loginRequiredNoticeResults = document.getElementById('loginRequiredNotice');
    const protectedScoreboardContent = document.getElementById('protectedScoreboardContent');
    const scorecardSearchTitle     = document.getElementById('scorecardSearchTitle');
    const studentScorecardBanner   = document.getElementById('studentScorecardBanner');
    const adminCandidateSelectCol  = document.getElementById('adminCandidateSelectCol');
    const selectCandidate          = document.getElementById('select_candidate');
    const filterRollLabel          = document.getElementById('filterRollLabel');
    const scorecardSearchHint      = document.getElementById('scorecardSearchHint');
    const btnSearchRecords         = document.getElementById('btnSearchRecords');
    const searchRollCol            = document.getElementById('searchRollCol');
    const scorecardTableBody       = document.getElementById('scorecardTableBody');

    // Only activate if we're on results.html (marksheetSection exists)
    if (marksheetSection && initialSearchNotice) {

        // ----------------------------------------------------------------
        // STEP 1: Gate — block unauthenticated access immediately
        // ----------------------------------------------------------------
        if (!currentUser) {
            if (loginRequiredNoticeResults) loginRequiredNoticeResults.classList.remove('hidden');
            if (protectedScoreboardContent) protectedScoreboardContent.classList.add('hidden');
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            return; // Stop all further execution on this page
        }

        // Authenticated: show protected content, hide login notice
        if (loginRequiredNoticeResults) loginRequiredNoticeResults.classList.add('hidden');
        if (protectedScoreboardContent) protectedScoreboardContent.classList.remove('hidden');

        const isAdmin = currentUser.role === 'admin';

        // ----------------------------------------------------------------
        // STEP 2: Role-Based UI Configuration
        // ----------------------------------------------------------------
        if (isAdmin) {
            // ── ADMIN VIEW ──
            if (scorecardSearchTitle) scorecardSearchTitle.innerHTML = '🛡️ Faculty Admin &mdash; Candidate Marksheet &amp; Result Verification Console';
            if (studentScorecardBanner) studentScorecardBanner.classList.add('hidden');
            if (adminCandidateSelectCol) adminCandidateSelectCol.classList.remove('hidden');
            if (searchRollCol) searchRollCol.classList.remove('hidden');
            if (scorecardSearchHint) scorecardSearchHint.textContent = '* Admin Mode: Quick-select any enrolled candidate, enter Roll Number, or type "ALL" to inspect verified marksheets.';
            if (filterRollInput) filterRollInput.removeAttribute('readonly');

            // Sync quick-select → search input → filter
            if (selectCandidate) {
                selectCandidate.addEventListener('change', () => {
                    const selVal = selectCandidate.value;
                    if (filterRollInput) filterRollInput.value = selVal;
                    applyScorecardFilter(selVal);
                });
            }

        } else {
            // ── STUDENT VIEW: Strict Privacy ──
            if (scorecardSearchTitle) scorecardSearchTitle.innerHTML = '🎓 My Official Examination Marksheet &amp; Academic Transcript';

            // Show identity banner with authenticated name & roll number
            if (studentScorecardBanner) {
                studentScorecardBanner.classList.remove('hidden');
                const nameEl = document.getElementById('studentBannerName');
                const rollEl = document.getElementById('studentBannerRoll');
                if (nameEl) nameEl.textContent = currentUser.name || 'Candidate';
                if (rollEl) rollEl.textContent  = currentUser.roll_no;
            }

            // Student privacy: hide candidate selector and roll input completely
            if (adminCandidateSelectCol) adminCandidateSelectCol.classList.add('hidden');
            if (searchRollCol) searchRollCol.classList.add('hidden');

            if (scorecardSearchHint) scorecardSearchHint.textContent = '🔒 Student Privacy Protected: Under IIIT Kota Ordinances, you may only view your own verified marksheet.';
            if (btnSearchRecords) btnSearchRecords.textContent = 'Refresh My Marksheet ➔';
        }

        // ----------------------------------------------------------------
        // STEP 3: Live Backend Renderer with Offline Fallback
        // ----------------------------------------------------------------
        const filterSubjectSelect = document.getElementById('filter_subject');

        function renderLiveRecords(records, targetRoll, targetSubject = 'ALL') {
            if (!scorecardTableBody) return false;

            // Filter by subject if specified
            let filteredRecords = records;
            if (targetSubject && targetSubject !== 'ALL') {
                const subQuery = targetSubject.toUpperCase();
                filteredRecords = records.filter(r => 
                    (r.course_code && r.course_code.toUpperCase() === subQuery) ||
                    (r.subject && r.subject.toUpperCase() === subQuery) ||
                    (r.subject_code && r.subject_code.toUpperCase() === subQuery)
                );
            }

            // Group records by roll_no
            const grouped = {};
            filteredRecords.forEach(r => {
                const roll = r.roll_no.toUpperCase();
                if (!grouped[roll]) grouped[roll] = [];
                grouped[roll].push(r);
            });

            // Also check recently submitted in-memory exam
            const recentRaw = sessionStorage.getItem('lastExamResult');
            if (recentRaw) {
                try {
                    const recent = JSON.parse(recentRaw);
                    const rRoll = recent.roll_no.toUpperCase();
                    const subMatch = (!targetSubject || targetSubject === 'ALL') ||
                        (recent.subject_code && recent.subject_code.toUpperCase() === targetSubject.toUpperCase()) ||
                        (recent.course_code && recent.course_code.toUpperCase() === targetSubject.toUpperCase()) ||
                        (recent.subject_name && recent.subject_name.toUpperCase() === targetSubject.toUpperCase());

                    if ((targetRoll === 'ALL' || rRoll === targetRoll) && subMatch) {
                        if (!grouped[rRoll]) grouped[rRoll] = [];
                        // Check if already in grouped list
                        const alreadyExists = grouped[rRoll].some(x => x.subject === recent.subject_name);
                        if (!alreadyExists) {
                            grouped[rRoll].push({
                                roll_no: recent.roll_no,
                                student_name: recent.name || 'Candidate',
                                subject: recent.subject_name,
                                course_code: recent.course_code || (recent.subject_code === 'DS' ? 'CS202' : (recent.subject_code === 'DBMS' ? 'CS203' : (recent.subject_code === 'WT' ? 'CS201' : recent.subject_code))),
                                score: recent.score,
                                total_marks: recent.total_marks || 10,
                                grade: recent.grade,
                                grade_point: recent.grade_point
                            });
                        }
                    }
                } catch (e) {}
            }

            const rollKeys = Object.keys(grouped);
            if (!rollKeys.length) return false;

            let html = '';

            rollKeys.forEach(roll => {
                const list = grouped[roll];
                const studentName = list[0].student_name || 'Candidate';
                const rowCount = list.length;
                let totalScored = 0;
                let totalMax = 0;
                let totalGradePoints = 0;

                list.forEach((item, idx) => {
                    totalScored += Number(item.score);
                    totalMax    += Number(item.total_marks);
                    totalGradePoints += Number(item.grade_point);

                    const scoreClass = item.score >= 8 ? 'score-good' : (item.score >= 5 ? 'score-mid' : 'score-low');
                    const badgeClass = item.score >= 8 ? 'badge-grade-top' : 'badge-grade-pass';
                    const gradeRaw = String(item.grade || '');
                    const displayGrade = gradeRaw.includes('Pts') ? gradeRaw : `${gradeRaw} (${item.grade_point} Pts)`;

                    html += `<tr class="student-record" data-roll="${escapeHtml(roll)}">`;
                    if (idx === 0) {
                        html += `
                            <td rowspan="${rowCount}" class="td-student-roll">${escapeHtml(roll)}</td>
                            <td rowspan="${rowCount}" class="td-student-name">
                                ${escapeHtml(studentName)}<br>
                                <small class="td-student-sub">B.Tech CSE - IIIT Kota</small>
                            </td>
                        `;
                    }
                    html += `
                        <td>${escapeHtml(item.course_code)}</td>
                        <td>${escapeHtml(item.subject)}</td>
                        <td class="text-center">${item.total_marks}</td>
                        <td class="${scoreClass}">${item.score}</td>
                        <td class="text-center"><span class="${badgeClass}">${escapeHtml(displayGrade)}</span></td>
                    </tr>`;
                });

                // SGPA Aggregated Row
                const sgpa = rowCount > 0 ? (totalGradePoints / rowCount).toFixed(2) : '0.00';
                const pct  = totalMax > 0 ? ((totalScored / totalMax) * 100).toFixed(1) : '0.0';

                html += `
                    <tr class="total-row student-record" data-roll="${escapeHtml(roll)}">
                        <td colspan="4" class="total-label">Aggregated Performance for ${escapeHtml(roll)}:</td>
                        <td class="text-center">${totalMax}</td>
                        <td class="score-primary">${totalScored}</td>
                        <td class="text-center"><span class="badge-grade-top">SGPA: ${sgpa} (${pct}%)</span></td>
                    </tr>
                `;
            });

            scorecardTableBody.innerHTML = html;
            return true;
        }

        // ----------------------------------------------------------------
        // STEP 4: Core filter function (MySQL API + DOM fallback)
        // ----------------------------------------------------------------
        function applyScorecardFilter(queryRoll, querySubject) {
            const targetRoll = isAdmin
                ? (queryRoll || '').trim().toUpperCase()
                : currentUser.roll_no.trim().toUpperCase();
            const targetSubj = (querySubject !== undefined ? querySubject : (filterSubjectSelect ? filterSubjectSelect.value : 'ALL')) || 'ALL';

            // Admin initial empty state
            if (isAdmin && !targetRoll) {
                if (initialSearchNotice) initialSearchNotice.classList.remove('hidden');
                if (marksheetSection) marksheetSection.classList.add('hidden');
                if (noRecordNotice) noRecordNotice.classList.add('hidden');
                return;
            }

            if (initialSearchNotice) initialSearchNotice.classList.add('hidden');
            if (filterRollInput && isAdmin) filterRollInput.value = targetRoll;

            // Try Live Backend Fetch if connected to a web server
            if (window.location.protocol.startsWith('http')) {
                const fetchUrl = `../backend/get_results.php?roll_no=${encodeURIComponent(targetRoll)}&subject=${encodeURIComponent(targetSubj)}`;
                fetch(fetchUrl)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.status === 'success') {
                            // Update admin candidate dropdown options dynamically if provided
                            if (isAdmin && selectCandidate && data.candidates && data.candidates.length) {
                                const currentVal = selectCandidate.value;
                                let optionsHtml = '<option value="ALL">All Enrolled Candidates (Overview)</option>';
                                data.candidates.forEach(c => {
                                    optionsHtml += `<option value="${escapeHtml(c.roll_no)}">${escapeHtml(c.roll_no)} — ${escapeHtml(c.name)} (B.Tech CSE)</option>`;
                                });
                                selectCandidate.innerHTML = optionsHtml;
                                selectCandidate.value = currentVal || targetRoll || 'ALL';
                            }

                            if (data.records && data.records.length > 0) {
                                const hasRows = renderLiveRecords(data.records, targetRoll, targetSubj);
                                if (hasRows) {
                                    if (marksheetSection) marksheetSection.classList.remove('hidden');
                                    if (noRecordNotice)   noRecordNotice.classList.add('hidden');
                                    return;
                                }
                            }
                        }
                        // If no database records returned, fallback to client-side table
                        fallbackFilter(targetRoll, targetSubj);
                    })
                    .catch(() => {
                        fallbackFilter(targetRoll, targetSubj);
                    });
            } else {
                fallbackFilter(targetRoll, targetSubj);
            }
        }

        function fallbackFilter(targetRoll, targetSubj) {
            let matchCount = 0;
            document.querySelectorAll('.student-record').forEach(row => {
                const rowRoll = (row.getAttribute('data-roll') || '').trim().toUpperCase();
                const rollMatch = targetRoll === 'ALL' || rowRoll === targetRoll;
                let subjMatch = true;
                if (targetSubj && targetSubj !== 'ALL') {
                    const rowText = row.textContent.toUpperCase();
                    subjMatch = rowText.includes(targetSubj.toUpperCase());
                }
                const match = rollMatch && subjMatch;
                row.classList.toggle('hidden', !match);
                if (match) matchCount++;
            });

            if (matchCount > 0) {
                if (marksheetSection) marksheetSection.classList.remove('hidden');
                if (noRecordNotice)   noRecordNotice.classList.add('hidden');
            } else {
                if (marksheetSection) marksheetSection.classList.add('hidden');
                if (noRecordNotice) {
                    noRecordNotice.classList.remove('hidden');
                    if (searchedRollText) searchedRollText.textContent = isAdmin ? targetRoll : currentUser.roll_no;
                }
            }
        }

        // ----------------------------------------------------------------
        // STEP 5: Initial Page Load Initialization
        // ----------------------------------------------------------------
        const urlParams = new URLSearchParams(window.location.search);
        let rollParam   = (urlParams.get('roll_no') || '').trim().toUpperCase();

        if (!isAdmin) {
            // Students: always strictly enforce own roll number
            rollParam = currentUser.roll_no.toUpperCase();
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        } else if (!rollParam) {
            // Admin: default to ALL on first load
            rollParam = 'ALL';
            if (selectCandidate) selectCandidate.value = 'ALL';
            if (filterRollInput) filterRollInput.value = 'ALL';
        } else {
            // Admin arrived with ?roll_no=X
            if (selectCandidate) {
                const matchingOpt = Array.from(selectCandidate.options).find(o => o.value.toUpperCase() === rollParam);
                if (matchingOpt) selectCandidate.value = matchingOpt.value;
            }
        }

        applyScorecardFilter(rollParam);

        if (filterSubjectSelect) {
            filterSubjectSelect.addEventListener('change', () => {
                const currRoll = isAdmin ? (filterRollInput ? filterRollInput.value.trim().toUpperCase() : 'ALL') : currentUser.roll_no;
                applyScorecardFilter(currRoll, filterSubjectSelect.value);
            });
        }

        // ----------------------------------------------------------------
        // STEP 6: Search Form Submit Handler
        // ----------------------------------------------------------------
        if (scorecardSearchForm) {
            scorecardSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const subjVal = filterSubjectSelect ? filterSubjectSelect.value : 'ALL';
                if (isAdmin) {
                    const searchedVal = filterRollInput ? filterRollInput.value.trim().toUpperCase() : 'ALL';
                    if (selectCandidate && searchedVal) {
                        const matchOpt = Array.from(selectCandidate.options).find(o => o.value.toUpperCase() === searchedVal);
                        if (matchOpt) selectCandidate.value = matchOpt.value;
                    }
                    applyScorecardFilter(searchedVal, subjVal);
                    if (window.history && window.history.pushState) {
                        const newUrl = window.location.pathname + (searchedVal ? `?roll_no=${encodeURIComponent(searchedVal)}` : '');
                        window.history.pushState(null, '', newUrl);
                    }
                } else {
                    applyScorecardFilter(currentUser.roll_no, subjVal);
                }
            });
        }
    }

    // ========================================================
    // F. MODAL DIALOG CONTROLLER (No inline styles)
    // ========================================================
    const modalOverlay = document.getElementById('confirmationModal');
    const openModalBtn = document.getElementById('btnOpenModal');
    const closeModalBtn = document.getElementById('btnCancelModal');

    if (openModalBtn && modalOverlay) {
        openModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modalOverlay.classList.add('show');
        });
    }

    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('show');
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('show');
            }
        });
    }

    // ========================================================
    // G. OPTION SELECTION FEEDBACK (Clean CSS class toggle)
    // ========================================================
    const radioOptions = document.querySelectorAll('.option-card input[type="radio"]');
    radioOptions.forEach(radio => {
        radio.addEventListener('change', () => {
            const questionName = radio.getAttribute('name');
            const siblingCards = document.querySelectorAll(`input[name="${questionName}"]`);

            siblingCards.forEach(s => {
                const parentCard = s.closest('.option-card');
                if (parentCard) {
                    parentCard.classList.remove('option-selected');
                }
            });

            const chosenCard = radio.closest('.option-card');
            if (chosenCard) {
                chosenCard.classList.add('option-selected');
            }
        });
    });

});
