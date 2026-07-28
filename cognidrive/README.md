# CogniDrive

Multi-AI Workspace & Document Intelligence App — inspired by Google Drive + NotebookLM.

## Features

- **Document Storage** — Upload PDF, TXT, and CSV files with drag-and-drop, quota tracking, and file management
- **Multi-AI Chat** — Switch between GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro via OpenRouter
- **Document RAG** — 500-word chunking, pgvector embeddings, and semantic retrieval during chat
- **Studio Tools (NotebookLM-style)**
  - **Audio Overview** — Two-speaker AI podcast with TTS playback and speed control
  - **Interactive Mind Map** — React Flow visualization with zoom, pan, and collapsible nodes
  - **Data Table Extractor** — Structured entity extraction with search/filter and CSV export

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI |
| Visualization | @xyflow/react (React Flow) |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL + pgvector |
| Storage | Supabase Storage |
| AI Gateway | OpenRouter API |
| TTS | ElevenLabs or OpenAI TTS |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Create a storage bucket named `cognidrive-files`
4. Copy your project URL and keys to `.env.local`

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # RAG-powered multi-model chat
│   │   ├── files/route.ts         # Upload & list files
│   │   ├── files/[id]/route.ts    # Delete & get file
│   │   └── studio/
│   │       ├── audio/route.ts     # Podcast generation + TTS
│   │       ├── mindmap/route.ts   # Mind map JSON generation
│   │       └── table/route.ts     # Structured data extraction
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── chat/                      # Chat panel & model switcher
│   ├── layout/                    # Workspace split-screen layout
│   ├── storage/                   # Sidebar, uploader, viewer
│   ├── studio/                    # Audio, mind map, data table
│   └── ui/                        # Shadcn UI primitives
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── supabase/client.ts
│   ├── openrouter.ts              # LLM & embedding calls
│   ├── rag.ts                     # Chunk storage & retrieval
│   ├── document-parser.ts         # PDF/TXT/CSV parsing
│   ├── tts.ts                     # ElevenLabs / OpenAI TTS
│   └── utils.ts
└── types/
    └── index.ts
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/files` | List files + storage quota |
| POST | `/api/files` | Upload, parse, chunk, embed |
| DELETE | `/api/files/[id]` | Delete file + chunks |
| POST | `/api/chat` | RAG chat with model selection |
| POST | `/api/studio/audio` | Generate podcast transcript + MP3 |
| POST | `/api/studio/mindmap` | Generate hierarchical mind map JSON |
| POST | `/api/studio/table` | Extract structured data table |

## License

MIT
