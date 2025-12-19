// API Base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Cache for most recently loaded attendance data for client-side filtering
let currentAttendanceData = null;
// Cache for late-stay data for client-side filtering
let currentLateStayData = null;

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

        // Cache attendance and late-stay data for local filters, then update stats
        currentAttendanceData = attendanceData;
        currentLateStayData = lateStayData;
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
    document.getElementById('totalPresent').textContent = attendanceData.attendance_records?.length || 0;
    document.getElementById('lateStayCount').textContent = lateStayData.total_count || 0;
    document.getElementById('womenLateStay').textContent = womenLateStayData.count || 0;
    document.getElementById('wfoCompliance').textContent = `${wfoCompliance.compliance_percentage || 0}%`;
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
        row.innerHTML = `
            <td>${employee.employee_id}</td>
            <td>${employee.name}</td>
            <td>${employee.gender}</td>
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

