# Dyad v0.18.0 Beta 1 Features - Technical Architecture Document

## 1. Architecture Design

```mermaid
graph TD
    A[User Interface] --> B[React Frontend Components]
    B --> C[Jotai State Management]
    C --> D[IPC Client]
    D --> E[Electron Main Process]
    E --> F[SQLite Database]
    E --> G[File System Operations]
    
    subgraph "Frontend Layer"
        B
        C
    end
    
    subgraph "Communication Layer"
        D
    end
    
    subgraph "Backend Layer"
        E
        F
        G
    end
    
    subgraph "New Components"
        H[Prompt Library Panel]
        I[Enhanced Address Bar]
        J[Custom Commands Dialog]
        K[Prompt Mention Dropdown]
    end
    
    B --> H
    B --> I
    B --> J
    B --> K
```

## 2. Technology Description

* **Frontend**: React\@18 + TypeScript + Jotai + TanStack Router + Tailwind CSS

* **Backend**: Electron Main Process + SQLite + Drizzle ORM

* **UI Components**: Radix UI + shadcn/ui + Lucide React Icons

* **Text Editor**: Lexical (Facebook's rich text editor)

* **Database**: SQLite with Drizzle ORM

* **State Management**: Jotai atoms

* **IPC**: Electron IPC with type-safe handlers

## 3. Route Definitions

| Route        | Purpose                       | New Components                                 |
| ------------ | ----------------------------- | ---------------------------------------------- |
| /home        | Home page with app creation   | Enhanced with prompt library access            |
| /chat        | Chat interface                | Enhanced LexicalChatInput with prompt mentions |
| /library     | New prompt library management | PromptLibraryPanel, PromptLibraryDialog        |
| /app-details | App details an                |                                                |

