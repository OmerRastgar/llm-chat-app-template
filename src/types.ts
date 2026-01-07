/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
	/**
	 * Binding for the Workers AI API.
	 */
	AI: Ai;

	/**
	 * Binding for static assets.
	 */
	ASSETS: { fetch: (request: Request) => Promise<Response> };

	/**
	 * Vectorize index binding (Cloudflare Vectorize)
	 * Bound by name in `wrangler.jsonc` under the `vectorize` array.
	 * Example binding name: `PROD_SEARCH` — use `env.PROD_SEARCH` to query.
	 */
	PROD_SEARCH?: {
		/** Query the index with an embedding or text; implementation depends on provider */
		query?: (opts: { query: string | number[]; k?: number }) => Promise<any>;
	};
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}
