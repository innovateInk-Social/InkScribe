/**
 * Stateless Transport Layer.
 * Dispatches autosave and publish payloads to the InnovateInk backend.
 *
 * In production: sends directly to the configured InnovateInk API endpoint.
 * In development: falls back gracefully if the mock server is unreachable,
 *   caching payloads to localStorage for debugging session continuity.
 */

const IS_DEV = import.meta.env.DEV;

// Resolve API base:
//  1. Explicit `api_base` query param (skeleton injection)
//  2. Env variable set at build time (VITE_API_BASE)
//  3. Dev default: relative /api/editor (hits the local Vite proxy or mock)
const urlParams = new URLSearchParams(window.location.search);
const API_BASE =
  urlParams.get('api_base') ||
  import.meta.env.VITE_API_BASE ||
  '/api/editor';

export const apiClient = {
  /**
   * Dispatches an incremental autosave payload.
   * POST /api/editor/autosave
   */
  autosave: async (articleId, blocks = [], updatedBlockIds = []) => {
    const payload = {
      article_id: articleId,
      draft: true,
      content_json: blocks,
      updated_blocks: updatedBlockIds
    };

    try {
      const response = await fetch(`${API_BASE}/autosave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, serverResult: result };
    } catch (err) {
      if (IS_DEV) {
        // Only cache & warn in development
        localStorage.setItem(`innovateink_draft_${articleId}`, JSON.stringify(payload));
        console.warn('[Editor Transport] Autosave endpoint unreachable — cached locally.', err.message);
      }
      return { success: false, fallbackSaved: IS_DEV, payload };
    }
  },

  /**
   * Dispatches the complete publish payload (JSON + Markdown + HTML).
   * POST /api/editor/publish
   */
  publish: async (articleId, title, serializationBundle) => {
    const payload = {
      article_id: articleId,
      title,
      content_json: serializationBundle.content_json,
      content_markdown: serializationBundle.content_markdown,
      content_html: serializationBundle.content_html
    };

    try {
      const response = await fetch(`${API_BASE}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return { success: true, serverResult: result };
    } catch (err) {
      if (IS_DEV) {
        localStorage.setItem(`innovateink_published_${articleId}`, JSON.stringify(payload));
        console.warn('[Editor Transport] Publish endpoint unreachable — cached locally.', err.message);
      }
      return { success: false, fallbackPublished: IS_DEV, payload };
    }
  }
};
