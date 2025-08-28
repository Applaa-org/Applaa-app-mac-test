## Applaa Spark Context & AI Vector SQLite Implementation Review

### System Overview
Your Spark AI Context Engine is a local-first semantic intelligence system that indexes code and docs, generates embeddings with on-device models, and returns smart file suggestions to optimize AI prompts and developer workflows.

### Architecture Components

#### 1) Core Engine (`SemanticContextManager`)
- Location: `src/context/semantic_context_manager.ts`
- Responsibilities:
  - Lifecycle of the semantic system (init/dispose)
  - Orchestrates `VectorStore`, `EmbeddingsService`, `IndexingPipeline`
  - Smart suggestions with relevance and cross-app search
  - Feedback capture and analytics aggregation

#### 2) AI Embeddings Service (`EmbeddingsService`)
- Location: `src/context/embeddings_service.ts`
- Model: `@xenova/transformers` with `Xenova/all-MiniLM-L6-v2` (384 dims)
- Features:
  - Local-only, CPU-friendly; quantized model
  - Batch and single embedding generation
  - Code/doc pre-processing for higher-quality vectors

```typescript
// Highlights
await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  quantized: true,
  device: 'cpu',
});
```

#### 3) SQLite Vector Database (`VectorStore`)
- Location: `src/context/vector_store.ts`
- Storage:
  - `context_documents` (content + embedding BLOB, metadata)
  - `context_usage` (per-suggestion feedback: accept/reject, similarity)
  - `context_analytics` (usage_count, acceptance_rate, avg_similarity)
- Queries:
  - Cosine similarity on stored embeddings
  - Relevance score = similarity + usage/acceptance boosts

```sql
CREATE TABLE IF NOT EXISTS context_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  tokens INTEGER DEFAULT 0,
  language TEXT,
  embedding BLOB,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(app_id, file_path)
);

CREATE TABLE IF NOT EXISTS context_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  query_text TEXT NOT NULL,
  similarity REAL NOT NULL,
  accepted BOOLEAN NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES context_documents (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS context_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  acceptance_rate REAL DEFAULT 0.0,
  avg_similarity REAL DEFAULT 0.0,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(app_id, file_path)
);
```

#### 4) Indexing Pipeline (`IndexingPipeline`)
- Location: `src/context/indexing_pipeline.ts`
- Flow:
  - Scan: include code/doc types, exclude heavy paths
  - Process: content hash, language detect, token estimate, summary
  - Embed: batch generation for performance
  - Store: insert/update documents and vectors

```typescript
// Embedding text composition
`File: ${filePath}\nLanguage: ${language}\nSummary: ${summary}\nContent: ${preview}`
```

### Capabilities
- Semantic search across code/docs with language-aware preprocessing
- Cross-app intelligence and “mentioned app” prioritization
- Learning system with user feedback (accept/reject)
- Relevance scoring blends similarity, usage frequency, acceptance rate
- Incremental updates via content hashing to avoid reprocessing unchanged files

### UI Integration
- Hooks: `src/hooks/useSemanticContext.ts`
  - `useSemanticSuggestions`, `useIndexApp`, `useRecordSemanticFeedback`, `useIsAppIndexed`, `useSemanticFileCount`, `useSemanticAnalytics`, `useInitializeSemanticContext`
- Components:
  - `src/components/context/SmartSuggestions.tsx` (accept/reject UI, reasoning, similarity)
  - `src/components/context/SmartContextFilesPicker.tsx` (file picker integration)
  - `src/components/SparkModeSelector.tsx` (feature toggles)
  - `src/components/context/SemanticContextInitializer.tsx` (on-start initialization)
- IPC:
  - Handlers: `src/ipc/handlers/semantic_context_handlers.ts`
  - Client: `src/ipc/ipc_client.ts` (invoke get/index/update/delete/analytics/init)
  - Registration: `src/ipc/ipc_host.ts`

### Strengths
- Privacy-first: 100% local embeddings and search
- Fast: WAL-mode SQLite + batched embeddings + indexed queries
- Robust: graceful degradation if transformers unavailable
- Maintainable: clean separation (manager/store/service/pipeline)
- Adaptive: learns from feedback; analytics drive relevance

### Areas to Enhance
- Vector search speed for very large corpora
  - Optionally integrate ANN (e.g., HNSW) or coarse pruning
- Model quality options
  - Offer higher-accuracy model variants (e.g., mpnet) as opt-in
- Analytics depth
  - Time-to-acceptance, query clustering, long-term drift analysis
- Memory usage safeguards
  - Embedding compression, chunking for very large files

### Potential Risks & Mitigations
- Initial indexing time on large repos → background index + progress UI
- Model download size on first run → pre-bundle/cache warming
- Embedding drift after model upgrade → versioning + reindex prompt

### Overall Assessment
Production-quality, well-architected system that is a true differentiator:
- Local, private, and fast
- Intelligently learns from usage
- Cleanly integrated with UI and IPC layers

This engine meaningfully improves context quality and developer productivity, and positions Applaa ahead of cloud-only competitors.
