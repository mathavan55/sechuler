// frontend/js/monthly.js
const API_URL = 'http://localhost:3000/api';

const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const user = JSON.parse(localStorage.getItem('user') || '{}');
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// Use a cache to store tasks so we don't pass JSON in HTML attributes
let tasksCache = {};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navUsername').textContent = user.fullName || user.username || 'User';
    loadCalendar();
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    loadCalendar();
}

async function loadCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    try {
        const response = await fetch(`${API_URL}/tasks/monthly/${currentYear}/${String(currentMonth + 1).padStart(2, '0')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) renderCalendar(data.progress, data.tasks);
    } catch (error) {
        console.error(error);
        showToast('Failed to load calendar', 'error');
    }
}

function renderCalendar(progressData, tasksData) {
    const calendarBody = document.getElementById('calendarBody');
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    tasksCache = {}; // Clear cache

    const progressMap = {};
    progressData.forEach(p => { progressMap[new Date(p.date_record).getDate()] = p; });

    // Populate cache: { "1": [task1, task2], "2": [task3] }
    tasksData.forEach(t => {
        const day = new Date(t.task_date).getDate();
        if (!tasksCache[day]) tasksCache[day] = [];
        tasksCache[day].push(t);
    });

    let html = '';
    let dayCount = 1;
    const totalCells = firstDay + daysInMonth;
    const weeks = Math.ceil(totalCells / 7);

    for (let week = 0; week < weeks; week++) {
        for (let day = 0; day < 7; day++) {
            if ((week === 0 && day < firstDay) || dayCount > daysInMonth) {
                html += '<div class="calendar-day empty"></div>';
            } else {
                const isToday = dayCount === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const progress = progressMap[dayCount];
                const tasks = tasksCache[dayCount] || [];
                const pct = progress ? parseFloat(progress.progress_percentage) : 0;

                let progressClass = 'no-data';
                if (pct > 0 && pct <= 25) progressClass = 'low';
                else if (pct > 25 && pct <= 50) progressClass = 'medium';
                else if (pct > 50 && pct <= 75) progressClass = 'good';
                else if (pct > 75) progressClass = 'excellent';

                // Pass ONLY the day number (integer) to the function
                html += `
                    <div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayDetails(${dayCount})">
                        <div class="day-header">
                            <span class="day-number">${dayCount}</span>
                            <span class="day-progress-indicator ${progressClass}">${Math.round(pct)}%</span>
                        </div>
                        <div class="day-tasks-preview">${tasks.length > 0 ? `${tasks.length} task${tasks.length > 1 ? 's' : ''}` : ''}</div>
                    </div>
                `;
                dayCount++;
            }
        }
    }
    calendarBody.innerHTML = html;
}

function showDayDetails(day) {
    const modalTitle = document.getElementById('dayModalTitle');
    const modalBody = document.getElementById('dayModalBody');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    modalTitle.textContent = `${monthNames[currentMonth]} ${day}, ${currentYear}`;
    
    // Retrieve tasks safely from cache
    const tasks = tasksCache[day] || [];

    if (tasks.length === 0) {
        modalBody.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No tasks for this day</p>';
    } else {
        modalBody.innerHTML = tasks.map(task => `
            <div class="day-task-item">
                <div class="task-checkbox ${task.is_completed ? 'checked' : ''}" style="pointer-events: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div class="task-content">
                    <div class="task-title" style="${task.is_completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHtml(task.title)}</div>
                    <div class="task-meta"><span>${task.start_time || ''} - ${task.end_time || ''}</span></div>
                </div>
            </div>
        `).join('');
    }
    document.getElementById('dayModal').classList.add('active');
}

function closeDayModal() {
    document.getElementById('dayModal').classList.remove('active');
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}