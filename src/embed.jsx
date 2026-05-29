// Polyfill process for browser environments to prevent ReferenceErrors from React/third-party libs
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: { NODE_ENV: 'production' } };
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import InnovateInkEditor from './components/InnovateInkEditor';
import { serializeArticleContent } from './processing/serializer';
import './index.css';

class InnovateInk {
  constructor(options) {
    this.target = options.target;
    if (!this.target) {
      throw new Error('[InnovateInk] "target" element is required.');
    }

    this.config = options.config || {
      theme: 'dark',
      accentColor: '#6366f1',
      aiFeatures: { enabled: false },
      blocks: { allowed: ['paragraph', 'h1', 'h2', 'h3', 'quote', 'code', 'bulletList', 'orderedList', 'taskList', 'divider', 'callout-info', 'callout-tip', 'callout-warning', 'callout-danger', 'image', 'video', 'table'] }
    };

    // Apply accent color to the target wrapper
    this.target.style.setProperty('--color-brand-accent', this.config.accentColor || '#6366f1');

    // Apply theme classes to the target wrapper
    if (this.config.theme === 'cream') {
      this.target.classList.add('cream-mode');
      this.target.classList.remove('dark');
    } else {
      this.target.classList.add('dark');
      this.target.classList.remove('cream-mode');
    }

    this.onChange = options.onChange || (() => {});
    this.onLimitReached = options.onLimitReached || (() => {});

    // Create root and render
    this.root = createRoot(this.target);
    this.render(options.initialData || { blocks: [] });
  }

  handleContentChange = (blocks) => {
    const compilation = serializeArticleContent(blocks);
    this.onChange({
      json: compilation.content_json,
      markdown: compilation.content_markdown,
      html: compilation.content_html
    });
  };

  render(article) {
    this.root.render(
      <InnovateInkEditor
        initialArticle={article}
        onContentChange={this.handleContentChange}
        onLimitReached={this.onLimitReached}
        config={this.config}
      />
    );
  }

  // Allow external scripts to update the editor content
  setContent(article) {
    this.render(article);
  }

  // Allow external scripts to update config dynamically
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.target.style.setProperty('--color-brand-accent', this.config.accentColor || '#6366f1');
    if (this.config.theme === 'cream') {
      this.target.classList.add('cream-mode');
      this.target.classList.remove('dark');
    } else {
      this.target.classList.add('dark');
      this.target.classList.remove('cream-mode');
    }
    // Re-render to propagate config
    this.render({ blocks: [] }); // Note: In a real scenario we'd preserve state, but Tiptap handles its own state
  }

  destroy() {
    this.root.unmount();
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.InnovateInk = InnovateInk;
  window.InkScribe = InnovateInk; // Alias for consistency with new file names
}

export default InnovateInk;
