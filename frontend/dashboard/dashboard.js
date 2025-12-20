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
// Cache for compliance data for CSV export
let currentComplianceData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('datePicker');
    
    if (datePicker) {
        datePicker.value = today;
        datePicker.max = today;
    }
    
    const dateExecuteSection = document.getElementById('dateExecuteSection');
    if (dateExecuteSection) {
        dateExecuteSection.style.display = 'flex';
    }
    
    try { 
        initChatWidget(); 
    } catch (e) { 
        console.warn('Chat init failed', e); 
    }
    
    await loadDashboard();
});

// Navigation function to switch between pages
function showPage(pageId) {
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));
    
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const selectedPage = document.getElementById(`page-${pageId}`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }
    
    const selectedTab = document.querySelector(`[data-page="${pageId}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Show/hide date-execute section based on active tab
    const dateExecuteSection = document.getElementById('dateExecuteSection');
    if (dateExecuteSection) {
        if (pageId === 'dashboard') {
            dateExecuteSection.style.display = 'flex';
        } else {
            dateExecuteSection.style.display = 'none';
        }
    }
    
    // Update content when switching pages
    if (pageId === 'attendance' && currentAttendanceData) {
        updateAttendanceTable(currentAttendanceData);
    }
    if (pageId === 'late-stay' && currentLateStayData) {
        updateLateStayTable(currentLateStayData);
    }
    if (pageId === 'reports') {
        // Reload project data and compliance summary for reports page
        loadProjectReports();
        loadComplianceSummary();
    }
}

// Load all dashboard data
async function loadDashboard() {
    const datePicker = document.getElementById('datePicker');
    let date = datePicker ? datePicker.value : null;
    
    // If no date is selected, default to today
    if (!date) {
        const today = new Date().toISOString().split('T')[0];
        date = today;
        if (datePicker) {
            datePicker.value = today;
        }
    }
    
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
            fetch(`${API_BASE_URL}/reports/work-balance/project/P101${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/work-balance/project/P102${date ? `?date=${date}` : ''}`).then(r => r.json())
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
        currentWfoCompliance = wfoCompliance;
        // Cache project reports for quick dashboard questions
        currentProjectData = { 'P101': projectP101, 'P102': projectP102 };
        
        updateStats(attendanceData, lateStayData, womenLateStayData, wfoCompliance);
        
        const activePage = document.querySelector('.page-content.active');
        const activePageId = activePage ? activePage.id : 'page-dashboard';
        
        if (activePageId === 'page-attendance' || activePageId === 'page-dashboard') {
            updateAttendanceTable(attendanceData);
        }
        if (activePageId === 'page-late-stay' || activePageId === 'page-dashboard') {
            updateLateStayTable(lateStayData);
        }
        if (activePageId === 'page-dashboard') {
            updateCharts(attendanceData, lateStayData);
        }
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
    const formatPercent = (val) => {
        const n = typeof val === 'number' ? val : parseFloat(val || '0');
        return `${n.toFixed(2)}%`;
    };

    document.getElementById('totalPresent').textContent = attendanceData.attendance_records?.length || 0;
    document.getElementById('lateStayCount').textContent = lateStayData.total_count || 0;
    document.getElementById('womenLateStay').textContent = womenLateStayData.count || 0;

    // WFO compliance: use mode-specific percentage from API
    // API returns: wfo_total, wfo_present, wfo_compliance_percentage
    const wfoTotal = wfoCompliance?.wfo_total ?? 0;
    const wfoPresent = wfoCompliance?.wfo_present ?? 0;
    let wfoPct = 0;
    
    // Priority: Use API-calculated percentage, then fallback to manual calculation
    if (wfoTotal > 0) {
        if (typeof wfoCompliance?.wfo_compliance_percentage === 'number') {
            wfoPct = wfoCompliance.wfo_compliance_percentage;
        } else if (typeof wfoCompliance?.compliance_percentage === 'number') {
            // Fallback to overall compliance if WFO-specific not available
            wfoPct = wfoCompliance.compliance_percentage;
        } else {
            // Manual calculation as last resort
            wfoPct = (wfoPresent / wfoTotal) * 100;
        }
    }
    
    const wfoEl = document.getElementById('wfoCompliance');
    if (wfoEl) {
        wfoEl.textContent = formatPercent(wfoPct);
    }

    // WFH compliance: use mode-specific percentage from API
    // API returns: wfh_total, wfh_present, wfh_compliance_percentage
    const wfhEl = document.getElementById('wfhCompliance');
    if (wfhEl) {
        const wfhTotal = wfoCompliance?.wfh_total ?? 0;
        const wfhPresent = wfoCompliance?.wfh_present ?? 0;
        let wfhPct = 0;
        
        // Priority: Use API-calculated percentage, then fallback to manual calculation
        if (wfhTotal > 0) {
            if (typeof wfoCompliance?.wfh_compliance_percentage === 'number') {
                wfhPct = wfoCompliance.wfh_compliance_percentage;
            } else {
                // Manual calculation as fallback
                wfhPct = (wfhPresent / wfhTotal) * 100;
            }
        }
        // If wfhTotal is 0, wfhPct remains 0 (no WFH employees)
        
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
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
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
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            },
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
        const dateDisplay = project.date ? `<div class="project-date">📅 Date: ${project.date}</div>` : '';
        const lateStayCount = project.late_stay_count !== undefined ? project.late_stay_count : 0;
        const lateStayEmployees = project.late_stay_employees || [];
        const womenLateStay = lateStayEmployees.filter(e => e.gender === 'Female').length;
        
        card.innerHTML = `
            <h3>${project.project_name}</h3>
            ${dateDisplay}
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
            <div class="project-late-stay-section">
                <h4>🌙 Late Stay Statistics</h4>
                <div class="project-late-stay-stats">
                    <div class="late-stay-stat">
                        <span class="late-stay-label">Total Late Stay</span>
                        <span class="late-stay-value">${lateStayCount}</span>
                    </div>
                    <div class="late-stay-stat">
                        <span class="late-stay-label">Women Late Stay</span>
                        <span class="late-stay-value">${womenLateStay}</span>
                    </div>
                </div>
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
        // Get the date from the date picker (same as dashboard)
        const datePicker = document.getElementById('datePicker');
        const date = datePicker ? datePicker.value : null;
        
        // Load project work balance and late stay data
        const [projectP101, projectP102, lateStayData] = await Promise.all([
            fetch(`${API_BASE_URL}/reports/work-balance/project/P101${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/reports/work-balance/project/P102${date ? `?date=${date}` : ''}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/late-stay/after-8pm${date ? `?date=${date}` : ''}`).then(r => r.json())
        ]);
        
        // Add late stay statistics to each project
        const lateStayByProject = {};
        if (lateStayData && lateStayData.late_stay_employees) {
            lateStayData.late_stay_employees.forEach(emp => {
                const projectId = emp.project_id;
                if (!lateStayByProject[projectId]) {
                    lateStayByProject[projectId] = {
                        count: 0,
                        employees: []
                    };
                }
                lateStayByProject[projectId].count++;
                lateStayByProject[projectId].employees.push(emp);
            });
        }
        
        // Add late stay data to projects
        if (lateStayByProject['P101']) {
            projectP101.late_stay_count = lateStayByProject['P101'].count;
            projectP101.late_stay_employees = lateStayByProject['P101'].employees;
        } else {
            projectP101.late_stay_count = 0;
            projectP101.late_stay_employees = [];
        }
        
        if (lateStayByProject['P102']) {
            projectP102.late_stay_count = lateStayByProject['P102'].count;
            projectP102.late_stay_employees = lateStayByProject['P102'].employees;
        } else {
            projectP102.late_stay_count = 0;
            projectP102.late_stay_employees = [];
        }
        
        // Cache project data for CSV export
        currentProjectData = { 'P101': projectP101, 'P102': projectP102 };
        
        updateProjectCards([projectP101, projectP102]);
    } catch (error) {
        console.error('Error loading project reports:', error);
        showError('Failed to load project reports.');
    }
}

async function loadComplianceSummary() {
    try {
        // Get the date from the date picker
        const datePicker = document.getElementById('datePicker');
        const date = datePicker ? datePicker.value : null;
        
        const complianceData = await fetch(`${API_BASE_URL}/reports/wfo-compliance${date ? `?date=${date}` : ''}`).then(r => r.json());
        
        // Cache compliance data for CSV export
        currentComplianceData = complianceData;
        
        // Update compliance summary card
        document.getElementById('complianceTotalEmployees').textContent = complianceData.total_employees || '-';
        document.getElementById('compliancePresent').textContent = complianceData.present_employees || '-';
        document.getElementById('complianceWFO').textContent = `${complianceData.wfo_compliance_percentage || 0}%`;
        document.getElementById('complianceWFH').textContent = `${complianceData.wfh_compliance_percentage || 0}%`;
        
        const statusEl = document.getElementById('complianceStatus');
        if (statusEl) {
            const status = complianceData.status || 'Unknown';
            statusEl.textContent = status;
            statusEl.className = 'compliance-value status-value ' + (status === 'Compliant' ? 'status-compliant' : 'status-non-compliant');
        }
    } catch (error) {
        console.error('Error loading compliance summary:', error);
        showError('Failed to load compliance summary.');
    }
}

// Helper function to escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

// Download reports as CSV
async function downloadReportsCSV() {
    try {
        // Get the date from the date picker
        const datePicker = document.getElementById('datePicker');
        const date = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
        
        // Format date for display
        const formattedDate = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }) : 'N/A';
        
        // Build CSV content with clean Excel-friendly formatting
        let csvContent = '';
        
        // Header Section (using first column for headers)
        csvContent += `WinAttendance Reports Export,,,\n`;
        csvContent += `Report Date,${escapeCSV(formattedDate)},,\n`;
        csvContent += `Generated On,${escapeCSV(new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }))},,\n`;
        csvContent += `,,\n`;
        
        // SECTION 1: EXECUTIVE SUMMARY
        csvContent += `EXECUTIVE SUMMARY,,,\n`;
        csvContent += `,,\n`;
        
        if (currentComplianceData) {
            csvContent += `Metric,Value,,\n`;
            csvContent += `Report Date,${escapeCSV(currentComplianceData.date || date)},,\n`;
            csvContent += `Total Employees,${currentComplianceData.total_employees || 0},,\n`;
            csvContent += `Present Employees,${currentComplianceData.present_employees || 0},,\n`;
            csvContent += `Absent Employees,${currentComplianceData.absent_employees || 0},,\n`;
            csvContent += `Overall Compliance Rate,${currentComplianceData.compliance_percentage || 0}%,,\n`;
            csvContent += `Compliance Status,${escapeCSV(currentComplianceData.status || 'Unknown')},,\n`;
            
            if (currentAttendanceData && currentAttendanceData.attendance_records) {
                csvContent += `Total Attendance Records,${currentAttendanceData.attendance_records.length},,\n`;
            }
            
            if (currentLateStayData) {
                csvContent += `Total Late Stay Employees,${currentLateStayData.total_count || 0},,\n`;
                const womenLateStay = currentLateStayData.late_stay_employees 
                    ? currentLateStayData.late_stay_employees.filter(e => e.gender === 'Female').length 
                    : 0;
                csvContent += `Women Late Stay Count,${womenLateStay},,\n`;
            }
        }
        csvContent += `,,\n`;
        csvContent += `,,\n`;
        
        // SECTION 2: WFO/WFH COMPLIANCE DETAILS
        csvContent += `WFO/WFH COMPLIANCE DETAILS,,,\n`;
        csvContent += `,,\n`;
        
        if (currentComplianceData) {
            // Overall Compliance Table
            csvContent += `OVERALL COMPLIANCE,,,\n`;
            csvContent += `Category,Total,Present,Absent,Compliance %\n`;
            csvContent += `All Employees,${currentComplianceData.total_employees || 0},${currentComplianceData.present_employees || 0},${currentComplianceData.absent_employees || 0},${currentComplianceData.compliance_percentage || 0}%\n`;
            csvContent += `,,\n`;
            
            // WFO Compliance Table
            csvContent += `WFO (Work From Office) COMPLIANCE,,,\n`;
            csvContent += `Category,Total,Present,Absent,Compliance %\n`;
            csvContent += `WFO Employees,${currentComplianceData.wfo_total || 0},${currentComplianceData.wfo_present || 0},${currentComplianceData.wfo_absent || 0},${currentComplianceData.wfo_compliance_percentage || 0}%\n`;
            csvContent += `,,\n`;
            
            // WFH Compliance Table
            csvContent += `WFH (Work From Home) COMPLIANCE,,,\n`;
            csvContent += `Category,Total,Present,Absent,Compliance %\n`;
            csvContent += `WFH Employees,${currentComplianceData.wfh_total || 0},${currentComplianceData.wfh_present || 0},${currentComplianceData.wfh_absent || 0},${currentComplianceData.wfh_compliance_percentage || 0}%\n`;
        } else {
            csvContent += `No compliance data available,,\n`;
        }
        csvContent += `,,\n`;
        csvContent += `,,\n`;
        
        // SECTION 3: ATTENDANCE RECORDS
        csvContent += `ATTENDANCE RECORDS,,,\n`;
        csvContent += `,,\n`;
        
        if (currentAttendanceData && currentAttendanceData.attendance_records && currentAttendanceData.attendance_records.length > 0) {
            csvContent += `Employee ID,Employee Name,Check-in Time,Check-out Time,Total Hours,Status\n`;
            currentAttendanceData.attendance_records.forEach(record => {
                const isLate = record.checkin_time > '09:00';
                const isLateStay = record.checkout_time >= '20:00';
                let status = 'On Time';
                if (isLateStay) {
                    status = 'Late Stay';
                } else if (isLate) {
                    status = 'Late Arrival';
                }
                
                csvContent += `${escapeCSV(record.employee_id)},${escapeCSV(record.name || '-')},${escapeCSV(record.checkin_time)},${escapeCSV(record.checkout_time)},${escapeCSV(record.total_hours || '-')},${escapeCSV(status)}\n`;
            });
        } else {
            csvContent += `No attendance records available,,\n`;
        }
        csvContent += `,,\n`;
        csvContent += `,,\n`;
        
        // SECTION 4: LATE STAY EMPLOYEES
        csvContent += `LATE STAY EMPLOYEES (After 8:00 PM),,,\n`;
        csvContent += `,,\n`;
        
        if (currentLateStayData && currentLateStayData.late_stay_employees && currentLateStayData.late_stay_employees.length > 0) {
            csvContent += `Employee ID,Employee Name,Gender,Checkout Time,Project ID,Office Location\n`;
            currentLateStayData.late_stay_employees.forEach(emp => {
                csvContent += `${escapeCSV(emp.employee_id)},${escapeCSV(emp.name)},${escapeCSV(emp.gender)},${escapeCSV(emp.checkout_time)},${escapeCSV(emp.project_id)},${escapeCSV(emp.office || '-')}\n`;
            });
            
            // Late Stay Summary
            csvContent += `,,\n`;
            csvContent += `LATE STAY SUMMARY,,,\n`;
            csvContent += `Metric,Count,,\n`;
            csvContent += `Total Late Stay Employees,${currentLateStayData.total_count || 0},,\n`;
            const maleCount = currentLateStayData.late_stay_employees.filter(e => e.gender === 'Male').length;
            const femaleCount = currentLateStayData.late_stay_employees.filter(e => e.gender === 'Female').length;
            csvContent += `Male Employees,${maleCount},,\n`;
            csvContent += `Female Employees,${femaleCount},,\n`;
        } else {
            csvContent += `No late stay employees recorded,,\n`;
        }
        csvContent += `,,\n`;
        csvContent += `,,\n`;
        
        // SECTION 5: PROJECT WORK BALANCE REPORTS
        csvContent += `PROJECT WORK BALANCE REPORTS,,,\n`;
        csvContent += `,,\n`;
        
        // Load project data if not already cached
        if (!currentProjectData || Object.keys(currentProjectData).length === 0) {
            await loadProjectReports();
        }
        
        // Project Summary Table
        csvContent += `PROJECT SUMMARY,,,\n`;
        csvContent += `Project ID,Project Name,Total Employees,Average Work Hours,Late Night Frequency,Late Stay Count,Women Late Stay,Requires Night Shift\n`;
        
        for (const projectId in currentProjectData) {
            const project = currentProjectData[projectId];
            if (project) {
                const womenLateStay = project.late_stay_employees 
                    ? project.late_stay_employees.filter(e => e.gender === 'Female').length 
                    : 0;
                
                csvContent += `${escapeCSV(project.project_id || projectId)},${escapeCSV(project.project_name || projectId)},${project.total_employees || 0},${escapeCSV(project.average_work_hours || 'N/A')},${escapeCSV(project.late_night_frequency || 'N/A')},${project.late_stay_count || 0},${womenLateStay},${project.requires_night_shift ? 'Yes' : 'No'}\n`;
            }
        }
        csvContent += `,,\n`;
        csvContent += `,,\n`;
        
        // Detailed Project Information
        for (const projectId in currentProjectData) {
            const project = currentProjectData[projectId];
            if (project) {
                csvContent += `PROJECT: ${escapeCSV(project.project_name || projectId)} (${projectId}),,,\n`;
                csvContent += `,,\n`;
                
                csvContent += `Project Details,,,\n`;
                csvContent += `Field,Value,,\n`;
                csvContent += `Project ID,${escapeCSV(project.project_id || projectId)},,\n`;
                csvContent += `Project Name,${escapeCSV(project.project_name || projectId)},,\n`;
                csvContent += `Date,${escapeCSV(project.date || date)},,\n`;
                csvContent += `Total Employees,${project.total_employees || 0},,\n`;
                csvContent += `Average Work Hours,${escapeCSV(project.average_work_hours || 'N/A')},,\n`;
                csvContent += `Late Night Frequency,${escapeCSV(project.late_night_frequency || 'N/A')},,\n`;
                csvContent += `Late Night Count,${project.late_night_count || 0},,\n`;
                csvContent += `Requires Night Shift,${project.requires_night_shift ? 'Yes' : 'No'},,\n`;
                csvContent += `Late Stay Count,${project.late_stay_count || 0},,\n`;
                
                const womenLateStay = project.late_stay_employees 
                    ? project.late_stay_employees.filter(e => e.gender === 'Female').length 
                    : 0;
                csvContent += `Women Late Stay,${womenLateStay},,\n`;
                csvContent += `Recommendation,${escapeCSV(project.recommendation || 'N/A')},,\n`;
                csvContent += `,,\n`;
                
                // Late Stay Employees for this Project
                if (project.late_stay_employees && project.late_stay_employees.length > 0) {
                    csvContent += `Late Stay Employees - ${escapeCSV(project.project_name || projectId)},,,\n`;
                    csvContent += `Employee ID,Employee Name,Gender,Checkout Time,Office Location,\n`;
                    project.late_stay_employees.forEach(emp => {
                        csvContent += `${escapeCSV(emp.employee_id)},${escapeCSV(emp.name)},${escapeCSV(emp.gender)},${escapeCSV(emp.checkout_time)},${escapeCSV(emp.office || '-')},\n`;
                    });
                } else {
                    csvContent += `Late Stay Employees - ${escapeCSV(project.project_name || projectId)},,,\n`;
                    csvContent += `No late stay employees for this project,,\n`;
                }
                csvContent += `,,\n`;
                csvContent += `,,\n`;
            }
        }
        
        // SECTION 6: STATISTICAL SUMMARY
        csvContent += `STATISTICAL SUMMARY,,,\n`;
        csvContent += `,,\n`;
        
        csvContent += `Metric,Value,,\n`;
        
        if (currentComplianceData) {
            csvContent += `Total Employees,${currentComplianceData.total_employees || 0},,\n`;
            csvContent += `Present Employees,${currentComplianceData.present_employees || 0},,\n`;
            csvContent += `Absent Employees,${currentComplianceData.absent_employees || 0},,\n`;
            csvContent += `Overall Compliance %,${currentComplianceData.compliance_percentage || 0}%,,\n`;
        }
        
        if (currentAttendanceData && currentAttendanceData.attendance_records) {
            const records = currentAttendanceData.attendance_records;
            const lateArrivals = records.filter(r => r.checkin_time > '09:00' && r.checkout_time < '20:00').length;
            const lateStays = records.filter(r => r.checkout_time >= '20:00').length;
            csvContent += `Total Attendance Records,${records.length},,\n`;
            csvContent += `Late Arrivals,${lateArrivals},,\n`;
            csvContent += `Late Stays,${lateStays},,\n`;
        }
        
        if (currentLateStayData) {
            csvContent += `Total Late Stay Employees,${currentLateStayData.total_count || 0},,\n`;
            const femaleCount = currentLateStayData.late_stay_employees 
                ? currentLateStayData.late_stay_employees.filter(e => e.gender === 'Female').length 
                : 0;
            csvContent += `Women Late Stay,${femaleCount},,\n`;
        }
        
        if (currentProjectData && Object.keys(currentProjectData).length > 0) {
            csvContent += `Total Projects,${Object.keys(currentProjectData).length},,\n`;
        }
        
        csvContent += `,,\n`;
        csvContent += `End of Report,,,\n`;
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `WinAttendance_Reports_${date || 'export'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Reports downloaded successfully!');
    } catch (error) {
        console.error('Error downloading reports CSV:', error);
        showError('Failed to download reports. Please try again.');
    }
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

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

// ------------------ Chat widget (all questions available on all tabs) ------------------
const ALL_CHAT_QUESTIONS = [
    // Dashboard & General Questions
    { id: 'total-employees', label: 'How many total employees are in the system?', category: '📊 General' },
    { id: 'present-today', label: 'How many employees are present today?', category: '📊 General' },
    
    // Attendance Questions
    { id: 'late-arrivals', label: 'Who arrived late today?', category: '📋 Attendance' },
    { id: 'early-leavers', label: 'Who left early today?', category: '📋 Attendance' },
    { id: 'highest-hours', label: 'Who worked the most hours today?', category: '📋 Attendance' },
    { id: 'average-work-hours', label: 'What is the average work hours today?', category: '📋 Attendance' },
    
    // Late Stay Questions
    { id: 'total-late-stay', label: 'How many total late-stay employees today?', category: '🌙 Late Stay' },
    { id: 'women-late-stay', label: 'How many women were in late stay today?', category: '🌙 Late Stay' },
    { id: 'list-late-stay', label: 'Who are the late-stay employees today?', category: '🌙 Late Stay' },
    { id: 'late-stay-by-project', label: 'Which project has most late stays?', category: '🌙 Late Stay' },
    { id: 'late-stay-by-office', label: 'Which office has most late stays?', category: '🌙 Late Stay' },
    { id: 'latest-checkout', label: 'Who checked out the latest?', category: '🌙 Late Stay' },
    
    // Reports & Compliance Questions
    { id: 'wfo-compliance-percentage', label: 'What is WFO compliance percentage today?', category: '📈 Reports' },
    { id: 'wfh-compliance-percentage', label: 'What is WFH compliance percentage today?', category: '📈 Reports' },
    { id: 'project-P101-average', label: 'What is average work hours for project P101?', category: '📈 Reports' },
    { id: 'project-P102-average', label: 'What is average work hours for project P102?', category: '📈 Reports' },
    { id: 'projects-high-late-night', label: 'Which projects have high late-night frequency?', category: '📈 Reports' },
    { id: 'projects-night-shift', label: 'Which projects require night shift?', category: '📈 Reports' },
    { id: 'project-P101-recommendation', label: 'Recommendation for project P101', category: '📈 Reports' },
    { id: 'project-P102-recommendation', label: 'Recommendation for project P102', category: '📈 Reports' }
];

// Get current active tab
function getCurrentActiveTab() {
    const activeTab = document.querySelector('.nav-tab.active');
    if (!activeTab) return 'dashboard';
    const dataPage = activeTab.getAttribute('data-page');
    return dataPage || 'dashboard';
}

// Update quick questions - now shows all questions grouped by category
function updateQuickQuestions() {
    const quickContainer = document.getElementById('chatQuickQuestions');
    if (!quickContainer) return;
    
    // Clear existing questions
    quickContainer.innerHTML = '';
    
    // Group questions by category
    const categories = {};
    ALL_CHAT_QUESTIONS.forEach(q => {
        if (!categories[q.category]) {
            categories[q.category] = [];
        }
        categories[q.category].push(q);
    });
    
    // Render questions grouped by category
    Object.keys(categories).forEach(category => {
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'chat-category-header';
        categoryHeader.textContent = category;
        quickContainer.appendChild(categoryHeader);
        
        // Add questions in this category
        categories[category].forEach(q => {
            const btn = document.createElement('button');
            btn.textContent = q.label;
            btn.onclick = () => handleQuickQuestionClick(q.id);
            quickContainer.appendChild(btn);
        });
    });
}

function initChatWidget() {
    const toggle = document.getElementById('chatToggle');
    const panel = document.getElementById('chatPanel');
    const closeBtn = document.getElementById('chatClose');
    const quickContainer = document.getElementById('chatQuickQuestions');
    const messages = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    const clearBtn = document.getElementById('chatClear');

    if (!toggle || !panel || !closeBtn || !quickContainer || !messages || !input || !send) {
        console.warn('Chat widget elements not found');
        return;
    }

    // Render quick questions for the current tab
    updateQuickQuestions();

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

    // Close chat panel when clicking outside
    document.addEventListener('click', (e) => {
        const isClickInsidePanel = panel.contains(e.target);
        const isClickOnToggle = toggle.contains(e.target);
        const isPanelOpen = panel.style.display === 'flex' || panel.getAttribute('aria-hidden') === 'false';
        
        if (!isClickInsidePanel && !isClickOnToggle && isPanelOpen) {
            toggleChatPanel(false);
        }
    });

    // welcome message
    addMessage('bot', 'Hello 👋 Welcome to Win chatbot I can answer questions related to attendance and late stay. Click a quick question or type your own.');
}

function toggleChatPanel(open) {
    const panel = document.getElementById('chatPanel');
    const toggle = document.getElementById('chatToggle');
    if (!panel || !toggle) return;
    
    if (open) {
        panel.setAttribute('aria-hidden', 'false');
        panel.style.display = 'flex';
        toggle.style.display = 'none';
    } else {
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
        toggle.style.display = 'inline-block';
    }
}

function addMessage(role, text, forceScroll = false) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    
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
    const question = ALL_CHAT_QUESTIONS.find(q => q.id === id);
    if (!question) return;
    try { toggleChatPanel(true); } catch (e) { /* ignore if not available */ }
    addMessage('user', question.label, true);

    // handle questions using cached data
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
        case 'late-arrivals': {
            if (currentAttendanceData && Array.isArray(currentAttendanceData.attendance_records)) {
                const lateArrivals = currentAttendanceData.attendance_records.filter(e => 
                    e.status === 'Late Arrival' || (e.checkin_time && e.checkin_time > '09:30:00')
                );
                const names = lateArrivals.map(e => `${e.name || e.employee_id} (${e.checkin_time || '-'})`);
                const text = names.length ? names.join(', ') : 'No late arrivals today.';
                return setTimeout(() => sendBotAnswer(`Late arrivals: ${text}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Attendance data not available — refresh dashboard.', true), 300);
        }
        case 'early-leavers': {
            if (currentAttendanceData && Array.isArray(currentAttendanceData.attendance_records)) {
                const earlyLeavers = currentAttendanceData.attendance_records.filter(e => 
                    e.checkout_time && e.checkout_time < '17:00:00'
                );
                const names = earlyLeavers.map(e => `${e.name || e.employee_id} (${e.checkout_time || '-'})`);
                const text = names.length ? names.join(', ') : 'No early leavers today.';
                return setTimeout(() => sendBotAnswer(`Early leavers: ${text}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Attendance data not available — refresh dashboard.', true), 300);
        }
        case 'highest-hours': {
            if (currentAttendanceData && Array.isArray(currentAttendanceData.attendance_records)) {
                const sorted = [...currentAttendanceData.attendance_records].sort((a, b) => 
                    parseFloat(b.work_hours || 0) - parseFloat(a.work_hours || 0)
                );
                const top = sorted[0];
                if (top) {
                    return setTimeout(() => sendBotAnswer(`Highest hours: ${top.name || top.employee_id} worked ${top.work_hours || 0} hours`, true), 300);
                }
            }
            return setTimeout(() => sendBotAnswer('Attendance data not available — refresh dashboard.', true), 300);
        }
        case 'average-work-hours': {
            if (currentAttendanceData && Array.isArray(currentAttendanceData.attendance_records)) {
                const total = currentAttendanceData.attendance_records.reduce((sum, e) => 
                    sum + parseFloat(e.work_hours || 0), 0
                );
                const avg = (total / currentAttendanceData.attendance_records.length).toFixed(2);
                return setTimeout(() => sendBotAnswer(`Average work hours today: ${avg} hours`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Attendance data not available — refresh dashboard.', true), 300);
        }
        case 'late-stay-by-project': {
            if (currentLateStayData && Array.isArray(currentLateStayData.late_stay_employees)) {
                const projectCounts = {};
                currentLateStayData.late_stay_employees.forEach(e => {
                    const proj = e.project || 'Unknown';
                    projectCounts[proj] = (projectCounts[proj] || 0) + 1;
                });
                const sorted = Object.entries(projectCounts).sort((a, b) => b[1] - a[1]);
                const text = sorted.length ? sorted.map(([proj, count]) => `${proj}: ${count}`).join(', ') : 'No late-stay data.';
                return setTimeout(() => sendBotAnswer(`Late stay by project: ${text}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Late-stay data not available — refresh dashboard.', true), 300);
        }
        case 'late-stay-by-office': {
            if (currentLateStayData && Array.isArray(currentLateStayData.late_stay_employees)) {
                const officeCounts = {};
                currentLateStayData.late_stay_employees.forEach(e => {
                    const office = e.office || 'Unknown';
                    officeCounts[office] = (officeCounts[office] || 0) + 1;
                });
                const sorted = Object.entries(officeCounts).sort((a, b) => b[1] - a[1]);
                const text = sorted.length ? sorted.map(([office, count]) => `${office}: ${count}`).join(', ') : 'No late-stay data.';
                return setTimeout(() => sendBotAnswer(`Late stay by office: ${text}`, true), 300);
            }
            return setTimeout(() => sendBotAnswer('Late-stay data not available — refresh dashboard.', true), 300);
        }
        case 'latest-checkout': {
            if (currentLateStayData && Array.isArray(currentLateStayData.late_stay_employees)) {
                const sorted = [...currentLateStayData.late_stay_employees].sort((a, b) => 
                    (b.checkout_time || '').localeCompare(a.checkout_time || '')
                );
                const latest = sorted[0];
                if (latest) {
                    return setTimeout(() => sendBotAnswer(`Latest checkout: ${latest.name || latest.employee_id} at ${latest.checkout_time || '-'}`, true), 300);
                }
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
    if (!input) return;
    
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

