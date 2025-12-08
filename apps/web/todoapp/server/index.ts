import express from 'express';
import cors from 'cors';
import { pool } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GET /api/todos - Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    console.log(`📋 Fetched ${result.rows.length} todos`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('❌ Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos', message: error.message });
  }
});

// POST /api/todos - Create a new todo
app.post('/api/todos', async (req, res) => {
  try {
    const { title, completed = false } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO todos (title, completed, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [title, completed]
    );
    
    console.log(`✅ Created todo: ${title}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo', message: error.message });
  }
});

// PUT /api/todos/:id - Update a todo
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    
    const result = await pool.query(
      'UPDATE todos SET title = COALESCE($1, title), completed = COALESCE($2, completed) WHERE id = $3 RETURNING *',
      [title, completed, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    console.log(`✅ Updated todo ${id}`);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo', message: error.message });
  }
});

// DELETE /api/todos/:id - Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    console.log(`✅ Deleted todo ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo', message: error.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Todos endpoint: http://localhost:${PORT}/api/todos`);
});

