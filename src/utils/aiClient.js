const API_URL = 'http://localhost:8000/api';

let activeCompleteController = null;

export const aiClient = {
  /**
   * Fetches autocomplete suggestions from the AI backend.
   * Cancels any previously pending autocomplete requests.
   */
  async fetchAutocomplete(prompt, forceFresh = false, rhetoricalPhase = 'body') {
    if (activeCompleteController) {
      activeCompleteController.abort();
    }
    activeCompleteController = new AbortController();

    try {
      const response = await fetch(`${API_URL}/autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          force_fresh: forceFresh,
          stream: false,
          rhetorical_phase: rhetoricalPhase
        }),
        signal: activeCompleteController.signal
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.completion || '';
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error('AI Autocomplete Error:', err);
      return '';
    } finally {
      if (activeCompleteController && activeCompleteController.signal.aborted) {
        // If aborted during processing, don't clear unless we are the active controller
      } else {
        activeCompleteController = null;
      }
    }
  },

  /**
   * Rewrites text based on a given tone.
   */
  async fetchRewrite(text, tone) {
    try {
      const response = await fetch(`${API_URL}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          tone
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.rewritten || text;
    } catch (err) {
      console.error('AI Rewrite Error:', err);
      return text;
    }
  },

  /**
   * Fixes grammar and typos in the provided text.
   */
  async fetchGrammar(text) {
    try {
      const response = await fetch(`${API_URL}/grammar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.corrected || text;
    } catch (err) {
      console.error('AI Grammar Error:', err);
      return text;
    }
  }
};
