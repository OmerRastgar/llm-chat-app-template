/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// Default system prompt
const SYSTEM_PROMPT =
	"You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			// Handle POST requests for chat
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}

			// Method not allowed for other request types
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Parse JSON request body
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		// Add system prompt if not present
		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		// Optional: retrieval-augmented generation using the Vectorize index binding
		try {
			// Find most recent user message to use as a query
			const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
			if (env.PROD_SEARCH?.query && lastUserMsg) {
				const raw = await env.PROD_SEARCH.query({ query: lastUserMsg, k: 5 });
				// Normalize common shapes: { results }, { hits }, { items }, or raw array
				let hits: any[] = [];
				if (Array.isArray(raw)) hits = raw;
				else if (Array.isArray(raw?.results)) hits = raw.results;
				else if (Array.isArray(raw?.hits)) hits = raw.hits;
				else if (Array.isArray(raw?.items)) hits = raw.items;
				// Build a short context from top hits
				if (hits.length > 0) {
					const snippets = hits.slice(0, 5).map((h: any, i: number) => {
						const id = h.id ?? h.document_id ?? i;
						const score = h.score ?? h.similarity ?? "";
						const text = h.text ?? h.content ?? h.metadata?.text ?? h.document ?? JSON.stringify(h);
						return `Source(${id}) score=${score}: ${String(text).slice(0, 800)}`;
					});
					messages.unshift({
						role: "system",
						content: `Relevant context (from PCI vector index):\n\n${snippets.join("\n\n")}\n\nUse this information to answer the user.`,
					});
				}
			}
		} catch (e) {
			console.error("Vectorize retrieval failed:", e);
		}

		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
				stream: true,
			},
			{
				// Uncomment to use AI Gateway
				// gateway: {
				//   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
				//   skipCache: false,      // Set to true to bypass cache
				//   cacheTtl: 3600,        // Cache time-to-live in seconds
				// },
			},
		);

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}
