// js/profile.js
const API_URL = 'http://localhost:3000/api';

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
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

// Load profile data
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const profile = data.profile;
            
            // Update nav
            document.getElementById('navUsername').textContent = profile.full_name || profile.username;
            
            // Update profile card
            document.getElementById('profileName').textContent = profile.full_name || profile.username;
            document.getElementById('profileEmail').textContent = '@' + profile.username;
            
            const createdDate = new Date(profile.created_at);
            document.getElementById('memberSince').textContent = createdDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
            
            // Update form
            document.getElementById('fullName').value = profile.full_name || '';
            document.getElementById('email').value = profile.email || '';
            document.getElementById('username').value = profile.username;
            
            // Update stats
            const stats = profile.stats || {};
            const total = stats.total_tasks || 0;
            const completed = stats.completed_tasks || 0;
            const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            document.getElementById('totalTasks').textContent = total;
            document.getElementById('completedTasks').textContent = completed;
            document.getElementById('completionRate').textContent = `${rate}%`;
        }
    } catch (error) {
        showToast('Failed to load profile', 'error');
    }
}

// Handle profile form submission
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    
    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fullName, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Profile updated successfully');
            
            // Update local storage
            const updatedUser = { ...user, fullName, email };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            loadProfile();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to update profile', 'error');
    }
});

// Handle avatar change (placeholder - would need file upload implementation)
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        showToast('Avatar upload coming soon!', 'warning');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}