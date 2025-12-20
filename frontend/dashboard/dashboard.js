// API Base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Cache for most recently loaded attendance data for client-side filtering
let currentAttendanceData = null;
// Cache for late-stay data for client-side filtering
let currentLateStayData = null;
// Cache for WFO compliance (contains total employees)
let currentWfoCompliance = null;
// Cache for project reports (P101, P102, etc.)
let currentProjectData = {};
// Chat autoscroll flag: true when user is at (or near) bottom
let chatAutoScroll = true;

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datePicker').value = today;
    
    loadDashboard();
});

// Load all dashboard data
async function loadDashboard() {
    const date = document.getElementById('datePicker').value;
    
    try {
        // Load all data in parallel
        const [
            attendanceData,
            lateStayData,
            womenLateStayData,
            wfoCompliance,
            projectP101,
            projectP102
        ] = await Promise.all([
            fetch(`${API_BASE_URL}/attendance/records${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/late-stay/after-8pm${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/late-stay/women-after-8pm${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/wfo-compliance${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/work-balance/project/P101`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/work-balance/project/P102`).then(r => r.json())
        ]);

        // Normalize API shapes: backend may return an array or an object
        if (Array.isArray(attendanceData)) {
            attendanceData = { date: date, attendance_records: attendanceData };
        }
        if (!attendanceData.attendance_records && Array.isArray(attendanceData)) {
            attendanceData.attendance_records = attendanceData;
        }

        // Cache attendance, late-stay and WFO compliance data for local filters/chat, then update stats
        currentAttendanceData = attendanceData;
        currentLateStayData = lateStayData;
        currentWfoCompliance = wfoCompliance;
        // Cache project reports for quick dashboard questions
        currentProjectData = { 'P101': projectP101, 'P102': projectP102 };
        updateStats(attendanceData, lateStayData, womenLateStayData, wfoCompliance);
        
        // Update tables
        updateAttendanceTable(attendanceData);
        updateLateStayTable(lateStayData);
        
        // Update charts
        updateCharts(attendanceData, lateStayData);
        
        // Update project cards
        updateProjectCards([projectP101, projectP102]);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data. Make sure the backend server is running.');
    }
}

// Update statistics cards
function updateStats(attendanceData, lateStayData, womenLateStayData, wfoCompliance) {
    const formatPercent = (val) => {
        const n = typeof val === 'number' ? val : parseFloat(val || '0');
        return `${n.toFixed(2)}%`;
    };

    document.getElementById('totalPresent').textContent = attendanceData.attendance_records?.length || 0;
    document.getElementById('lateStayCount').textContent = lateStayData.total_count || 0;
    document.getElementById('womenLateStay').textContent = womenLateStayData.count || 0;

    // Prefer mode-specific WFO compliance if we have WFO employees, else fallback to overall compliance
    const wfoTotal = wfoCompliance.wfo_total ?? 0;
    const overallPct = wfoCompliance.compliance_percentage ?? 0;
    const wfoPct = (wfoTotal > 0 && typeof wfoCompliance.wfo_compliance_percentage === 'number')
        ? wfoCompliance.wfo_compliance_percentage
        : overallPct;
    document.getElementById('wfoCompliance').textContent = formatPercent(wfoPct);

    // WFH compliance: show mode-specific percentage if there are WFH employees, else 0%
    const wfhEl = document.getElementById('wfhCompliance');
    if (wfhEl) {
        const wfhTotal = wfoCompliance.wfh_total ?? 0;
        const wfhPct = (wfhTotal > 0 && typeof wfoCompliance.wfh_compliance_percentage === 'number')
            ? wfoCompliance.wfh_compliance_percentage
            : 0;
        wfhEl.textContent = formatPercent(wfhPct);
    }
}

// Update attendance table
function updateAttendanceTable(data) {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    if (!data.attendance_records || data.attendance_records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No attendance records found</td></tr>';
        return;
    }
    
    data.attendance_records.forEach(record => {
        const row = document.createElement('tr');
        const isLate = record.checkin_time > '09:00';
        const isLateStay = record.checkout_time >= '20:00';
        
        let statusBadge = '<span class="status-badge status-on-time">On Time</span>';
        if (isLateStay) {
            statusBadge = '<span class="status-badge status-late-stay">Late Stay</span>';
        } else if (isLate) {
            statusBadge = '<span class="status-badge status-late">Late Arrival</span>';
        }
        
        row.innerHTML = `
            <td>${record.employee_id}</td>
            <td>${record.name || '-'}</td>
            <td>${record.checkin_time}</td>
            <td>${record.checkout_time}</td>
            <td>${record.total_hours || '-'}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update late stay table
function updateLateStayTable(data) {
    const tbody = document.getElementById('lateStayTableBody');
    tbody.innerHTML = '';
    
    if (!data.late_stay_employees || data.late_stay_employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No late stay employees today</td></tr>';
        return;
    }
    
    data.late_stay_employees.forEach(employee => {
        const row = document.createElement('tr');
        const genderCell = employee.gender === 'Female'
            ? `<td style="color:#ef4444;font-weight:600">${employee.gender}</td>`
            : `<td>${employee.gender}</td>`;
        row.innerHTML = `
            <td>${employee.employee_id}</td>
            <td>${employee.name}</td>
            ${genderCell}
            <td>${employee.checkout_time}</td>
            <td>${employee.project_id}</td>
            <td>${employee.office || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Update charts
let attendanceChartInstance = null;
let genderChartInstance = null;

function updateCharts(attendanceData, lateStayData) {
    // Attendance Overview Chart
    const attendanceCtx = document.getElementById('attendanceChart');
    if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
    }
    
    const checkinTimes = attendanceData.attendance_records?.map(r => r.checkin_time) || [];
    const checkoutTimes = attendanceData.attendance_records?.map(r => r.checkout_time) || [];
    
    attendanceChartInstance = new Chart(attendanceCtx, {
        type: 'bar',
        data: {
            labels: attendanceData.attendance_records?.map(r => r.name || r.employee_id) || [],
            datasets: [
                {
                    label: 'Check-in Time',
                    data: checkinTimes.map(t => {
                        const [h, m] = t.split(':');
                        return parseInt(h) + parseInt(m) / 60;
                    }),
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Check-out Time',
                    data: checkoutTimes.map(t => {
                        const [h, m] = t.split(':');
                        return parseInt(h) + parseInt(m) / 60;
                    }),
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return value + ':00';
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                }
            }
        }
    });
    
    // Gender Chart for Late Stay
    const genderCtx = document.getElementById('genderChart');
    if (genderChartInstance) {
        genderChartInstance.destroy();
    }
    
    const genderCounts = {
        'Male': lateStayData.late_stay_employees?.filter(e => e.gender === 'Male').length || 0,
        'Female': lateStayData.late_stay_employees?.filter(e => e.gender === 'Female').length || 0
    };
    
    genderChartInstance = new Chart(genderCtx, {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [genderCounts.Male, genderCounts.Female],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        padding: 15
                    }
                }
            }
        }
    });
}

// Update project cards
function updateProjectCards(projects) {
    const container = document.getElementById('projectCards');
    container.innerHTML = '';
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <h3>${project.project_name}</h3>
            <div class="project-metric">
                <span class="project-metric-label">Average Work Hours</span>
                <span class="project-metric-value">${project.average_work_hours}</span>
            </div>
            <div class="project-metric">
                <span class="project-metric-label">Late Night Frequency</span>
                <span class="project-metric-value">${project.late_night_frequency}</span>
            </div>
            <div class="project-metric">
                <span class="project-metric-label">Total Employees</span>
                <span class="project-metric-value">${project.total_employees}</span>
            </div>
            <div class="project-metric">
                <span class="project-metric-label">Night Shift Required</span>
                <span class="project-metric-value">${project.requires_night_shift ? 'Yes' : 'No'}</span>
            </div>
            <div class="project-recommendation">
                <strong>💡 Recommendation:</strong> ${project.recommendation}
            </div>
        `;
        container.appendChild(card);
    });
}

// Toggle filter: prompt for Employee ID and filter attendance table locally
function toggleFilter() {
    if (!currentAttendanceData || !currentAttendanceData.attendance_records) {
        showError('No attendance data available to filter.');
        return;
    }

    const input = prompt('Enter Employee ID to filter (partial allowed). Leave blank to clear filter:');
    if (input === null) return; // cancelled

    const query = input.trim();
    if (query === '') {
        // Clear filter
        updateAttendanceTable(currentAttendanceData);
        return;
    }

    const q = query.toLowerCase();
    const filtered = currentAttendanceData.attendance_records.filter(r => {
        const id = String(r.employee_id || '').toLowerCase();
        return id.includes(q);
    });

    updateAttendanceTable({ attendance_records: filtered });
}

// Toggle filter for Late Stay: prompt for Employee ID and filter late-stay table locally
function toggleLateStayFilter() {
    if (!currentLateStayData || !currentLateStayData.late_stay_employees) {
        showError('No late-stay data available to filter.');
        return;
    }

    const input = prompt('Enter Employee ID to filter late-stay list (partial allowed). Leave blank to clear:');
    if (input === null) return; // cancelled

    const query = input.trim();
    if (query === '') {
        updateLateStayTable(currentLateStayData);
        return;
    }

    const q = query.toLowerCase();
    const filtered = currentLateStayData.late_stay_employees.filter(e => {
        const id = String(e.employee_id || '').toLowerCase();
        return id.includes(q);
    });

    updateLateStayTable({ late_stay_employees: filtered, total_count: filtered.length });
}

// Clear any client-side late-stay filter and restore the table
function clearLateStayFilter() {
    if (!currentLateStayData || !currentLateStayData.late_stay_employees) {
        showError('No late-stay data available to clear filter.');
        return;
    }
    updateLateStayTable(currentLateStayData);
}

// Clear any client-side attendance filter and restore the attendance table
function clearFilter() {
    if (!currentAttendanceData || !currentAttendanceData.attendance_records) {
        showError('No attendance data available to clear filter.');
        return;
    }
    updateAttendanceTable(currentAttendanceData);
}

// Toggle status filter for Today's Attendance
function toggleStatusFilter() {
    if (!currentAttendanceData || !currentAttendanceData.attendance_records) {
        showError('No attendance data available to filter.');
        return;
    }

    const input = prompt('Enter status to filter (on-time, late-arrival, late-stay). Leave blank to clear:');
    if (input === null) return; // cancelled

    const query = input.trim().toLowerCase();
    if (query === '') {
        updateAttendanceTable(currentAttendanceData);
        return;
    }

    const q = query;
    const filtered = currentAttendanceData.attendance_records.filter(r => {
        const checkout = r.checkout_time || '';
        const checkin = r.checkin_time || '';
        const isLateStay = checkout >= '20:00';
        const isLate = checkin > '09:00';
        let status = 'on-time';
        if (isLateStay) status = 'late-stay';
        else if (isLate) status = 'late-arrival';
        return status === q;
    });

    updateAttendanceTable({ attendance_records: filtered });
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ------------------ Chat widget (dashboard-specific quick questions) ------------------
const CHAT_QUICK_QS = [
    { id: 'total-employees', label: 'How many total employees are in the system?' },
    { id: 'present-today', label: 'How many employees are present today?' },
    { id: 'total-late-stay', label: 'How many total late-stay employees today?' },
    { id: 'women-late-stay', label: 'How many women were in late stay today?' },
    { id: 'list-late-stay', label: 'Who are the late-stay employees today?' },
    { id: 'wfo-compliance-percentage', label: 'What is WFO compliance percentage today?' },
    { id: 'wfh-compliance-percentage', label: 'What is WFH compliance percentage today?' },
    { id: 'project-P101-average', label: 'What is average work hours for project P101?' },
    { id: 'project-P102-average', label: 'What is average work hours for project P102?' },
    { id: 'projects-high-late-night', label: 'Which projects have high late-night frequency?' },
    { id: 'projects-night-shift', label: 'Which projects require night shift?' },
    { id: 'project-P101-recommendation', label: 'Recommendation for project P101' },
    { id: 'project-P102-recommendation', label: 'Recommendation for project P102' }
];

function initChatWidget() {
    const toggle = document.getElementById('chatToggle');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const quickContainer = document.getElementById('chatQuickQuestions');
    const messages = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    const clearBtn = document.getElementById('chatClear');

    // Always show latest message; users can still scroll up manually if they want

    // Render quick questions
    CHAT_QUICK_QS.forEach(q => {
        const btn = document.createElement('button');
        btn.textContent = q.label;
        btn.onclick = () => handleQuickQuestionClick(q.id);
        quickContainer.appendChild(btn);
    });

    toggle.addEventListener('click', () => toggleChatPanel(true));
    closeBtn.addEventListener('click', () => toggleChatPanel(false));

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (!confirm('Clear chat history?')) return;
            messages.innerHTML = '';
            addMessage('bot', 'Hello 👋 Welcome to Win chatbot I can answer questions related to attendance and late stay. Click a quick question or type your own.');
        });
    }
    send.addEventListener('click', () => handleSendMessage());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSendMessage(); });

    // welcome message
    addMessage('bot', 'Hello 👋 Welcome to Win chatbot I can answer questions related to attendance and late stay. Click a quick question or type your own.');
}

function toggleChatPanel(open) {
    const panel = document.getElementById('chatPanel');
    if (open) {
        panel.setAttribute('aria-hidden', 'false');
        panel.style.display = 'flex';
        document.getElementById('chatToggle').style.display = 'none';
    } else {
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
        document.getElementById('chatToggle').style.display = 'inline-block';
    }
}

function addMessage(role, text, forceScroll = false) {
    const messages = document.getElementById('chatMessages');
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
    msg.textContent = text;
    messages.appendChild(msg);
    // Always scroll to the newest message so latest answer is visible
    setTimeout(() => {
        messages.scrollTop = messages.scrollHeight;
    }, 50);
}

function sendBotAnswer(text, forceScroll = false) {
    addMessage('bot', text, forceScroll);
    // friendly follow-up and ensure visible
    setTimeout(() => {
        addMessage('bot', 'Do you have any other queries? Thank you 😊', forceScroll);
    }, 350);
}

function handleQuickQuestionClick(id) {
    const question = CHAT_QUICK_QS.find(q => q.id === id);
    if (!question) return;
    try { toggleChatPanel(true); } catch (e) { /* ignore if not available */ }
    addMessage('user', question.label, true);

    // handle dashboard-specific questions using cached data
    switch (id) {
        case 'total-employees': {
            if (currentWfoCompliance && typeof currentWfoCompliance.total_employees === 'number') {
                return setTimeout(() => sendBotAnswer(`Total employees: ${currentWfoCompliance.total_employees}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Total employees not available — refresh dashboard.', true), 300);
        }
        case 'present-today': {
            const present = (currentWfoCompliance && typeof currentWfoCompliance.present_employees === 'number')
                ? currentWfoCompliance.present_employees
                : (currentAttendanceData && Array.isArray(currentAttendanceData.attendance_records) ? currentAttendanceData.attendance_records.length : null);
            if (present !== null) return setTimeout(() => sendBotAnswer(`Present today: ${present}`, true), 300);
            return setTimeout(() => sendBotAnswer('Present count not available — refresh dashboard.', true), 300);
        }
        case 'total-late-stay': {
            if (currentLateStayData && typeof currentLateStayData.total_count === 'number') {
                return setTimeout(() => sendBotAnswer(`Total late-stay employees: ${currentLateStayData.total_count}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Late-stay count not available — refresh dashboard.', true), 300);
        }
        case 'women-late-stay': {
            if (currentLateStayData) {
                const femaleCount = typeof currentLateStayData.female_count === 'number'
                    ? currentLateStayData.female_count
                    : (Array.isArray(currentLateStayData.late_stay_employees) ? currentLateStayData.late_stay_employees.filter(e => e.gender === 'Female').length : null);
                if (femaleCount !== null) return setTimeout(() => sendBotAnswer(`Women in late stay today: ${femaleCount}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Women late-stay data not available — refresh dashboard.', true), 300);
        }
        case 'list-late-stay': {
            if (currentLateStayData && Array.isArray(currentLateStayData.late_stay_employees)) {
                const names = currentLateStayData.late_stay_employees.map(e => `${e.name || e.employee_id} (${e.checkout_time || '-'})`);
                const text = names.length ? names.join(', ') : 'No late-stay employees today.';
                return setTimeout(() => sendBotAnswer(`Late-stay employees: ${text}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Late-stay data not available — refresh dashboard.', true), 300);
        }
        case 'wfo-compliance-percentage': {
            if (currentWfoCompliance && typeof currentWfoCompliance.compliance_percentage === 'number') {
                const pct = (typeof currentWfoCompliance.wfo_compliance_percentage === 'number')
                    ? currentWfoCompliance.wfo_compliance_percentage
                    : currentWfoCompliance.compliance_percentage;
                return setTimeout(() => sendBotAnswer(`WFO compliance: ${pct}%`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('WFO compliance data not available — refresh dashboard.', true), 300);
        }
        case 'wfh-compliance-percentage': {
            if (currentWfoCompliance && typeof currentWfoCompliance.wfh_compliance_percentage === 'number') {
                return setTimeout(() => sendBotAnswer(`WFH compliance: ${currentWfoCompliance.wfh_compliance_percentage}%`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('WFH compliance data not available — refresh dashboard.', true), 300);
        }
        case 'project-P101-average':
        case 'project-P102-average': {
            const pid = id.split('-')[1];
            const proj = currentProjectData[pid];
            if (proj && proj.average_work_hours) return setTimeout(() => sendBotAnswer(`${proj.project_name} average work hours: ${proj.average_work_hours}`, true), 300);
            return setTimeout(() => sendBotAnswer(`Project ${pid} data not available — refresh dashboard.`, true), 300);
        }
        case 'projects-high-late-night': {
            const high = [];
            Object.keys(currentProjectData).forEach(k => {
                const p = currentProjectData[k];
                if (p && p.late_night_frequency === 'High') high.push(p.project_name || k);
            });
            const text = high.length ? high.join(', ') : 'No projects with high late-night frequency.';
            return setTimeout(() => sendBotAnswer(`High late-night projects: ${text}`, true), 300);
        }
        case 'projects-night-shift': {
            const need = [];
            Object.keys(currentProjectData).forEach(k => {
                const p = currentProjectData[k];
                if (p && p.requires_night_shift) need.push(p.project_name || k);
            });
            const text = need.length ? need.join(', ') : 'No projects require night shift.';
            return setTimeout(() => sendBotAnswer(`Projects requiring night shift: ${text}`, true), 300);
        }
        case 'project-P101-recommendation':
        case 'project-P102-recommendation': {
            const pid = id.split('-')[1];
            const proj = currentProjectData[pid];
            if (proj && proj.recommendation) return setTimeout(() => sendBotAnswer(`Recommendation for ${proj.project_name}: ${proj.recommendation}`, true), 300);
            return setTimeout(() => sendBotAnswer(`Recommendation for ${pid} not available — refresh dashboard.`, true), 300);
        }
        default:
            return setTimeout(() => sendBotAnswer('Question not recognized.', true), 300);
    }
}

function handleSendMessage() {
    const input = document.getElementById('chatInput');
    const v = input.value.trim();
    if (!v) return;
    addMessage('user', v);
    input.value = '';

    // Try to match to a known Q by simple keyword checks
    const low = v.toLowerCase();
    let matched = null;
        if (low.includes('total') && low.includes('employee')) matched = 'total-employees';
        else if (low.includes('present')) matched = 'present-today';
        else if (low.includes('late') && (low.includes('total') || low.includes('count') || low.includes('how many'))) matched = 'total-late-stay';
        else if ((low.includes('female') || low.includes('women')) && low.includes('late')) matched = 'women-late-stay';
        else if (low.includes('who') && low.includes('late')) matched = 'list-late-stay';
        else if (low.includes('wfo') || (low.includes('compliance') && !low.includes('wfh'))) matched = 'wfo-compliance-percentage';
        else if (low.includes('wfh') && low.includes('compliance')) matched = 'wfh-compliance-percentage';
        else if (low.includes('p101') && low.includes('average')) matched = 'project-P101-average';
        else if (low.includes('p102') && low.includes('average')) matched = 'project-P102-average';
        else if (low.includes('which') && low.includes('high')) matched = 'projects-high-late-night';
        else if (low.includes('require') && low.includes('night')) matched = 'projects-night-shift';
        else if (low.includes('recommend') && low.includes('p101')) matched = 'project-P101-recommendation';
        else if (low.includes('recommend') && low.includes('p102')) matched = 'project-P102-recommendation';

    if (matched) {
        return handleQuickQuestionClick(matched);
    } else {
        setTimeout(() => addMessage('bot', "I answer dashboard-specific questions. Try: 'How many employees?', 'Who stayed late?', or 'P101 average'"), 400);
    }
}

// Initialize chat when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    try { initChatWidget(); } catch (e) { console.warn('Chat init failed', e); }
});


