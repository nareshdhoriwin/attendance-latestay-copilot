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

// Navigation function to switch between pages
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected page
    const selectedPage = document.getElementById(`page-${pageId}`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-page="${pageId}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Update content when switching pages
    if (pageId === 'attendance' && currentAttendanceData) {
        updateAttendanceTable(currentAttendanceData);
    }
    if (pageId === 'late-stay' && currentLateStayData) {
        updateLateStayTable(currentLateStayData);
    }
    if (pageId === 'reports') {
        // Reload project data for reports page
        loadProjectReports();
    }
}

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
        originalAttendanceData = JSON.parse(JSON.stringify(attendanceData));
        originalLateStayData = JSON.parse(JSON.stringify(lateStayData));
        updateStats(attendanceData, lateStayData, womenLateStayData, wfoCompliance);
        
        // Get active page
        const activePage = document.querySelector('.page-content.active');
        const activePageId = activePage ? activePage.id : 'page-dashboard';
        
        // Update tables (only if on relevant pages)
        if (activePageId === 'page-attendance' || activePageId === 'page-dashboard') {
            updateAttendanceTable(attendanceData);
        }
        if (activePageId === 'page-late-stay' || activePageId === 'page-dashboard') {
            updateLateStayTable(lateStayData);
        }
        
        // Update charts (only on dashboard page)
        if (activePageId === 'page-dashboard') {
            updateCharts(attendanceData, lateStayData);
        }
        
        // Update project cards (only on reports page)
        if (activePageId === 'page-reports') {
            updateProjectCards([projectP101, projectP102]);
        }
        
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
            maintainAspectRatio: false,
            aspectRatio: 2,
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b7280',
                        callback: function(value) {
                            return value + ':00';
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#6b7280'
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.2)'
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
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#6b7280',
                        padding: 10,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        }
    });
}

// Update project cards
function updateProjectCards(projects) {
    const container = document.getElementById('projectCards');
    if (!container) return;
    
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

// Load project reports for reports page
async function loadProjectReports() {
    try {
        const [projectP101, projectP102] = await Promise.all([
            fetch(`${API_BASE_URL}/reports/work-balance/project/P101`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/work-balance/project/P102`).then(r => r.json())
        ]);
        updateProjectCards([projectP101, projectP102]);
    } catch (error) {
        console.error('Error loading project reports:', error);
        showError('Failed to load project reports.');
    }
}

// Store original data for filtering
let originalAttendanceData = null;
let originalLateStayData = null;

// Sort table function
let sortDirection = {};
function sortTable(tableId, columnIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (rows.length === 0) return;
    
    // Skip if it's a loading or empty row
    if (rows.length === 1 && rows[0].querySelector('.loading')) return;
    
    const th = table.querySelectorAll('th')[columnIndex];
    if (!th) return;
    
    // Remove sort classes from all headers
    table.querySelectorAll('th').forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Determine sort direction
    const isAsc = !sortDirection[tableId + columnIndex];
    sortDirection[tableId + columnIndex] = isAsc;
    
    // Add sort class to current header
    th.classList.add(isAsc ? 'sort-asc' : 'sort-desc');
    
    // Sort rows
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex]?.textContent.trim() || '';
        const bText = b.cells[columnIndex]?.textContent.trim() || '';
        
        // Try to parse as number
        const aNum = parseFloat(aText);
        const bNum = parseFloat(bText);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAsc ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        return isAsc 
            ? aText.localeCompare(bText)
            : bText.localeCompare(aText);
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

// Filter attendance table
function filterAttendanceTable() {
    if (!currentAttendanceData || !currentAttendanceData.attendance_records) {
        console.warn('No attendance data available for filtering');
        return;
    }
    
    const searchInput = document.getElementById('attendanceSearch');
    const statusSelect = document.getElementById('statusFilter');
    
    if (!searchInput || !statusSelect) {
        console.warn('Filter elements not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase() || '';
    const statusFilter = statusSelect.value || '';
    
    let filtered = currentAttendanceData.attendance_records.filter(record => {
        // Search filter
        const matchesSearch = !searchTerm || 
            String(record.employee_id || '').toLowerCase().includes(searchTerm) ||
            String(record.name || '').toLowerCase().includes(searchTerm);
        
        // Status filter
        let matchesStatus = true;
        if (statusFilter) {
            const isLate = record.checkin_time > '09:00';
            const isLateStay = record.checkout_time >= '20:00';
            
            if (statusFilter === 'On Time' && (isLate || isLateStay)) {
                matchesStatus = false;
            } else if (statusFilter === 'Late Arrival' && (!isLate || isLateStay)) {
                matchesStatus = false;
            } else if (statusFilter === 'Late Stay' && !isLateStay) {
                matchesStatus = false;
            }
        }
        
        return matchesSearch && matchesStatus;
    });
    
    updateAttendanceTable({ attendance_records: filtered });
}

// Filter late stay table
function filterLateStayTable() {
    if (!currentLateStayData || !currentLateStayData.late_stay_employees) {
        console.warn('No late stay data available for filtering');
        return;
    }
    
    const searchInput = document.getElementById('lateStaySearch');
    const genderSelect = document.getElementById('genderFilter');
    const projectSelect = document.getElementById('projectFilter');
    
    if (!searchInput || !genderSelect || !projectSelect) {
        console.warn('Filter elements not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase() || '';
    const genderFilter = genderSelect.value || '';
    const projectFilter = projectSelect.value || '';
    
    let filtered = currentLateStayData.late_stay_employees.filter(employee => {
        // Search filter
        const matchesSearch = !searchTerm || 
            String(employee.employee_id || '').toLowerCase().includes(searchTerm) ||
            String(employee.name || '').toLowerCase().includes(searchTerm);
        
        // Gender filter
        const matchesGender = !genderFilter || employee.gender === genderFilter;
        
        // Project filter
        const matchesProject = !projectFilter || employee.project_id === projectFilter;
        
        return matchesSearch && matchesGender && matchesProject;
    });
    
    updateLateStayTable({ 
        late_stay_employees: filtered, 
        total_count: filtered.length,
        date: currentLateStayData.date
    });
}

// Clear late stay filters
function clearLateStayFilter() {
    if (document.getElementById('lateStaySearch')) {
        document.getElementById('lateStaySearch').value = '';
    }
    if (document.getElementById('genderFilter')) {
        document.getElementById('genderFilter').value = '';
    }
    if (document.getElementById('projectFilter')) {
        document.getElementById('projectFilter').value = '';
    }
    if (currentLateStayData) {
        updateLateStayTable(currentLateStayData);
    }
}

// Clear attendance filters
function clearFilter() {
    if (document.getElementById('attendanceSearch')) {
        document.getElementById('attendanceSearch').value = '';
    }
    if (document.getElementById('statusFilter')) {
        document.getElementById('statusFilter').value = '';
    }
    if (currentAttendanceData) {
        updateAttendanceTable(currentAttendanceData);
    }
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

