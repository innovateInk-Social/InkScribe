import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

const GrammarNodeView = ({ node, getPos, editor }) => {
  const { original, corrected } = node.attrs;

  // Compute a simple word-level diff
  const oldWords = original.split(/(\b|\s+)/).filter(Boolean);
  const newWords = corrected.split(/(\b|\s+)/).filter(Boolean);
  
  let start = 0;
  while (start < oldWords.length && start < newWords.length && oldWords[start] === newWords[start]) { 
    start++; 
  }
  
  let oldEnd = oldWords.length - 1;
  let newEnd = newWords.length - 1;
  while (oldEnd >= start && newEnd >= start && oldWords[oldEnd] === newWords[newEnd]) { 
    oldEnd--; 
    newEnd--; 
  }
  
  const prefix = oldWords.slice(0, start).join('');
  const removed = oldWords.slice(start, oldEnd + 1).join('');
  const added = newWords.slice(start, newEnd + 1).join('');
  const suffix = oldWords.slice(oldEnd + 1).join('');

  const accept = () => {
    if (typeof getPos === 'function') {
      editor.chain().focus()
        .deleteRange({ from: getPos(), to: getPos() + node.nodeSize })
        .insertContentAt(getPos(), corrected)
        .run();
    }
  };

  const reject = (e) => {
    e.stopPropagation();
    if (typeof getPos === 'function') {
      editor.chain().focus()
        .deleteRange({ from: getPos(), to: getPos() + node.nodeSize })
        .insertContentAt(getPos(), original)
        .run();
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline relative group">
      <span>{prefix}</span>
      {removed && (
        <del 
          onClick={reject}
          className="text-red-500 bg-red-500/10 line-through cursor-pointer mx-0.5 rounded px-0.5 transition-colors hover:bg-red-500/20"
          title="Click to reject and keep original"
        >
          {removed}
        </del>
      )}
      {added && (
        <span 
          onClick={accept}
          className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 cursor-pointer mx-0.5 rounded px-0.5 font-medium transition-colors hover:bg-emerald-500/20"
          title="Click to accept correction"
        >
          {added}
        </span>
      )}
      <span>{suffix}</span>
    </NodeViewWrapper>
  );
};

export const GrammarSuggestionExtension = Node.create({
  name: 'grammarSuggestion',
  group: 'inline',
  inline: true,
  atom: true, // Treated as a single unit in the editor

  addAttributes() {
    return {
      original: { default: '' },
      corrected: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="grammar-suggestion"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'grammar-suggestion' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GrammarNodeView);
  },
});
