// js/scheduler.js
const API_URL = 'http://localhost:3000/api';

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Set user info in nav
    const navUsername = document.getElementById('navUsername');
    if (navUsername) {
        navUsername.textContent = user.fullName || user.username || 'User';
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = document.getElementById('selectedDate');
    if (selectedDate) {
        selectedDate.value = today;
        selectedDate.max = '2100-12-31';
    }
    
    // Set task date default
    const taskDate = document.getElementById('taskDate');
    if (taskDate) {
        taskDate.value = today;
    }
    
    // Load initial data
    loadTasks();
    loadStats();
    startAlarmCheck();
});

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Change date
function changeDate(days) {
    const dateInput = document.getElementById('selectedDate');
    const currentDate = new Date(dateInput.value);
    currentDate.setDate(currentDate.getDate() + days);
    dateInput.value = currentDate.toISOString().split('T')[0];
    loadTasks();
}

// Load tasks
async function loadTasks() {
    const date = document.getElementById('selectedDate').value;
    const taskTypeFilter = document.getElementById('taskTypeFilter').value;
    const filterStartDate = document.getElementById('filterStartDate').value;
    const filterEndDate = document.getElementById('filterEndDate').value;
    
    try {
        let url = `${API_URL}/tasks/date/${date}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let tasks = data.tasks;
            
            // Apply type filter
            if (taskTypeFilter !== 'all') {
                tasks = tasks.filter(t => t.task_type === taskTypeFilter);
            }
            
            renderTasks(tasks);
            updateTodayProgress(tasks);
        }
    } catch (error) {
        showToast('Failed to load tasks', 'error');
    }
}

// Render tasks
function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-tasks">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No tasks for this date</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = tasks.map(task => {
        const isCompleted = task.task_type === 'daily' ? task.completed : task.is_completed;
        const isFailed = task.is_failed;
        const statusClass = isFailed ? 'failed' : (isCompleted ? 'completed' : '');
        
        return `
            <div class="task-item ${statusClass}" data-id="${task.id}">
                <div class="task-checkbox ${isCompleted ? 'checked' : ''} ${isFailed ? 'checked' : ''}"
                     onclick="completeTask(${task.id}, '${task.task_type}', ${isCompleted || isFailed})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            ${task.start_time} - ${task.end_time}
                        </span>
                        <span class="task-type-badge ${task.task_type}">${task.task_type}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn" onclick="deleteTask(${task.id})" title="Delete task">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update today's progress
function updateTodayProgress(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => 
        t.task_type === 'daily' ? t.completed : t.is_completed
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    document.getElementById('todayPercentage').textContent = `${percentage}%`;
    document.getElementById('todayCompleted').textContent = completed;
    document.getElementById('todayTotal').textContent = total;
    
    // Update progress ring
    const ring = document.getElementById('todayProgressRing');
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (percentage / 100) * circumference;
    ring.style.strokeDashoffset = offset;
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/tasks/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Weekly stats
            const weeklyPct = parseFloat(data.weekly.percentage) || 0;
            document.getElementById('weeklyAvg').textContent = `${weeklyPct}%`;
            document.getElementById('weeklyBar').style.width = `${weeklyPct}%`;
            
            // Monthly stats
            const monthlyPct = parseFloat(data.monthly.percentage) || 0;
            document.getElementById('monthlyAvg').textContent = `${monthlyPct}%`;
            document.getElementById('monthlyBar').style.width = `${monthlyPct}%`;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Open task modal
function openTaskModal() {
    document.getElementById('taskModal').classList.add('active');
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('submitBtnText').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskDate').value = document.getElementById('selectedDate').value;
    document.getElementById('repeatDaysGroup').style.display = 'none';
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
}

// Toggle repeat days
function toggleRepeatDays() {
    const taskType = document.getElementById('taskType').value;
    const repeatDaysGroup = document.getElementById('repeatDaysGroup');
    repeatDaysGroup.style.display = taskType === 'daily' ? 'block' : 'none';
}

// Handle task form submission
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const taskDate = document.getElementById('taskDate').value;
    const startTime = document.getElementById('taskStartTime').value;
    const endTime = document.getElementById('taskEndTime').value;
    const taskType = document.getElementById('taskType').value;
    
    // Get selected repeat days
    const repeatDays = [];
    document.querySelectorAll('input[name="repeatDays"]:checked').forEach(cb => {
        repeatDays.push(parseInt(cb.value));
    });
    
    try {
        const response = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                taskDate,
                startTime,
                endTime,
                taskType,
                repeatDays
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task created successfully');
            closeTaskModal();
            loadTasks();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to create task', 'error');
    }
});

// Complete task
async function completeTask(taskId, taskType, isAlreadyCompleted) {
    if (isAlreadyCompleted) {
        showToast('Task already processed', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task completed!');
            loadTasks();
            loadStats();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to complete task', 'error');
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Task deleted');
            loadTasks();
        }
    } catch (error) {
        showToast('Failed to delete task', 'error');
    }
}

// Alarm check (polling every 30 seconds)
function startAlarmCheck() {
    setInterval(async () => {
        const date = document.getElementById('selectedDate').value;
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const today = now.toISOString().split('T')[0];
        
        if (date !== today) return;
        
        try {
            const response = await fetch(`${API_URL}/tasks/date/${today}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                data.tasks.forEach(task => {
                    if (task.is_completed || task.completed || task.is_failed) return;
                    
                    // Calculate time difference
                    const endTime = task.end_time;
                    const timeDiff = (new Date(`${today}T${endTime}`) - now) / 1000 / 60; // minutes
                    
                    // Check if within 10 minutes and 30 seconds of deadline
                    if (timeDiff <= 10.5 && timeDiff > 0) {
                        triggerAlarm(task);
                    }
                });
            }
        } catch (error) {
            console.error('Alarm check error:', error);
        }
    }, 30000); // Check every 30 seconds
}

// Trigger alarm
let lastAlarmTaskId = null;

function triggerAlarm(task) {
    if (lastAlarmTaskId === task.id) return; // Prevent repeated alarms
    lastAlarmTaskId = task.id;
    
    document.getElementById('alarmTaskTitle').textContent = task.title;
    document.getElementById('alarmModal').classList.add('active');
    
    // Play sound
    const audio = document.getElementById('alarmSound');
    audio.currentTime = 0;
    audio.play().catch(e => console.log('Audio play prevented:', e));
}

// Close alarm modal
function closeAlarmModal() {
    document.getElementById('alarmModal').classList.remove('active');
    lastAlarmTaskId = null;
}

// Helper: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Date change listener
document.getElementById('selectedDate').addEventListener('change', loadTasks);