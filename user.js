// backend/models/User.js
const db = require('../config/db');

class User {
    /**
     * Create a new user
     * @param {Object} userData - { username, email, password, fullName }
     */
    static async create({ username, email, password, fullName }) {
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
            [username, email, password, fullName || username]
        );
        return result.insertId;
    }

    /**
     * Find a user by username
     * @param {string} username 
     */
    static async findByUsername(username) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    /**
     * Find a user by email
     * @param {string} email 
     */
    static async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    /**
     * Find a user by ID
     * @param {number} id 
     */
    static async findById(id) {
        const [rows] = await db.query(
            'SELECT id, username, email, full_name, avatar, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    /**
     * Update user profile
     * @param {number} id 
     * @param {Object} data - { fullName, email, avatar }
     */
    static async update(id, { fullName, email, avatar }) {
        await db.query(
            'UPDATE users SET full_name = ?, email = ?, avatar = ? WHERE id = ?',
            [fullName, email, avatar, id]
        );
        return true;
    }

    /**
     * Check if username or email exists
     * @param {string} username 
     * @param {string} email 
     */
    static async exists(username, email) {
        const [rows] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        return rows.length > 0;
    }
}

module.exports = User;