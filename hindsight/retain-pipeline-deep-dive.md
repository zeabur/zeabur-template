# Hindsight Retain Pipeline — Deep Dive

This document explains every step of the retain pipeline in detail: how raw text becomes structured, searchable memories with entity graphs and multi-dimensional links.

## Overview

```
Raw Text
    |
    v
[Step 0] Chunking + Delta Detection
    |
    v
[Step 1] LLM Fact Extraction
    |
    v
[Step 2] Embedding Generation
    |
    v
[Step 3 / Phase 1] Entity Resolution (separate DB connection)
    |
    v
[Step 4 / Phase 2] Atomic Write Transaction
    |--- 4a: Insert facts into memory_units
    |--- 4b: Insert unit_entities (fact-entity associations)
    |--- 4c: Create temporal links
    |--- 4d: Create semantic links
    |--- 4e: Create causal links
    |
    v
[Step 5 / Phase 3] Post-transaction (fire-and-forget)
    |--- 5a: Entity links for UI visualization
    |--- 5b: Final semantic ANN pass (streaming mode)
```

---

## Step 0: Chunking + Delta Detection

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/fact_extraction.py:376` — `chunk_text()`

### What it does

Splits raw input into manageable chunks that the LLM can process.

### How it works

1. **Size check**: If input is under `max_chars` (default 3,000 chars), return as-is.

2. **Format detection**:
   - **JSON conversation array** (e.g., `[{"role": "user", "content": "..."}, ...]`): Splits at turn boundaries, keeping complete user/assistant turns together. Never breaks mid-turn.
   - **Plain text**: Uses `RecursiveCharacterTextSplitter` with a priority order of split points:
     ```
     \n\n (paragraphs) → \n (lines) → ". " (sentences) → "! " → "? " → "; " → ", " → " " (words) → "" (chars)
     ```

3. **Delta retain**: Each chunk gets a SHA256 content hash. On re-ingestion of the same document:
   - Unchanged chunks (same hash) are **completely skipped** — their existing facts, entities, and links are preserved.
   - Only changed chunks go through the extraction pipeline.
   - This makes document updates an incremental operation.

### Example

```
Input: 50,000 char document
    ↓
Output: 17 chunks, each ~3,000 chars
    ↓
Delta check: 3 chunks changed since last retain → only these 3 are processed
```

---

## Step 1: LLM Fact Extraction

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/fact_extraction.py:145-278`

### What it does

Sends each chunk to an LLM to extract structured facts with entities, temporal info, locations, and causal relationships.

### The LLM prompt asks for

Each fact has 5 dimensions (the "5W" pattern):

| Field | Description | Example |
|-------|-------------|---------|
| `what` | Core fact (1-2 sentences, complete and detailed) | "Emily got married to Sarah at a rooftop garden ceremony with 50 guests" |
| `when` | Temporal info (dates, durations, relative references) | "on June 15th, 2024 at 3pm" |
| `where` | Location (city, venue, building, online) | "rooftop garden venue in downtown San Francisco" |
| `who` | People/entities with relationships | "Emily (user's college roommate), Sarah (Emily's partner of 5 years)" |
| `why` | Context, significance, emotions, motivations | "User was moved by the intimate ceremony, wants a similar venue" |

Plus metadata:

| Field | Values | Purpose |
|-------|--------|---------|
| `fact_type` | `world` / `assistant` | `world` = about the user/others; `assistant` = AI's own actions/experiences |
| `fact_kind` | `event` / `conversation` | `event` = has specific dates; `conversation` = general info |
| `occurred_start` | ISO timestamp or null | When the event happened |
| `occurred_end` | ISO timestamp or null | When the event ended (for duration events) |
| `entities` | List of `{"text": "..."}` | Named entities extracted from the fact |
| `causal_relations` | List of `{target_index, relation_type, strength}` | Causal links to previous facts |

### Fact text assembly

The 5W fields are combined into a single stored string via `build_fact_text()`:

```
"Emily got married to Sarah at a rooftop garden ceremony | Involving: Emily, Sarah | User was emotionally moved"
```

Only `what` is always included; `who` and `why` are appended only if they are not "N/A".

### Extraction modes

| Mode | Behavior |
|------|----------|
| Default | Full LLM extraction with structured JSON output |
| `chunks` | Skip LLM entirely — store each chunk as-is (fast, but no structure) |
| `verbatim` | LLM extracts only metadata (entities, times, locations); original chunk text is preserved as fact_text |
| `verbose` | Detailed extraction with extra-long field descriptions (higher quality, more tokens) |

### Quality controls

1. **Temperature 0.1**: Ensures deterministic, consistent output across runs.

2. **Pydantic schema validation**: Every LLM response is validated against a strict schema. Missing required fields cause rejection.

3. **Auto-split on failure**: If the LLM returns malformed JSON or the response is too long:
   - The chunk is split in half
   - Each half is re-extracted independently
   - This recurses up to 3 levels deep (8 sub-chunks max)

4. **Causal relation bounds checking**: `target_index` must be less than the current fact's position. Fact #5 can only reference facts 0-4. This prevents hallucinated forward references.

5. **Relative time inference**: If the LLM fails to set `occurred_start` but the text contains relative time expressions, a fallback parser handles them:
   ```
   "last night" + event_date=2024-06-15 → 2024-06-14T00:00:00
   "yesterday"  → event_date - 1 day
   "next week"  → event_date + 7 days
   "this month" → event_date (same day)
   ```

6. **Text sanitization**: `_sanitize_text()` strips control characters from LLM output.

### Concurrency

- Chunks are extracted in parallel using an asyncio semaphore (max 32 concurrent LLM calls).
- For very large documents, a producer-consumer pattern is used: LLM extraction (CPU-bound) runs in parallel with DB writes (I/O-bound).

---

## Step 2: Embedding Generation

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/embedding_processing.py:15-46`

### What it does

Generates vector embeddings for each extracted fact, with text augmentation for better retrieval.

### The augmentation process

The fact text is **augmented** before embedding, but the **original text** is stored in the database:

```
Original fact:  "Emily got married to Sarah at a rooftop garden ceremony"
    ↓ Add dates
Augmented:      "Emily got married to Sarah at a rooftop garden ceremony (happened in June 2024)"
    ↓ Add entities
Augmented:      "...ceremony (happened in June 2024) [Emily, Sarah, San Francisco]"
    ↓ Send to embedding model
Output:         [0.023, -0.156, 0.892, ...]  (stored as pgvector)
```

### Why augment?

- A query like "June camping trip" would weakly match "went camping" but strongly match "went camping (happened in June 2024)"
- Entity names in the embedding help with entity-oriented queries like "things about Emily"

### BM25 text signals

Simultaneously, `fact_storage.py` builds a `text_signals` field:

```
text_signals = "Emily Sarah San Francisco June 15 2024"
```

These signals are injected into the full-text search index alongside the fact text, enriching BM25 retrieval with entity names and date tokens that may not appear in the original fact text.

### Embedding model

- Default: local `BAAI/bge-small-en-v1.5` (sentence-transformers)
- Can be configured to use external TEI (Text Embeddings Inference) server

---

## Step 3 / Phase 1: Entity Resolution

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/entity_processing.py:52` and `hindsight-api-slim/hindsight_api/engine/entity_resolver.py:170`

### What it does

Resolves entity names extracted by the LLM to canonical entity IDs in the bank. Runs on a **separate database connection** outside the write transaction.

### Why a separate connection?

Entity resolution involves expensive read operations (trigram GIN scans, co-occurrence queries). If these ran inside the write transaction, they would hold row locks for seconds, causing deadlocks under concurrent load.

### The resolution process

```
New fact mentions "Emily"
    ↓
Step 3a: Trigram candidate search
    Use pg_trgm GIN index for fuzzy matching against existing entities:
    ├─ "Emily Chen"     (trigram similarity: 0.8)
    ├─ "Emily Johnson"  (trigram similarity: 0.75)
    └─ "Emma"           (trigram similarity: 0.4, below threshold)
    ↓
Step 3b: Co-occurrence scoring
    Query entity_cooccurrences table:
    "Emily Chen" has historically appeared with "Sarah", "San Francisco" → bonus
    "Emily Johnson" has no relevant co-occurrences → no bonus
    ↓
Step 3c: Final decision
    ├─ Match found → return entity_id of "Emily Chen"
    └─ No good match → INSERT new entity, return new entity_id
```

### Two resolution strategies

| Strategy | How it works | Best for |
|----------|-------------|----------|
| `trigram` (default) | pg_trgm GIN index scan, fetches only similar candidates per entity name | Large banks (1000+ entities) |
| `full` | Loads ALL entities in the bank into memory, matches in Python | Small banks |

The resolver auto-detects if `pg_trgm` extension is available. If not, it falls back to `full` strategy.

### User-provided entities

The API accepts optional `entities` in the retain request. These are merged with LLM-extracted entities (deduplicated by name), allowing callers to pre-specify known entities.

### Semantic ANN pre-search

While on this same separate connection, the pipeline also runs an HNSW approximate nearest neighbor search:

```
For each new fact's embedding:
    → Query HNSW index (ef_search=60, lower than recall's 400 for speed)
    → Find top-50 existing facts with cosine similarity ≥ 0.7
    → Split queries by fact_type (world/assistant) to use partial HNSW indexes
    → Return pre-computed link candidates for Phase 2
```

This avoids running expensive ANN queries inside the write transaction.

---

## Step 4 / Phase 2: Atomic Write Transaction

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/orchestrator.py:215-308`

### What it does

Inserts all facts and creates retrieval-critical links in a **single database transaction**. All-or-nothing: if any step fails, the entire batch is rolled back.

### 4a: Insert facts → `memory_units` table

```sql
INSERT INTO memory_units (
    bank_id, text, embedding, event_date, occurred_start, occurred_end,
    mentioned_at, context, fact_type, confidence_score, metadata,
    chunk_id, document_id, tags, observation_scopes, text_signals, search_vector
)
```

Each fact stores:
- `text`: The combined fact text (what | who | why)
- `embedding`: Vector from Step 2 (pgvector type)
- `event_date`: Best available date (occurred_start or mentioned_at)
- `fact_type`: "world", "experience", or "opinion"
- `confidence_score`: Only set for "opinion" facts (always 1.0)
- `text_signals`: Entity names + date tokens for BM25 enrichment
- `search_vector`: Pre-tokenized BM25 vector (VectorChord mode)

Returns a list of generated UUID `unit_ids`.

### 4b: Insert unit_entities

After real UUIDs are created, Phase 1's placeholder IDs ("0", "1", "2") are remapped to actual UUIDs:

```
Before: ("0", entity_idx=0, date) → After: ("a1b2c3d4-...", entity_idx=0, date)
```

Then batch-inserts into `unit_entities` junction table:

```
(unit_id=fact_001, entity_id=emily_chen)
(unit_id=fact_001, entity_id=sarah)
(unit_id=fact_001, entity_id=san_francisco)
```

### 4c: Create temporal links

Finds facts that occurred close in time (default ±24 hour window):

```
weight = max(0.3, 1.0 - (time_diff_hours / time_window_hours))

fact_001 (June 15) ↔ fact_089 (June 15)  → weight = 1.0 (same day)
fact_001 (June 15) ↔ fact_042 (June 14)  → weight = 0.7 (8 hours apart)
fact_001 (June 15) ↔ fact_067 (June 13)  → outside window, no link
```

Each unit keeps at most 20 temporal links (top-20 by weight). Retrieval only reads 10-20 per unit via LATERAL join, so keeping more is wasted storage.

### 4d: Create semantic links

Uses the pre-computed ANN results from Phase 1, plus within-batch cosine similarity:

```
fact_001 ↔ fact_089  → similarity = 0.92 (highly related)
fact_001 ↔ fact_042  → similarity = 0.71 (somewhat related)
```

### 4e: Create causal links

Inserts causal relationships identified by the LLM during extraction:

```
fact_003 --caused_by-→ fact_001  (strength: 0.9)
"Emily quit her job BECAUSE she got married and moved to SF"
```

### Deadlock prevention

All links are sorted by `(from_unit_id, to_unit_id)` before batch INSERT. This ensures concurrent transactions acquire index locks in the same order, eliminating circular-wait deadlocks.

The INSERT uses `unnest()` arrays in a single statement (one round-trip to DB) rather than `executemany` (N round-trips), which also reduces lock interleaving.

---

## Step 5 / Phase 3: Post-Transaction Processing

**Source**: `hindsight-api-slim/hindsight_api/engine/retain/orchestrator.py:311-348`

### What it does

Runs after the transaction commits. These operations are best-effort — failures don't affect data integrity.

### 5a: Entity links (UI visualization)

Queries `unit_entities` to find facts that share the same entity, then creates `entity_link` edges:

```
fact_001 --entity:emily_chen-→ fact_089  (both mention Emily Chen)
```

These are used **only** for the Constellation graph view in the control plane UI. Recall/retrieval does NOT use these links — it uses a `unit_entities` self-join instead, which is always up-to-date.

### 5b: Final semantic ANN pass (streaming mode)

For large documents, retain processes chunks in streaming mini-batches (100 chunks per batch). Each batch's Phase 1 ANN search only finds neighbors among facts that existed at that point.

After ALL batches commit, a single final ANN pass runs across all newly committed facts:

```
All new facts from this document → HNSW index probe → create cross-batch semantic links
```

This ensures facts from batch #1 and batch #10 can be semantically linked, even though they were processed hours apart.

---

## What a single piece of text becomes

```
Input: "Emily told me she got married last June at a rooftop garden in SF"

After retain:
├── memory_units: 1 row
│   ├── text: "Emily got married to Sarah at a rooftop garden ceremony | Involving: Emily, Sarah"
│   ├── embedding: [0.023, -0.156, 0.892, ...]
│   ├── event_date: 2024-06-15T00:00:00Z
│   ├── fact_type: "world"
│   └── text_signals: "Emily Sarah San Francisco June 15 2024"
│
├── entities: 3 rows (or resolved to existing)
│   ├── Emily Chen (canonical_name)
│   ├── Sarah
│   └── San Francisco
│
├── unit_entities: 3 rows
│   ├── (fact_001, emily_chen_id)
│   ├── (fact_001, sarah_id)
│   └── (fact_001, san_francisco_id)
│
└── memory_links:
    ├── temporal: links to facts from similar time period
    ├── semantic: links to facts with similar meaning
    ├── causal: links to facts that caused or were caused by this fact
    └── entity: links to facts sharing the same entities (UI only)
```

These multi-dimensional links enable recall to find relevant memories from any angle — by meaning, by time, by entity graph, or by full-text search.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `engine/retain/orchestrator.py` | Main pipeline coordinator, 3-phase flow |
| `engine/retain/fact_extraction.py` | LLM-based fact extraction, chunking, schema models |
| `engine/retain/embedding_processing.py` | Text augmentation and embedding generation |
| `engine/retain/entity_processing.py` | Entity extraction and resolution orchestration |
| `engine/retain/fact_storage.py` | Database INSERT for facts (memory_units) |
| `engine/retain/link_creation.py` | Temporal, semantic, causal link creation |
| `engine/retain/link_utils.py` | Low-level link computation and bulk INSERT |
| `engine/entity_resolver.py` | Trigram/full entity resolution with co-occurrence |
