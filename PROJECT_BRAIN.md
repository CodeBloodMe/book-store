# Books System - Project Brain

This file serves as the memory bank and architectural overview for the project. Read this file to understand the system without needing to walk through the entire codebase.

## 1. Tech Stack
- **Framework**: Next.js 16.2 (App Router, Server & Client Components)
- **UI Library**: React 19, Framer Motion (animations), Tailwind CSS v4
- **Database / Backend**: Supabase (PostgreSQL with `pgvector` for semantic search)
- **AI / LLM**: `@google/genai` (used for intelligent RAG recommendations and input normalization)
- **Reader Engine**: `react-reader` / epub.js (for rendering ePub files)

## 2. Core Architecture

### Agentic RAG Recommendation Engine (`app/api/recommend/route.ts`)
The core feature is a smart book recommendation system designed to handle abstract or emotional user queries. It uses a multi-phase Agentic RAG approach:
1. **Input Normalization Layer (LLM)**: Intercepts raw, messy user prompts and translates them into a strict JSON search profile (genres, physical plot elements, `excluded_keywords`, `excluded_authors`).
2. **Database Search (Supabase)**: Combines vector similarity search (`match_books` RPC) and keyword matching.
3. **JIT Fallback**: If the local database has insufficient matches, it falls back to OpenLibrary/Wikipedia APIs.
4. **Rationale Layer (LLM)**: Analyzes the retrieved books against the normalized profile and generates a user-facing explanation of *why* the book was recommended, actively flagging "weak matches".

### Free Books Reader (`components/EpubReaderClient.tsx`)
A custom ePub reader wrapper around `react-reader`.
- **Navigation**: Supports Table of Contents (TOC), bookmarks, highlights, and a newly added **direct page jump** input in the top toolbar.
- **Settings Panel (`components/reader/ReaderSettingsPanel.tsx`)**: Features a premium, tactile UI with an SVG paper noise texture, elegant typography (Georgia/Playfair), custom font sizing sliders, and custom radio buttons for line spacing and margins.
- **State Management**: Reader preferences (theme, font, margins) are saved locally and applied on load.

### Key UI Components
- **`FloatingCovers.tsx`**: A dynamic, parallax hero section displaying floating book covers for high visual engagement.
- **`AuthorBioPanel.tsx`**: A sleek slide-out panel for author information.
- **`ReaderTOCDrawer.tsx`**: A unified sidebar in the reader for Chapters, Bookmarks, and Highlights.

## 3. Design Principles
- **Premium & Tactile**: The UI leans into a curated, premium aesthetic. For example, the reader settings panel uses subtle noise overlays to mimic physical paper, coupled with elegant serif typography.
- **Constraint-Driven AI**: The LLM integrations are heavily constrained via strict system prompts and JSON schemas to prevent hallucinations and vector drift. 
- **Space Efficiency**: UIs should be clean and concise. For example, search history is paginated rather than infinitely stacking.

## 4. Recent Milestones
- **RAG Hardening**: Enforced the Input Normalization Layer directly in the API route to prevent raw text from polluting the vector search.
- **Reader Enhancements**: Added an inline page jump feature directly into the reader's top toolbar.
- **Premium Settings Redesign**: Completely overhauled the reader settings sidebar to match a premium visual reference, including progress bars and custom controls.
