import express from 'express';
// import { Pool, QueryResult } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
dotenv.config(); // Load environment variables
// --- Configuration ---
const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Fallback for development
const GRACE_PERIOD_MINUTES = 15;
// PostgreSQL Connection Pool
const pool = new Pool({
    connectionString: "postgres://612a2dd0a487491a9b401ca7ed535fbb5211055040111e2935a59fc4f9bc9470:sk_RHPsCwIffMVj_2Z6Yfwha@db.prisma.io:5432/?sslmode=require",
    ssl: { rejectUnauthorized: false },
});
// --- Middleware ---
app.use(cors({ origin: [
        'http://localhost:5173',
        "https://nested-comment-assignment.vercel.app",
    ]
})); // Adjust to your frontend URL
app.use(express.json());
// --- Database Initialization ---
async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        is_deleted BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        reply_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON notifications(comment_id);
    `);
        console.log('Database tables initialized successfully.');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
    finally {
        if (client) {
            client.release();
        }
    }
}
/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Authentication token required.' });
        return; // Important: return void after sending response
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            res.status(403).json({ message: 'Invalid or expired token.' });
            return; // Important: return void after sending response
        }
        req.user = user;
        next();
    });
};
// --- API Endpoints ---
/**
 * GET /me - Fetch current user data
 */
app.get('/me', authenticateToken, async (req, res) => {
    try {
        if (!req.user?.id) {
            // This case should ideally be caught by authenticateToken, but good for type safety.
            res.status(401).json({ message: 'User not authenticated.' });
            return;
        }
        const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.status(200).json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});
/**
 * POST /register - Register a new user
 */
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ message: 'Username and password are required.' });
        return;
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at', [username, hashedPassword]);
        res.status(201).json({
            message: 'User registered successfully.',
            user: { id: result.rows[0].id, username: result.rows[0].username },
        });
    }
    catch (error) {
        if (error.code === '23505') {
            res.status(409).json({ message: 'Username already exists.' });
            return;
        }
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});
/**
 * POST /login - Authenticate user and return JWT
 */
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ message: 'Username and password are required.' });
        return;
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) {
            res.status(400).json({ message: 'Invalid username or password.' });
            return;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: 'Invalid username or password.' });
            return;
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Logged in successfully.',
            token,
            user: { id: user.id, username: user.username },
        });
    }
    catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});
/**
 * POST /comments - Create a new comment
 */
app.post('/comments', authenticateToken, async (req, res) => {
    const { content, parent_id } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    if (!content) {
        res.status(400).json({ message: 'Comment content is required.' });
        return;
    }
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const commentResult = await client.query('INSERT INTO comments (user_id, parent_id, content) VALUES ($1, $2, $3) RETURNING *', [userId, parent_id || null, content]);
        const newComment = commentResult.rows[0];
        if (parent_id) {
            const parentCommentResult = await client.query('SELECT user_id, content FROM comments WHERE id = $1', [parent_id]);
            const parentComment = parentCommentResult.rows[0];
            if (parentComment && parentComment.user_id !== userId) {
                await client.query('INSERT INTO notifications (user_id, comment_id, reply_id, message) VALUES ($1, $2, $3, $4)', [
                    parentComment.user_id,
                    parent_id,
                    newComment.id,
                    `User ${req.user?.username} replied to your comment: "${parentComment.content.substring(0, 50)}..."`,
                ]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Comment created successfully.', comment: newComment });
    }
    catch (error) {
        if (client)
            await client.query('ROLLBACK');
        console.error('Error creating comment:', error);
        res.status(500).json({ message: 'Internal server error creating comment.' });
    }
    finally {
        if (client)
            client.release();
    }
});
/**
 * GET /comments - Retrieve all comments
 */
app.get('/comments', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        c.id,
        c.user_id,
        u.username,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        c.is_deleted
      FROM comments c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at ASC
    `);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal server error fetching comments.' });
    }
});
/**
 * PUT /comments/:id - Edit a comment
 */
app.put('/comments/:id', authenticateToken, async (req, res) => {
    const commentId = req.params.id;
    const { content } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    if (!content) {
        res.status(400).json({ message: 'New comment content is required.' });
        return;
    }
    try {
        const result = await pool.query('SELECT user_id, created_at, is_deleted FROM comments WHERE id = $1', [commentId]);
        const comment = result.rows[0];
        if (!comment) {
            res.status(404).json({ message: 'Comment not found.' });
            return;
        }
        if (comment.user_id !== userId) {
            res.status(403).json({ message: 'You are not authorized to edit this comment.' });
            return;
        }
        if (comment.is_deleted) {
            res.status(400).json({ message: 'Cannot edit a deleted comment.' });
            return;
        }
        const createdAt = new Date(comment.created_at);
        const now = new Date();
        const timeElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        if (timeElapsed > GRACE_PERIOD_MINUTES) {
            res.status(403).json({ message: `Comments can only be edited within ${GRACE_PERIOD_MINUTES} minutes.` });
            return;
        }
        const updateResult = await pool.query('UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [content, commentId]);
        res.status(200).json({ message: 'Comment updated successfully.', comment: updateResult.rows[0] });
    }
    catch (error) {
        console.error('Error editing comment:', error);
        res.status(500).json({ message: 'Internal server error editing comment.' });
    }
});
/**
 * DELETE /comments/:id - Soft delete a comment
 */
app.delete('/comments/:id', authenticateToken, async (req, res) => {
    const commentId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    try {
        const result = await pool.query('SELECT user_id, is_deleted FROM comments WHERE id = $1', [commentId]);
        const comment = result.rows[0];
        if (!comment) {
            res.status(404).json({ message: 'Comment not found.' });
            return;
        }
        if (comment.user_id !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this comment.' });
            return;
        }
        if (comment.is_deleted) {
            res.status(400).json({ message: 'Comment is already deleted.' });
            return;
        }
        await pool.query('UPDATE comments SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [commentId]);
        res.status(200).json({ message: 'Comment soft-deleted successfully.' });
    }
    catch (error) {
        console.error('Error soft-deleting comment:', error);
        res.status(500).json({ message: 'Internal server error soft-deleting comment.' });
    }
});
/**
 * PUT /comments/:id/restore - Restore a soft-deleted comment
 */
app.put('/comments/:id/restore', authenticateToken, async (req, res) => {
    const commentId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    try {
        const result = await pool.query('SELECT user_id, deleted_at, is_deleted FROM comments WHERE id = $1', [commentId]);
        const comment = result.rows[0];
        if (!comment) {
            res.status(404).json({ message: 'Comment not found.' });
            return;
        }
        if (comment.user_id !== userId) {
            res.status(403).json({ message: 'You are not authorized to restore this comment.' });
            return;
        }
        if (!comment.is_deleted) {
            res.status(400).json({ message: 'Comment is not deleted.' });
            return;
        }
        const deletedAt = new Date(comment.deleted_at);
        const now = new Date();
        const timeElapsed = (now.getTime() - deletedAt.getTime()) / (1000 * 60);
        if (timeElapsed > GRACE_PERIOD_MINUTES) {
            res.status(403).json({ message: `Comments can only be restored within ${GRACE_PERIOD_MINUTES} minutes.` });
            return;
        }
        await pool.query('UPDATE comments SET is_deleted = FALSE, deleted_at = NULL WHERE id = $1', [commentId]);
        res.status(200).json({ message: 'Comment restored successfully.' });
    }
    catch (error) {
        console.error('Error restoring comment:', error);
        res.status(500).json({ message: 'Internal server error restoring comment.' });
    }
});
/**
 * GET /notifications - Retrieve user notifications
 */
app.get('/notifications', authenticateToken, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    try {
        const result = await pool.query(`SELECT
        n.id,
        n.comment_id,
        n.reply_id,
        n.message,
        n.is_read,
        n.created_at,
        c.content AS original_comment_content,
        r.content AS reply_content,
        ru.username AS reply_author_username
      FROM notifications n
      JOIN comments c ON n.comment_id = c.id
      JOIN comments r ON n.reply_id = r.id
      JOIN users ru ON r.user_id = ru.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC`, [userId]);
        res.status(200).json(result.rows);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error fetching notifications.' });
    }
});
/**
 * PUT /notifications/:id/read - Mark notification as read
 */
app.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ message: 'User not authenticated.' });
        return;
    }
    try {
        const result = await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *', [notificationId, userId]);
        if (result.rowCount === 0) {
            res.status(404).json({ message: 'Notification not found or unauthorized.' });
            return;
        }
        res.status(200).json({ message: 'Notification marked as read.', notification: result.rows[0] });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Internal server error marking notification as read.' });
    }
});
// --- Server Start ---
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Access backend at http://localhost:${PORT}`);
    });
});
