/**
 * Schema templates for common app types
 * These are automatically applied when creating apps with specific purposes
 */

export interface TableDefinition {
  name: string;
  sql: string;
}

export interface AppSchemaTemplate {
  name: string;
  description: string;
  tables: TableDefinition[];
  keywords: string[]; // Keywords to detect this app type
}

export const APP_SCHEMA_TEMPLATES: AppSchemaTemplate[] = [
  {
    name: "todo",
    description: "Todo/Task Management App",
    keywords: ["todo", "task", "checklist", "to-do", "tasks"],
    tables: [
      {
        name: "todos",
        sql: `
          CREATE TABLE IF NOT EXISTS todos (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            completed BOOLEAN DEFAULT FALSE,
            priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
            due_date TIMESTAMP,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
          CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
          CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
        `,
      },
    ],
  },
  {
    name: "chat",
    description: "Chat/Messaging App",
    keywords: ["chat", "message", "messaging", "conversation", "dm", "direct message"],
    tables: [
      {
        name: "conversations",
        sql: `
          CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            type VARCHAR(50) DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
          CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
        `,
      },
      {
        name: "conversation_participants",
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_participants (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            joined_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(conversation_id, user_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
        `,
      },
      {
        name: "messages",
        sql: `
          CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
          CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
        `,
      },
    ],
  },
  {
    name: "blog",
    description: "Blog/Content Management App",
    keywords: ["blog", "post", "article", "content", "cms", "publishing"],
    tables: [
      {
        name: "categories",
        sql: `
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
        `,
      },
      {
        name: "posts",
        sql: `
          CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            content TEXT,
            excerpt TEXT,
            author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
            published_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
          CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
          CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
          CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
          CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
        `,
      },
      {
        name: "comments",
        sql: `
          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
          CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
          CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
        `,
      },
    ],
  },
  {
    name: "ecommerce",
    description: "E-commerce/Shop App",
    keywords: ["shop", "store", "ecommerce", "e-commerce", "product", "cart", "order"],
    tables: [
      {
        name: "products",
        sql: `
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            compare_price DECIMAL(10, 2),
            stock INTEGER DEFAULT 0,
            sku VARCHAR(100) UNIQUE,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
          CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
          CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
        `,
      },
      {
        name: "cart_items",
        sql: `
          CREATE TABLE IF NOT EXISTS cart_items (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, product_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
          CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
        `,
      },
      {
        name: "orders",
        sql: `
          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
            total DECIMAL(10, 2) NOT NULL,
            shipping_address TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
          CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
          CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
        `,
      },
      {
        name: "order_items",
        sql: `
          CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
          CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
        `,
      },
    ],
  },
  {
    name: "notes",
    description: "Note-taking App",
    keywords: ["note", "notes", "notebook", "memo", "notepad"],
    tables: [
      {
        name: "notebooks",
        sql: `
          CREATE TABLE IF NOT EXISTS notebooks (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(20),
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_notebooks_user ON notebooks(user_id);
        `,
      },
      {
        name: "notes",
        sql: `
          CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            content TEXT,
            notebook_id INTEGER REFERENCES notebooks(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            pinned BOOLEAN DEFAULT FALSE,
            archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
          CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
          CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);
          CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
        `,
      },
    ],
  },
];

/**
 * Detect app type from user input/app name
 */
export function detectAppType(input: string): AppSchemaTemplate | null {
  const lowerInput = input.toLowerCase();

  for (const template of APP_SCHEMA_TEMPLATES) {
    if (template.keywords.some((keyword) => lowerInput.includes(keyword))) {
      return template;
    }
  }

  return null;
}

/**
 * Get schema template by name
 */
export function getSchemaTemplate(templateName: string): AppSchemaTemplate | null {
  return APP_SCHEMA_TEMPLATES.find((t) => t.name === templateName) || null;
}

