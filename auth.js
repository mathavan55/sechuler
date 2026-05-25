// js/auth.js
const API_URL = 'http://localhost:3000/api';

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token && (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/'))) {
        window.location.href = 'scheduler.html';
    }
    if (!token && !window.location.pathname.includes('index.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = 'index.html';
    }
}

// Initialize auth check
checkAuth();

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Handle login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'scheduler.html';
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Login failed. Please try again.', 'error');
        }
    });
}

// Handle register form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const fullName = document.getElementById('fullName').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, fullName })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                showToast('Registration successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'scheduler.html';
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Registration failed. Please try again.', 'error');
        }
    });
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}