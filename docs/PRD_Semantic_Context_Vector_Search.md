# Applaa Semantic Context & Vector Search - PRD

## 1. Problem Statement
Applaa users experience context loss and manual effort in selecting relevant files. Current Spark Context optimizes file inclusion but lacks semantic understanding, cross-app learning, and persistence of helpful context across sessions.

## 2. Goals
- Reduce context loss across chats and sessions.
- Automatically surface the most relevant code and docs for a query.
- Provide cross-app insights when users mention or implicitly reference other apps.
- Maintain local-first, privacy-preserving behavior with no external infra required.
- Keep token usage efficient and predictable.

## 3. Non-Goals
- Replacing existing ContextPaths UI or Spark Context; we enhance, not replace.
- Cloud-managed vector DBs (e.g., Pinecone) in MVP.
- Complex ML pipelines; we focus on pragmatic, robust heuristics + local embeddings.

## 4. User Stories
- As a developer, when I ask for a change, Applaa automatically finds the right files without me typing globs.
- As a developer, I can accept/reject “Smart Suggestions” and the system learns.
- As a developer, I can reference other apps by name and relevant parts are brought in.
- As a developer, I can see an analytics view of which files and patterns most often help.

## 5. Architecture Overview
- Local Embeddings Service (Xenova/TFJS) generates 384-d embeddings for files/snippets.
- SQLite Vector Store holds embeddings + metadata (appId, filePath, summary, tokens).
- Indexing Pipeline: initial full index + incremental updates on file changes.
- Semantic Search API: returns top-K matches for a query or selected component.
- UI: Smart Suggestions panel in `ContextFilesPicker` + indicators in chat.
- Learning: usage tracking, feedback hooks; analytics dashboard for visibility.

## 6. Functional Requirements
- FR1: Generate embeddings for code files, docs, and chat summaries.
- FR2: Store embeddings + metadata locally; query by similarity (cosine) in < 50ms for 10k docs.
- FR3: Provide semantic suggestions API that merges with existing ContextPaths.
- FR4: Persist accepted/rejected suggestions and use them to adapt ranking.
- FR5: Support cross-app semantic search when prompt mentions other apps.
- FR6: Respect exclude paths and Spark Context rules; never include excluded content.
- FR7: Expose feature flags in Settings to enable/disable Semantic Context.
- FR8: Provide analytics (top helpful files, token savings, acceptance rate).

## 7. Non-Functional Requirements
- NFR1: Local-first, offline-capable. No network calls required.
- NFR2: Privacy: Do not upload code to third parties. Models stored locally.
- NFR3: Performance: Indexing completes within 2 minutes for 5k files; searches < 50ms.
- NFR4: Reliability: Graceful fallback to existing Spark Context when vector store unavailable.
- NFR5: Backwards Compatibility: No migrations that break existing users; additive tables only.

## 8. Data Model
- context_documents(id, app_id, file_path, content_hash, content, summary, tokens, language, created_at, updated_at)
- context_embeddings(id, document_id, embedding BLOB, dimension INT, model_version TEXT)
- context_usage(id, document_id, query_text, similarity_score REAL, was_helpful BOOL, created_at)

## 9. APIs (IPC)
- context:index-app { appId }
- context:search { appId, query, topK }
- context:suggestions { appId, query, limit }
- context:feedback { documentId, wasHelpful }
- context:analytics { appId, range }

## 10. UX
- ContextFilesPicker: new “Smart Suggestions” card with accept/reject.
- Badges on suggested files (relevance %, learned, recent, cross-app).
- Settings → Spark: toggle “Semantic Context (beta)”.
- Optional “Why suggested?” tooltip with brief rationale.

## 11. Rollout Plan
- Phase 1 (MVP): SQLite + Xenova embeddings; manual trigger “Index app”.
- Phase 2: Auto-incremental indexing on file changes; cross-app search.
- Phase 3: Learning + analytics; predictive preloading.

## 12. Success Metrics
- ≥30% reduction in average tokens per request (vs baseline).
- ≥20% faster time-to-first-successful-edit.
- ≥60% Smart Suggestions acceptance rate.
- < 50ms median semantic search latency for 10k docs.

## 13. Risks & Mitigations
- Model download size → Use quantized MiniLM (~23MB). Lazy download.
- Performance on huge repos → Limit max files, chunk large files, cache embeddings.
- Windows native issues → Use pure JS libs; avoid native binaries.
- Token spikes → Enforce caps and show preview of added context.

## 14. Milestones
- M1: Vector store schema + embedding service (local) ready.
- M2: Initial indexer; `context:search` IPC.
- M3: UI Smart Suggestions in `ContextFilesPicker`.
- M4: Spark integration + feedback tracking.
- M5: E2E tests, docs, and analytics dashboard.

## 15. Open Questions
- Should we chunk files (code-aware) for finer-grained recall? (likely yes in Phase 2)
- Do we embed diffs for in-flight edits? Integrate with VirtualFilesystem.
- How to weight manual context vs semantic suggestions? (manual > semantic)



