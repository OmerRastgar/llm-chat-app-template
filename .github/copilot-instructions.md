# Copilot / AI Agent Instructions for this repo

Purpose: help an AI coding agent be immediately productive in this Cloudflare Workers LLM chat template.

- **Big picture**: This is a single Cloudflare Worker that serves static frontend assets and an API used for chat. The Worker (backend) lives in `src/index.ts` and static files are in `public/`.
- **Request flow**: frontend POSTs to `/api/chat` -> Worker `handleChatRequest` (in `src/index.ts`) calls `env.AI.run()` with `messages` and returns a streaming SSE response -> frontend `public/chat.js` consumes SSE and appends tokens to the UI.

- **Key files**:
  - `src/index.ts` — main Worker entry; look here for `MODEL_ID`, `SYSTEM_PROMPT`, AI invocation, and SSE headers.
  - `src/types.ts` — environment and `ChatMessage` types; update when adding bindings.
  - `public/chat.js` — frontend SSE consumer; implements `consumeSseEvents()` and supports both Workers AI `response` and OpenAI-like `choices[0].delta.content` deltas.
  - `public/index.html` — simple UI and CSS variables for styling.
  - `package.json` / `wrangler.jsonc` — dev/build/deploy scripts and Wrangler configuration.

  - **Vectorize binding**:
    - This repo now includes a Vectorize index binding example in `wrangler.jsonc` named `PROD_SEARCH` bound to the index `pci`.
    - After adding or changing bindings, run `npm run cf-typegen` to refresh Worker types.
    - Access the binding from Worker code as `env.PROD_SEARCH`. The shape in `src/types.ts` is minimal — treat it as a platform-provided client and call it via its query method or by fetching the REST interface if needed.

- **Important patterns & conventions**:
  - Streaming: the backend returns `text/event-stream` and streams JSON SSE `data:` events. Do not change the SSE framing without also updating `public/chat.js`'s parser (`consumeSseEvents`).
  - Message shape: chat history is an array of `ChatMessage` objects (`role` and `content`). The Worker prepends a `system` prompt if one is not provided.
  - Model/config: the deployed model is set via `MODEL_ID` in `src/index.ts`. AI Gateway usage is left commented — toggle by uncommenting and setting `id`.
  - Error responses: backend returns JSON `{ error: ... }` with status 500 on exceptions — frontend expects non-2xx to be handled as errors.

- **Developer workflows (commands)**:
  - Install: `npm install`
  - Generate Worker types: `npm run cf-typegen` (runs `wrangler types`)
  - Local dev (uses Wrangler): `npm run dev` or `npm start` (starts Worker locally at :8787)
  - Dry-run check: `npm run check` (runs `tsc --noEmit && wrangler deploy --dry-run`)
  - Deploy: `npm run deploy`
  - Tests: `npm run test` (uses `vitest`)

- **Editing notes & quick examples**:
  - To change the system prompt: edit `SYSTEM_PROMPT` in `src/index.ts` (the Worker will prepend it if `messages` lacks a system role).
  - To change the model: update `MODEL_ID` in `src/index.ts`.
  - To add a binding (e.g., KV or R2), update `Env` in `src/types.ts` and add the binding to `wrangler.jsonc`.

  - Example `wrangler.jsonc` Vectorize entry:

  ```jsonc
  "vectorize": [
    {
      "binding": "PROD_SEARCH",
      "index_name": "pci"
    }
  ]
  ```
  - If you modify the SSE output shape, update `consumeSseEvents()` in `public/chat.js` to keep frontend parsing working.

- **Testing & debugging tips**:
  - Use `npm run dev` to iterate locally; be aware Workers AI calls still hit your Cloudflare account (may incur charges).
  - Use `console.log` in `src/index.ts` — Wrangler will surface logs locally; use `wrangler tail` for deployed logs.
  - Run `npm run cf-typegen` after changing `wrangler.jsonc` or bindings so TypeScript types match.

- **What not to change without caution**:
  - SSE framing and `content-type` headers — frontend parsing depends on them.
  - The `messages` array format and the presence/position of the `system` message.

If anything here is unclear or you want me to expand examples (for instance, exact lines to edit in `src/index.ts` or a patch to add an AI Gateway example), tell me which area to expand and I will iterate.
