import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { pool } from "./db/pool";
import { appsRouter } from "./routes/apps";
import { todosRouter } from "./routes/todos";
import { tablesRouter } from "./routes/tables";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

// GLOBAL INTERCEPTOR - Set up ONCE at app startup
// This intercepts ALL Express responses at the prototype level to force CORP header
const setupCORPInterceptor = () => {
  const originalWriteHead = express.response.writeHead;
  const originalEnd = express.response.end;
  
  // @ts-ignore - Override writeHead to intercept all responses
  express.response.writeHead = function(statusCode: number, statusMessage?: any, headers?: any) {
    this.removeHeader('Cross-Origin-Resource-Policy');
    this.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    if (headers) {
      // @ts-ignore
      return originalWriteHead.call(this, statusCode, statusMessage, headers);
    } else if (typeof statusMessage === 'object') {
      // @ts-ignore
      return originalWriteHead.call(this, statusCode, statusMessage);
    } else {
      // @ts-ignore
      return originalWriteHead.call(this, statusCode, statusMessage);
    }
  };
  
  // @ts-ignore - Override end to intercept all responses
  express.response.end = function(chunk?: any, encoding?: any, cb?: any) {
    this.removeHeader('Cross-Origin-Resource-Policy');
    this.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    if (typeof encoding === 'function') {
      // @ts-ignore
      return originalEnd.call(this, chunk, encoding);
    } else if (typeof cb === 'function' && encoding) {
      // @ts-ignore
      return originalEnd.call(this, chunk, encoding, cb);
    } else if (encoding) {
      // @ts-ignore
      return originalEnd.call(this, chunk, encoding);
    } else {
      // @ts-ignore
      return originalEnd.call(this, chunk);
    }
  };
};

// Set up interceptor BEFORE any middleware
setupCORPInterceptor();

// Configure CORS with explicit settings
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
  }),
);

// Configure Helmet - CORP is handled by global interceptor above
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Disabled - handled by global interceptor
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    message: "Applaa Backend API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      createApp: "POST /api/apps",
      getAppDatabase: "GET /api/apps/:appId/database",
      createAppSchema: "POST /api/apps/:appId/schema",
      autoSetupTables: "POST /api/apps/:appId/auto-setup",
      setupFromTemplate: "POST /api/apps/:appId/setup/:templateName",
      // Todos CRUD endpoints (simple - uses most recent app)
      getTodosSimple: "GET /api/todos",
      createTodoSimple: "POST /api/todos",
      updateTodoSimple: "PUT /api/todos/:id",
      deleteTodoSimple: "DELETE /api/todos/:id",
      // Todos CRUD endpoints (with app ID)
      getTodos: "GET /api/apps/:appId/todos",
      createTodo: "POST /api/apps/:appId/todos",
      updateTodo: "PUT /api/apps/:appId/todos/:id",
      deleteTodo: "DELETE /api/apps/:appId/todos/:id",
      // Generic table CRUD endpoints (works for any table name)
      getTable: "GET /api/:tableName",
      createTableRow: "POST /api/:tableName",
      updateTableRow: "PUT /api/:tableName/:id",
      deleteTableRow: "DELETE /api/:tableName/:id",
    },
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[backend] Health check failed:", err);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.use("/api", appsRouter);
app.use("/api", todosRouter);
// Generic table routes (must come after specific routes like /todos)
app.use("/api", tablesRouter);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Applaa backend listening on http://localhost:${port}`);
});


