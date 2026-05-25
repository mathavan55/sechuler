// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const mediaRoutes = require('./routes/media');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/media', mediaRoutes);

// Database connection test
db.query('SELECT 1')
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection error:', err));

// Cron job for daily task reset at 00:00
cron.schedule('0 0 * * *', async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get all daily tasks
        const [dailyTasks] = await db.query(
            'SELECT id FROM tasks WHERE task_type = ?', 
            ['daily']
        );

        // Reset daily task progress
        for (const task of dailyTasks) {
            await db.query(
                'INSERT INTO daily_progress (task_id, progress_date, is_completed) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE is_completed = FALSE',
                [task.id, today]
            );
        }

        // Check and mark failed limited tasks
        await db.query(
            `UPDATE tasks SET is_failed = TRUE 
             WHERE task_type = 'limited' 
             AND end_time < CURTIME() 
             AND is_completed = FALSE 
             AND task_date = CURDATE()`
        );

        console.log('Daily tasks reset completed at midnight');
    } catch (error) {
        console.error('Cron job error:', error);
    }
});

// Cron job for deadline alarms (runs every 30 seconds)
cron.schedule('*/30 * * * * *', async () => {
    try {
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];
        const today = now.toISOString().split('T')[0];

        // Get tasks that need alarm (10 minutes before deadline + 30 seconds buffer)
        const [tasks] = await db.query(`
            SELECT t.id, t.title, t.end_time, u.id as user_id
            FROM tasks t
            JOIN users u ON t.user_id = u.id
            WHERE t.task_date = ?
            AND t.is_completed = FALSE
            AND t.is_failed = FALSE
            AND TIMEDIFF(t.end_time, ?) <= '00:10:30'
            AND TIMEDIFF(t.end_time, ?) > '00:00:00'
        `, [today, currentTime, currentTime]);

        // Emit alarm events (you would use Socket.io in production)
        console.log('Tasks needing alarm:', tasks.length);
        
    } catch (error) {
        console.error('Alarm check error:', error);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});