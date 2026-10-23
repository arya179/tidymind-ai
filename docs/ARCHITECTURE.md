# Architecture & Design Overview: TidyMind AI

## Overview
**TidyMind AI** is a privacy-focused local productivity assistant created for the **Hacktoberfest 2026 Week 3** challenge. It helps users organize messy task lists, summarize daily notes, and plan clean directory structures using open-weight AI models running locally on their machine.

## Key Principles
1. **Zero Data Leakage / Full Privacy**: User tasks, notes, and file names stay 100% on their machine, processed via a local Ollama instance.
2. **Simple Maintainability**: Designed with clear separation between a standard React + Vite frontend and a lightweight Python FastAPI backend.
3. **Local AI Engine**: Interfaces directly with Ollama's local REST API (e.g., `llama3.2`, `mistral`, or `phi3`).

## Project Structure
```text
tidymind-ai/
  ├── frontend/       # React + Vite + Tailwind CSS
  ├── backend/        # Python FastAPI + Ollama API client
  ├── docs/           # Documentation and architecture guides
  ├── README.md       # Project setup and instructions
  └── .gitignore      # Git exclusion rules
```

## Next Milestones
- **Milestone 2**: Connect FastAPI backend to local Ollama instance and provide health/model verification endpoints.
- **Milestone 3**: Implement Task Organizer, Notes Summarizer, and Directory Layout Planner UI components.
- **Milestone 4**: Connect frontend with backend endpoints and test end-to-end local generation flows.
