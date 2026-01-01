import type { Request, Response } from "express";
import { Router } from "express";
import { pool } from "../db/pool";

export const todosRouter = Router();

// Helper function to get the most recent app's schema
async function getDefaultSchema(): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT schema_name FROM core.app_databases ORDER BY created_at DESC LIMIT 1"
    );
    return result.rows.length > 0 ? result.rows[0].schema_name : null;
  } catch (err) {
    console.error("[todos] Error getting default schema:", err);
    return null;
  }
}

// Helper to ensure todos table exists
async function ensureTodosTableExists(schemaName: string): Promise<void> {
  try {
    // Check if table exists
    const checkResult = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'todos'
      )`,
      [schemaName]
    );

    if (!checkResult.rows[0].exists) {
      // Create the todos table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.todos (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          completed BOOLEAN DEFAULT FALSE,
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          due_date TIMESTAMP,
          user_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_todos_user_id ON ${schemaName}.todos(user_id);
        CREATE INDEX IF NOT EXISTS idx_todos_completed ON ${schemaName}.todos(completed);
        CREATE INDEX IF NOT EXISTS idx_todos_due_date ON ${schemaName}.todos(due_date);
      `);
      console.log(`[todos] Auto-created todos table in schema ${schemaName}`);
    }
  } catch (err: any) {
    console.error(`[todos] Error ensuring todos table exists:`, err);
    throw err;
  }
}

// GET /api/todos - Get all todos (uses most recent app)
todosRouter.get("/todos", async (_req: Request, res: Response) => {
  try {
    const schemaName = await getDefaultSchema();
    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Ensure todos table exists (auto-create if missing)
    await ensureTodosTableExists(schemaName);

    const result = await pool.query(
      `SELECT * FROM ${schemaName}.todos ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("[todos] Error fetching todos:", err);
    res.status(500).json({ error: "Failed to fetch todos", message: err.message });
  }
});

// POST /api/todos - Create a new todo (uses most recent app)
todosRouter.post("/todos", async (req: Request, res: Response) => {
  try {
    const { title, completed = false } = req.body;

    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const schemaName = await getDefaultSchema();
    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Ensure todos table exists (auto-create if missing)
    await ensureTodosTableExists(schemaName);

    const result = await pool.query(
      `INSERT INTO ${schemaName}.todos (title, completed, created_at) 
       VALUES ($1, $2, NOW()) RETURNING *`,
      [title, completed]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[todos] Error creating todo:", err);
    // Check if it's a "relation does not exist" error
    if (err.message && err.message.includes("does not exist")) {
      res.status(500).json({ 
        error: "Table 'todos' does not exist", 
        message: "The todos table was not found. Please ensure the app was set up correctly.",
        details: err.message 
      });
    } else {
      res.status(500).json({ error: "Failed to create todo", message: err.message });
    }
  }
});

// PUT /api/todos/:id - Update a todo (uses most recent app)
todosRouter.put("/todos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;

    const schemaName = await getDefaultSchema();
    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Ensure todos table exists (auto-create if missing)
    await ensureTodosTableExists(schemaName);

    const result = await pool.query(
      `UPDATE ${schemaName}.todos 
       SET title = COALESCE($1, title), completed = COALESCE($2, completed)
       WHERE id = $3 RETURNING *`,
      [title, completed, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("[todos] Error updating todo:", err);
    res.status(500).json({ error: "Failed to update todo", message: err.message });
  }
});

// DELETE /api/todos/:id - Delete a todo (uses most recent app)
todosRouter.delete("/todos/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const schemaName = await getDefaultSchema();
    if (!schemaName) {
      res.status(404).json({ error: "No app database found" });
      return;
    }

    // Ensure todos table exists (auto-create if missing)
    await ensureTodosTableExists(schemaName);

    const result = await pool.query(
      `DELETE FROM ${schemaName}.todos WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[todos] Error deleting todo:", err);
    res.status(500).json({ error: "Failed to delete todo", message: err.message });
  }
});

// GET /api/apps/:appId/todos - Get all todos for an app
todosRouter.get(
  "/apps/:appId/todos",
  async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      
      // Get the app's schema name
      const schemaResult = await pool.query(
        "SELECT schema_name FROM core.app_databases WHERE app_id = $1",
        [appId]
      );
      
      if (schemaResult.rows.length === 0) {
        res.status(404).json({ error: "App database not found" });
        return;
      }
      
      const schemaName = schemaResult.rows[0].schema_name;
      
      // Query todos from the app's schema
      const result = await pool.query(
        `SELECT * FROM ${schemaName}.todos ORDER BY created_at DESC`
      );
      
      res.json(result.rows);
    } catch (err: any) {
      console.error("[todos] Error fetching todos:", err);
      res.status(500).json({ error: "Failed to fetch todos", message: err.message });
    }
  }
);

// POST /api/apps/:appId/todos - Create a new todo
todosRouter.post(
  "/apps/:appId/todos",
  async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      const { title, completed = false } = req.body;
      
      if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
      }
      
      // Get the app's schema name
      const schemaResult = await pool.query(
        "SELECT schema_name FROM core.app_databases WHERE app_id = $1",
        [appId]
      );
      
      if (schemaResult.rows.length === 0) {
        res.status(404).json({ error: "App database not found" });
        return;
      }
      
      const schemaName = schemaResult.rows[0].schema_name;
      
      // Insert todo
      const result = await pool.query(
        `INSERT INTO ${schemaName}.todos (title, completed, created_at) 
         VALUES ($1, $2, NOW()) RETURNING *`,
        [title, completed]
      );
      
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error("[todos] Error creating todo:", err);
      res.status(500).json({ error: "Failed to create todo", message: err.message });
    }
  }
);

// PUT /api/apps/:appId/todos/:id - Update a todo
todosRouter.put(
  "/apps/:appId/todos/:id",
  async (req: Request, res: Response) => {
    try {
      const { appId, id } = req.params;
      const { title, completed } = req.body;
      
      // Get the app's schema name
      const schemaResult = await pool.query(
        "SELECT schema_name FROM core.app_databases WHERE app_id = $1",
        [appId]
      );
      
      if (schemaResult.rows.length === 0) {
        res.status(404).json({ error: "App database not found" });
        return;
      }
      
      const schemaName = schemaResult.rows[0].schema_name;
      
      // Update todo
      const result = await pool.query(
        `UPDATE ${schemaName}.todos 
         SET title = COALESCE($1, title), completed = COALESCE($2, completed)
         WHERE id = $3 RETURNING *`,
        [title, completed, id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error("[todos] Error updating todo:", err);
      res.status(500).json({ error: "Failed to update todo", message: err.message });
    }
  }
);

// DELETE /api/apps/:appId/todos/:id - Delete a todo
todosRouter.delete(
  "/apps/:appId/todos/:id",
  async (req: Request, res: Response) => {
    try {
      const { appId, id } = req.params;
      
      // Get the app's schema name
      const schemaResult = await pool.query(
        "SELECT schema_name FROM core.app_databases WHERE app_id = $1",
        [appId]
      );
      
      if (schemaResult.rows.length === 0) {
        res.status(404).json({ error: "App database not found" });
        return;
      }
      
      const schemaName = schemaResult.rows[0].schema_name;
      
      // Delete todo
      const result = await pool.query(
        `DELETE FROM ${schemaName}.todos WHERE id = $1 RETURNING *`,
        [id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Todo not found" });
        return;
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("[todos] Error deleting todo:", err);
      res.status(500).json({ error: "Failed to delete todo", message: err.message });
    }
  }
);

