import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';

const RewriteNodeView = ({ node, getPos, editor }) => {
  const { original, variations } = node.attrs;
  const [selectedIndex, setSelectedIndex] = useState(0);

  const accept = (index) => {
    if (typeof getPos === 'function') {
      editor.chain().focus()
        .deleteRange({ from: getPos(), to: getPos() + node.nodeSize })
        .insertContentAt(getPos(), variations[index])
        .run();
    }
  };

  const reject = () => {
    if (typeof getPos === 'function') {
      editor.chain().focus()
        .deleteRange({ from: getPos(), to: getPos() + node.nodeSize })
        .insertContentAt(getPos(), original)
        .run();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent other Tiptap shortcuts from firing while this UI is active
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        accept(selectedIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        reject();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % variations.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + variations.length) % variations.length);
      }
    };
    
    // We bind to the document in capture mode so we intercept before Tiptap
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedIndex, variations]);

  return (
    <NodeViewWrapper as="span" className="inline-block relative my-3 p-4 border border-indigo-500/20 shadow-xl bg-gradient-to-b from-indigo-500/5 to-transparent rounded-2xl w-full not-prose">
      <div className="mb-4 px-2">
        <del className="text-gray-400 dark:text-gray-500 opacity-50 italic text-[15px] leading-relaxed">
          {original}
        </del>
      </div>
      <div className="flex flex-col gap-2">
        {variations.map((v, i) => (
          <button
            key={i}
            onClick={() => accept(i)}
            className={`text-left p-3 rounded-xl border text-[15px] leading-relaxed transition-all flex items-start gap-3 ${
              selectedIndex === i 
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 shadow-md ring-1 ring-indigo-500/50' 
                : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
            }`}
          >
            <div className={`mt-1 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedIndex === i ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-400 dark:border-gray-600'}`}>
              {selectedIndex === i && <Check className="w-3 h-3" />}
            </div>
            <span>{v}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold px-2">
        <div className="flex items-center gap-1.5 opacity-80">
          <span>Use</span>
          <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded shadow-sm">↑↓</span>
          <span>to select,</span>
          <span className="font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded shadow-sm">Tab</span>
          <span>to apply</span>
        </div>
        <button onClick={reject} className="flex items-center gap-1 hover:text-red-500 transition-colors opacity-80 hover:opacity-100">
          <X className="w-3 h-3" /> Dismiss
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export const RewriteSuggestionExtension = Node.create({
  name: 'rewriteSuggestion',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      original: { default: '' },
      variations: { default: [] },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="rewrite-suggestion"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'rewrite-suggestion' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RewriteNodeView);
  },
});
