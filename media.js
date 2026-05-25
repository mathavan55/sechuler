// js/media.js
const API_URL = 'http://localhost:3000/api';

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'index.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
let currentMediaId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navUsername').textContent = user.fullName || user.username || 'User';
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('mediaDate').value = today;
    document.getElementById('uploadDate').value = today;
    
    loadMedia();
    setupDragDrop();
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

// Load media for selected date
async function loadMedia() {
    const date = document.getElementById('mediaDate').value;
    const mediaGrid = document.getElementById('mediaGrid');
    const emptyMedia = document.getElementById('emptyMedia');
    const sectionTitle = document.getElementById('mediaSectionTitle');
    
    // Update title
    const dateObj = new Date(date + 'T00:00:00');
    sectionTitle.textContent = `Journal for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    
    try {
        const response = await fetch(`${API_URL}/media/date/${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.media.length > 0) {
            mediaGrid.style.display = 'grid';
            emptyMedia.style.display = 'none';
            
            mediaGrid.innerHTML = data.media.map(item => {
                let iconClass = 'text';
                let iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                               </svg>`;
                
                if (item.media_type === 'image') {
                    iconClass = 'image';
                    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                               </svg>`;
                } else if (item.media_type === 'video') {
                    iconClass = 'video';
                    iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="23 7 16 12 23 17 23 7"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                               </svg>`;
                }
                
                const displayName = item.file_name || (item.text_content ? item.text_content.substring(0, 20) + '...' : 'Note');
                
                return `
                    <div class="media-item" onclick="openPreview(${item.id}, '${item.media_type}', '${item.file_path || ''}', '${escapeHtml(item.text_content || '')}', '${escapeHtml(item.file_name || '')}')">
                        <div class="media-icon ${iconClass}">
                            ${iconSvg}
                        </div>
                        <div class="media-name">${escapeHtml(displayName)}</div>
                        <div class="media-date">${new Date(item.created_at).toLocaleTimeString()}</div>
                    </div>
                `;
            }).join('');
        } else {
            mediaGrid.style.display = 'none';
            emptyMedia.style.display = 'block';
        }
    } catch (error) {
        showToast('Failed to load media', 'error');
    }
}

// Open upload modal
function openUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadDate').value = document.getElementById('mediaDate').value;
    toggleUploadFields();
}

// Close upload modal
function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

// Toggle upload fields based on type
function toggleUploadFields() {
    const mediaType = document.getElementById('mediaType').value;
    const textGroup = document.getElementById('textContentGroup');
    const fileGroup = document.getElementById('fileUploadGroup');
    
    if (mediaType === 'text') {
        textGroup.style.display = 'block';
        fileGroup.style.display = 'none';
    } else {
        textGroup.style.display = 'none';
        fileGroup.style.display = 'block';
    }
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
    }
}

// Setup drag and drop
function setupDragDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent-primary)';
        dropZone.style.background = 'rgba(0, 212, 170, 0.05)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-color)';
        dropZone.style.background = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById('mediaFile').files = files;
            document.getElementById('fileName').textContent = files[0].name;
            
            // Auto-detect type
            const file = files[0];
            if (file.type.startsWith('image/')) {
                document.getElementById('mediaType').value = 'image';
            } else if (file.type.startsWith('video/')) {
                document.getElementById('mediaType').value = 'video';
            }
            toggleUploadFields();
        }
    });
}

// Handle upload form submission
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('uploadDate').value;
    const mediaType = document.getElementById('mediaType').value;
    const textContent = document.getElementById('textContent').value;
    const fileInput = document.getElementById('mediaFile');
    
    const formData = new FormData();
    formData.append('date', date);
    formData.append('mediaType', mediaType);
    formData.append('textContent', textContent);
    
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    }
    
    try {
        const response = await fetch(`${API_URL}/media/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Media uploaded successfully');
            closeUploadModal();
            loadMedia();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Failed to upload media', 'error');
    }
});

// Open preview
function openPreview(id, type, filePath, textContent, fileName) {
    currentMediaId = id;
    const previewContent = document.getElementById('previewContent');
    const previewName = document.getElementById('previewName');
    
    previewName.textContent = fileName || 'Text Note';
    
    if (type === 'image') {
        previewContent.innerHTML = `<img src="${filePath}" alt="${fileName}">`;
    } else if (type === 'video') {
        previewContent.innerHTML = `<video controls autoplay><source src="${filePath}" type="video/mp4">Your browser does not support video.</video>`;
    } else {
        previewContent.innerHTML = `<div class="text-preview">${textContent}</div>`;
    }
    
    document.getElementById('previewModal').classList.add('active');
}

// Close preview
function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('active');
    const previewContent = document.getElementById('previewContent');
    // Stop video if playing
    const video = previewContent.querySelector('video');
    if (video) video.pause();
    previewContent.innerHTML = '';
    currentMediaId = null;
}

// Delete media item
async function deleteMediaItem() {
    if (!currentMediaId || !confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`${API_URL}/media/${currentMediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Media deleted');
            closePreviewModal();
            loadMedia();
        }
    } catch (error) {
        showToast('Failed to delete media', 'error');
    }
}

// Helper: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}