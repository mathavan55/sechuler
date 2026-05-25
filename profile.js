// backend/routes/profile.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

const router = express.Router();

// Get profile
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, full_name, avatar, created_at FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Get stats
        const [stats] = await db.query(
            `SELECT 
                COUNT(DISTINCT t.id) as total_tasks,
                SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks t
            WHERE t.user_id = ?`,
            [req.userId]
        );

        res.json({
            success: true,
            profile: {
                ...users[0],
                stats: stats[0]
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get profile' 
        });
    }
});

// Update profile
router.put('/', authMiddleware, async (req, res) => {
    try {
        const { fullName, email, avatar } = req.body;

        // Check if email is taken by another user
        if (email) {
            const [existingUsers] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.userId]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use' 
                });
            }
        }

        await db.query(
            'UPDATE users SET full_name = ?, email = ?, avatar = ? WHERE id = ?',
            [fullName, email, avatar, req.userId]
        );

        res.json({ 
            success: true, 
            message: 'Profile updated successfully' 
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update profile' 
        });
    }
});

module.exports = router;