// backend/routes/tasks.js
const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

const router = express.Router();

// Create task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { 
            title, 
            description, 
            taskDate, 
            startTime, 
            endTime, 
            taskType = 'limited',
            repeatDays = [] 
        } = req.body;

        if (!title || !taskDate || !startTime || !endTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title, date, start time and end time are required' 
            });
        }

        // Validate task date (not before today for new tasks)
        const today = new Date().toISOString().split('T')[0];
        if (taskDate < today && taskType === 'limited') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot create tasks for past dates' 
            });
        }

        const [result] = await db.query(
            `INSERT INTO tasks 
            (user_id, title, description, task_date, start_time, end_time, task_type, repeat_days) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.userId, 
                title, 
                description, 
                taskDate, 
                startTime, 
                endTime, 
                taskType,
                JSON.stringify(repeatDays)
            ]
        );

        // If daily task, create initial progress record
        if (taskType === 'daily') {
            await db.query(
                'INSERT INTO daily_progress (task_id, progress_date, is_completed) VALUES (?, ?, FALSE)',
                [result.insertId, taskDate]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            taskId: result.insertId
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create task' 
        });
    }
});

// Get tasks by date
router.get('/date/:date', authMiddleware, async (req, res) => {
    try {
        const { date } = req.params;
        const dayOfWeek = new Date(date).getDay();

        // Get limited tasks for specific date
        const [limitedTasks] = await db.query(
            `SELECT t.*, 
                CASE WHEN t.is_completed THEN 1 ELSE 0 END as completed
            FROM tasks t
            WHERE t.user_id = ? AND t.task_date = ? AND t.task_type = 'limited'`,
            [req.userId, date]
        );

        // Get daily tasks
        const [dailyTasks] = await db.query(
            `SELECT t.*, 
                COALESCE(dp.is_completed, FALSE) as completed,
                dp.completed_at
            FROM tasks t
            LEFT JOIN daily_progress dp ON t.id = dp.task_id AND dp.progress_date = ?
            WHERE t.user_id = ? AND t.task_type = 'daily'
            AND (JSON_CONTAINS(t.repeat_days, ?) OR JSON_LENGTH(t.repeat_days) = 0 OR t.repeat_days IS NULL)`,
            [date, req.userId, JSON.stringify(dayOfWeek)]
        );

        // Safe parsing function
        const parseRepeatDays = (task) => {
            let parsedDays = [];
            if (task.repeat_days) {
                if (typeof task.repeat_days === 'string') {
                    try { parsedDays = JSON.parse(task.repeat_days); } 
                    catch (e) { parsedDays = []; }
                } else if (Array.isArray(task.repeat_days)) {
                    parsedDays = task.repeat_days;
                }
            }
            return { ...task, repeat_days: parsedDays };
        };

        const allTasks = [...limitedTasks, ...dailyTasks].map(parseRepeatDays);

        res.json({ 
            success: true, 
            tasks: allTasks 
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get tasks' 
        });
    }
});

// Complete task
router.put('/:id/complete', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];

        // Get task
        const [tasks] = await db.query(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        if (tasks.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Task not found' 
            });
        }

        const task = tasks[0];

        // Check if limited task is already completed
        if (task.task_type === 'limited' && task.is_completed) {
            return res.status(400).json({ 
                success: false, 
                message: 'Task already completed' 
            });
        }

        // Check if past deadline
        const now = new Date();
        const endTime = new Date(`${task.task_date}T${task.end_time}`);
        
        if (now > endTime && task.task_type === 'limited') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot complete task after deadline' 
            });
        }

        if (task.task_type === 'daily') {
            // Update daily progress
            await db.query(
                `INSERT INTO daily_progress (task_id, progress_date, is_completed, completed_at) 
                VALUES (?, ?, TRUE, NOW())
                ON DUPLICATE KEY UPDATE is_completed = TRUE, completed_at = NOW()`,
                [id, today]
            );
        } else {
            // Update limited task
            await db.query(
                'UPDATE tasks SET is_completed = TRUE, completed_at = NOW() WHERE id = ?',
                [id]
            );
        }

        // Update progress history
        await updateProgressHistory(req.userId, today);

        res.json({ 
            success: true, 
            message: 'Task marked as complete' 
        });
    } catch (error) {
        console.error('Complete task error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to complete task' 
        });
    }
});

// Get progress for date range
router.get('/progress', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Start date and end date are required' 
            });
        }

        const [progress] = await db.query(
            `SELECT * FROM progress_history 
            WHERE user_id = ? AND date_record BETWEEN ? AND ?
            ORDER BY date_record`,
            [req.userId, startDate, endDate]
        );

        // Calculate averages
        const avgProgress = progress.length > 0 
            ? progress.reduce((sum, p) => sum + parseFloat(p.progress_percentage), 0) / progress.length 
            : 0;

        res.json({
            success: true,
            progress,
            avgProgress: avgProgress.toFixed(2)
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get progress' 
        });
    }
});

// Get weekly/monthly stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);

        // Weekly stats
        const [weeklyStats] = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks 
            WHERE user_id = ? AND task_date BETWEEN ? AND ?`,
            [req.userId, weekStart.toISOString().split('T')[0], today.toISOString().split('T')[0]]
        );

        // Monthly stats
        const [monthlyStats] = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks 
            WHERE user_id = ? AND task_date BETWEEN ? AND ?`,
            [req.userId, monthStart.toISOString().split('T')[0], today.toISOString().split('T')[0]]
        );

        // Daily progress for daily tasks
        const [dailyWeeklyStats] = await db.query(
            `SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN dp.is_completed THEN 1 ELSE 0 END) as completed_tasks
            FROM daily_progress dp
            JOIN tasks t ON dp.task_id = t.id
            WHERE t.user_id = ? AND dp.progress_date BETWEEN ? AND ?`,
            [req.userId, weekStart.toISOString().split('T')[0], today.toISOString().split('T')[0]]
        );

        const weeklyTotal = (weeklyStats[0]?.total_tasks || 0) + (dailyWeeklyStats[0]?.total_tasks || 0);
        const weeklyCompleted = (weeklyStats[0]?.completed_tasks || 0) + (dailyWeeklyStats[0]?.completed_tasks || 0);

        res.json({
            success: true,
            weekly: {
                total: weeklyTotal,
                completed: weeklyCompleted,
                percentage: weeklyTotal > 0 ? ((weeklyCompleted / weeklyTotal) * 100).toFixed(2) : 0
            },
            monthly: {
                total: monthlyStats[0]?.total_tasks || 0,
                completed: monthlyStats[0]?.completed_tasks || 0,
                percentage: monthlyStats[0]?.total_tasks > 0 
                    ? ((monthlyStats[0].completed_tasks / monthlyStats[0].total_tasks) * 100).toFixed(2) 
                    : 0
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get stats' 
        });
    }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            [id, req.userId]
        );

        res.json({ 
            success: true, 
            message: 'Task deleted' 
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete task' 
        });
    }
});

// Helper function to update progress history
async function updateProgressHistory(userId, date) {
    try {
        // Get total tasks for the day
        const [limitedTasks] = await db.query(
            'SELECT COUNT(*) as total, SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = ? AND task_date = ? AND task_type = "limited"',
            [userId, date]
        );

        const [dailyTasks] = await db.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN dp.is_completed THEN 1 ELSE 0 END) as completed 
            FROM tasks t
            LEFT JOIN daily_progress dp ON t.id = dp.task_id AND dp.progress_date = ?
            WHERE t.user_id = ? AND t.task_type = 'daily'`,
            [date, userId]
        );

        const total = (limitedTasks[0]?.total || 0) + (dailyTasks[0]?.total || 0);
        const completed = (limitedTasks[0]?.completed || 0) + (dailyTasks[0]?.completed || 0);
        const percentage = total > 0 ? (completed / total) * 100 : 0;

        await db.query(
            `INSERT INTO progress_history (user_id, date_record, total_tasks, completed_tasks, progress_percentage)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE total_tasks = ?, completed_tasks = ?, progress_percentage = ?`,
            [userId, date, total, completed, percentage, total, completed, percentage]
        );
    } catch (error) {
        console.error('Update progress history error:', error);
    }
}

// Get monthly calendar data
router.get('/monthly/:year/:month', authMiddleware, async (req, res) => {
    try {
        const { year, month } = req.params;
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const [progress] = await db.query(
            `SELECT date_record, progress_percentage, total_tasks, completed_tasks
            FROM progress_history
            WHERE user_id = ? AND date_record BETWEEN ? AND ?
            ORDER BY date_record`,
            [req.userId, startDate, endDate]
        );

        // Get tasks for the month
        const [tasks] = await db.query(
            `SELECT id, title, task_date, task_type, is_completed, start_time, end_time
            FROM tasks
            WHERE user_id = ? AND task_date BETWEEN ? AND ?
            ORDER BY task_date, start_time`,
            [req.userId, startDate, endDate]
        );

        res.json({
            success: true,
            progress,
            tasks
        });
    } catch (error) {
        console.error('Get monthly data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get monthly data' 
        });
    }
});

module.exports = router;