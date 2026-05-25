// backend/routes/media.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type'));
    }
});

// Upload media
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { date, textContent, mediaType } = req.body;

        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date is required' 
            });
        }

        let fileType = mediaType;
        let filePath = null;
        let fileName = null;

        if (req.file) {
            filePath = `/uploads/${req.file.filename}`;
            fileName = req.file.originalname;
            
            // Auto-detect media type
            if (req.file.mimetype.startsWith('image/')) {
                fileType = 'image';
            } else if (req.file.mimetype.startsWith('video/')) {
                fileType = 'video';
            }
        }

        const [result] = await db.query(
            `INSERT INTO media_uploads (user_id, media_date, media_type, file_name, file_path, text_content)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [req.userId, date, fileType || 'text', fileName, filePath, textContent]
        );

        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            mediaId: result.insertId
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload media' 
        });
    }
});

// Get media by date
router.get('/date/:date', authMiddleware, async (req, res) => {
    try {
        const { date } = req.params;

        const [media] = await db.query(
            `SELECT id, media_type, file_name, file_path, text_content, created_at
            FROM media_uploads
            WHERE user_id = ? AND media_date = ?
            ORDER BY created_at DESC`,
            [req.userId, date]
        );

        res.json({
            success: true,
            media
        });
    } catch (error) {
        console.error('Get media error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get media' 
        });
    }
});

// Delete media
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Get file path before deleting
        const [media] = await db.query(
            'SELECT file_path FROM media_uploads WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        if (media.length > 0 && media[0].file_path) {
            const fullPath = path.join(__dirname, '..', media[0].file_path);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        await db.query(
            'DELETE FROM media_uploads WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        res.json({ 
            success: true, 
            message: 'Media deleted' 
        });
    } catch (error) {
        console.error('Delete media error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete media' 
        });
    }
});

module.exports = router;