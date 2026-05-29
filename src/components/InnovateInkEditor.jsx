import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Extension, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';

import BlockHandle from './BlockHandle';
import FloatBar from './FloatBar';
import TableBar from './TableBar';
import InsertBlockPicker from './InsertBlockPicker';
import { ImageBlock, VideoBlock } from './MediaBlock';

import { AutocompleteExtension } from '../extensions/AutocompleteExtension';
import { GrammarSuggestionExtension } from '../extensions/GrammarSuggestionExtension';
import { RewriteSuggestionExtension } from '../extensions/RewriteSuggestionExtension';
import { AiGeneratedMark } from '../extensions/AiGeneratedMark';
import { aiClient } from '../utils/aiClient';

import { Minimize2, Maximize2, Check, Copy } from 'lucide-react';
import { makeBlockNode, getBlockText, toYoutubeEmbed, getCurrentBlockIndex } from '../utils/blockUtils';

const lowlight = createLowlight(all);

// ── Tab Key Handler Extension ─────────────────────────────────────────────────
// Handles Tab in code blocks (indent 2 spaces) and Tab/Shift+Tab in lists
const TabKeyExtension = Extension.create({
  name: 'tabKeyHandler',
  priority: 1000, // Higher priority than StarterKit so we intercept first
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Inside a code block — insert 2 spaces
        if ($from.parent.type.name === 'codeBlock') {
          editor.chain().focus().insertContent('  ').run();
          return true;
        }

        // Inside a list item — sink (increase indent)
        if (
          $from.node(-1)?.type.name === 'listItem' ||
          $from.node(-2)?.type.name === 'listItem'
        ) {
          return editor.chain().focus().sinkListItem('listItem').run();
        }

        return false; // Let default Tab behaviour handle other nodes
      },
      'Shift-Tab': ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Inside a code block — do nothing (Shift+Tab shouldn't dedent, no easy way without tracking)
        if ($from.parent.type.name === 'codeBlock') {
          return true; // Consume the event to prevent focus loss
        }

        // Inside a list item — lift (decrease indent)
        if (
          $from.node(-1)?.type.name === 'listItem' ||
          $from.node(-2)?.type.name === 'listItem'
        ) {
          return editor.chain().focus().liftListItem('listItem').run();
        }

        return false;
      },
    };
  },
});

// ── Custom React NodeViews for Code and Quote blocks ──────────────────────────
function CodeBlockComponent({ node }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <NodeViewWrapper className="relative group my-4 rounded-lg overflow-hidden border border-gray-800 shadow-lg font-mono text-sm bg-brand-panel code-block-wrapper">
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 select-none code-block-header">
        <span className="font-sans uppercase tracking-wider font-semibold text-[10px]">{node.attrs.language || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="p-1 rounded hover:bg-white/10 hover:text-white text-gray-400 transition-all active:scale-95 flex items-center gap-1 text-[10px] code-block-copy-btn"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-green-400 m-0 code-block-pre">
        <NodeViewContent as="code" className={`language-${node.attrs.language || ''}`} />
      </pre>
    </NodeViewWrapper>
  );
}

function QuoteNodeView({ node, updateAttributes }) {
  const isCallout = node.attrs.class?.startsWith('callout-');

  if (isCallout) {
    const variant = node.attrs.class?.replace('callout-', '') || 'tip';
    let colors = "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300";
    
    if (variant === 'warning') {
      colors = "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300";
    } else if (variant === 'danger') {
      colors = "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300";
    } else if (variant === 'info') {
      colors = "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300";
    }

    return (
      <NodeViewWrapper className={node.attrs.class}>
        <div className={`my-5 px-4 py-3 border-l-4 rounded-r-lg ${colors} not-prose`}>
          <div className="text-[15px] font-medium leading-relaxed">
            <NodeViewContent />
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Use uncontrolled input with key so it re-mounts if author attr changes externally
  return (
    <NodeViewWrapper as="div" className="relative my-4 group not-prose quote-block-container">
      <blockquote
        className="border-l-4 border-indigo-500/70 pl-5 pt-3 pb-2 pr-4 italic bg-indigo-500/5 rounded-r-lg my-4"
        style={{ borderRadius: '0 12px 12px 0' }}
      >
        {/* Quote mark watermark */}
        <span
          aria-hidden
          className="select-none pointer-events-none absolute left-3 top-0 text-5xl leading-none text-indigo-500/15 font-serif quote-watermark"
        >
          &ldquo;
        </span>
        <div className="text-gray-300 relative z-10 quote-content-text">
          <NodeViewContent />
        </div>
        {/* Author line */}
        <div className="flex justify-end items-center gap-1.5 mt-2">
          <span className="text-[11px] text-gray-500 font-medium select-none">— by</span>
          <input
            key={node.attrs.author}
            type="text"
            defaultValue={node.attrs.author || ''}
            onBlur={(e) => updateAttributes({ author: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            placeholder="Author name"
            className="bg-transparent border-b border-dashed border-gray-600/60 focus:border-indigo-400 outline-none text-[11px] text-indigo-300/80 font-medium italic py-px px-1 max-w-[160px] text-right transition-colors placeholder:text-gray-600 quote-author-input"
          />
        </div>
      </blockquote>
    </NodeViewWrapper>
  );
}

// ── Extended Blockquote with class + style + author attributes ────────────────
const CalloutBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: el => el.getAttribute('class'),
        renderHTML: attrs => attrs.class ? { class: attrs.class } : {},
      },
      style: {
        default: null,
        parseHTML: el => el.getAttribute('style'),
        renderHTML: attrs => attrs.style ? { style: attrs.style } : {},
      },
      author: {
        default: '',
        parseHTML: el => el.getAttribute('data-author') || '',
        renderHTML: attrs => attrs.author ? { 'data-author': attrs.author } : {},
      }
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(QuoteNodeView);
  }
});

// ── Block-level background/text color ────────────────────────────────────────
const BlockStyleExtension = Extension.create({
  name: 'blockStyle',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'taskList', 'codeBlock', 'horizontalRule'],
      attributes: {
        blockBg: {
          default: null,
          parseHTML: el => el.getAttribute('data-block-bg'),
          renderHTML: attrs => {
            if (!attrs.blockBg) return {};
            return { 'data-block-bg': attrs.blockBg, style: `background:${attrs.blockBg};border-radius:6px;padding:4px 8px;` };
          },
        },
        blockColor: {
          default: null,
          parseHTML: el => el.getAttribute('data-block-color'),
          renderHTML: attrs => {
            if (!attrs.blockColor) return {};
            return { 'data-block-color': attrs.blockColor, style: `color:${attrs.blockColor};` };
          },
        },
      },
    }];
  },
});

// ── Conversion helpers ────────────────────────────────────────────────────────
const toTiptap = (blocks = []) => {
  if (!blocks.length) return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
  const content = blocks.map(b => {
    const m = b.metadata || {};
    const txt = t => (t ? [{ type: 'text', text: t }] : []);
    const para = t => [{ type: 'paragraph', content: txt(t) }];
    switch (b.type) {
      case 'heading':     return { type: 'heading',    attrs: { level: m.level || 1 },              content: txt(b.content) };
      case 'paragraph':   return { type: 'paragraph',  content: txt(b.content) };
      case 'quote':       return { type: 'blockquote', attrs: { author: m.author || '' }, content: para(b.content) };
      case 'callout':     return { type: 'blockquote', attrs: { class: `callout-${m.variant||'info'}` }, content: para(b.content) };
      case 'code':        return { type: 'codeBlock',  attrs: { language: m.language || 'javascript' }, content: txt(b.content) };
      case 'image':       return { type: 'image',      attrs: { src: b.content, alt: m.caption||'', title: m.caption||'' } };
      case 'video':       return { type: 'videoBlock', attrs: { src: b.content } };
      case 'divider':     return { type: 'horizontalRule' };
      case 'list': {
        const items = Array.isArray(b.content) ? b.content : [b.content];
        return { type: m.listType === 'ordered' ? 'orderedList' : 'bulletList', content: items.map(t => ({ type: 'listItem', content: para(t) })) };
      }
      case 'taskList': {
        const items = Array.isArray(b.content) ? b.content : [{ text: b.content, checked: false }];
        return { type: 'taskList', content: items.map(it => ({ type: 'taskItem', attrs: { checked: it.checked||false }, content: para(it.text||it) })) };
      }
      case 'table': {
        const rows = (b.content || []).map((row, rIdx) => {
          const cells = (row || []).map(cellText => {
            const isHeader = rIdx === 0;
            return {
              type: isHeader ? 'tableHeader' : 'tableCell',
              content: [{
                type: 'paragraph',
                content: cellText ? [{ type: 'text', text: cellText }] : []
              }]
            };
          });
          return {
            type: 'tableRow',
            content: cells
          };
        });
        return {
          type: 'table',
          attrs: {
            tableStyle: m.tableStyle || null,
            headerColor: m.headerColor || null
          },
          content: rows
        };
      }
      default: return { type: 'paragraph', content: txt(b.content) };
    }
  });
  return { type: 'doc', content };
};

const fromTiptap = (doc) => {
  if (!doc?.content) return [];
  const gt = (n) => {
    if (!n) return '';
    if (n.type === 'text') return n.text || '';
    return (n.content || []).map(gt).join('');
  };
  return doc.content.map(node => {
    const a = node.attrs || {};
    switch (node.type) {
      case 'heading':     return { id: null, type: 'heading',   content: gt(node), metadata: { level: a.level||1 } };
      case 'paragraph':   return { id: null, type: 'paragraph', content: gt(node), metadata: {} };
      case 'blockquote': {
        const cls = a.class || '';
        if (cls.startsWith('callout-')) return { id: null, type: 'callout', content: gt(node), metadata: { variant: cls.replace('callout-','') } };
        return { id: null, type: 'quote', content: gt(node), metadata: { author: a.author || '' } };
      }
      case 'codeBlock':   return { id: null, type: 'code',     content: gt(node), metadata: { language: a.language||'javascript' } };
      case 'image':       return { id: null, type: 'image',    content: a.src||'', metadata: { caption: a.alt||'' } };
      // Custom inline nodes — imageBlock is null if no src (placeholder, excluded from output)
      case 'imageBlock':  return a.src ? { id: null, type: 'image', content: a.src, metadata: { caption: a.caption||'' } } : null;
      case 'videoBlock':  return a.src ? { id: null, type: 'video', content: a.src, metadata: {} } : null;
      case 'youtube':     return { id: null, type: 'video',    content: a.src||'', metadata: {} };
      case 'horizontalRule': return { id: null, type: 'divider', content: '', metadata: {} };
      case 'bulletList':
      case 'orderedList': return { id: null, type: 'list', content: (node.content||[]).map(i=>gt(i)), metadata: { listType: node.type==='orderedList'?'ordered':'bullet' } };
      case 'taskList':    return { id: null, type: 'taskList', content: (node.content||[]).map(i=>({ text: gt(i), checked: i.attrs?.checked||false })), metadata: {} };
      case 'table': {
        const grid = (node.content||[]).map(r=>(r.content||[]).map(c=>gt(c)));
        return { 
          id: null, 
          type: 'table', 
          content: grid, 
          metadata: { 
            tableStyle: a.tableStyle || null, 
            headerColor: a.headerColor || null 
          } 
        };
      }
      default: return { id: null, type: 'paragraph', content: gt(node), metadata: {} };
    }
  }).filter(Boolean);
};

const wordCount = (editor) => {
  if (!editor) return 0;
  return editor.getText().trim().split(/\s+/).filter(Boolean).length;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function InnovateInkEditor({ initialArticle, onContentChange, onLimitReached, config }) {
  const [wc, setWc]               = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [slashCmd, setSlashCmd]   = useState(null);
  const editorWrapperRef          = useRef(null);
  const acceptCountRef            = useRef(0);
  const lastAcceptTimeRef         = useRef(0);
  const keyStrokesRef             = useRef([]);

  const editor = useEditor({
    extensions: [
      TabKeyExtension,
      StarterKit.configure({ blockquote: false, codeBlock: false }),
      CalloutBlockquote,
      BlockStyleExtension,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Superscript,
      Subscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ImageBlock,
      VideoBlock,
      Placeholder.configure({ placeholder: "Type '/' for commands, or start writing…" }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ allowBase64: true }),
      Youtube.configure({ width: 640, height: 480 }),
      Table.configure({ resizable: true }).extend({
        addAttributes() {
          return { ...this.parent?.(),
            tableStyle:   { default: null, parseHTML: el => el.getAttribute('data-table-style'),   renderHTML: a => a.tableStyle   ? { 'data-table-style': a.tableStyle }   : {} },
            headerColor:  { default: null, parseHTML: el => el.getAttribute('data-header-color'),  renderHTML: a => a.headerColor  ? { 'data-header-color': a.headerColor }  : {} },
          };
        }
      }),
      TableRow,
      TableHeader.extend({
        addAttributes() {
          return { ...this.parent?.(),
            backgroundColor: { default: null, parseHTML: el => el.style.backgroundColor || null, renderHTML: a => a.backgroundColor ? { style: `background-color:${a.backgroundColor}` } : {} },
          };
        },
      }),
      TableCell.extend({
        addAttributes() {
          return { ...this.parent?.(),
            backgroundColor: { default: null, parseHTML: el => el.style.backgroundColor || null, renderHTML: a => a.backgroundColor ? { style: `background-color:${a.backgroundColor}` } : {} },
          };
        },
      }),

      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        }
      }),
      AutocompleteExtension,
      GrammarSuggestionExtension,
      RewriteSuggestionExtension,
      AiGeneratedMark,
    ],
    editorProps: {
      attributes: {
        class: 'inkpack',
      },
    },
    content: toTiptap(initialArticle?.blocks),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const count = json.content?.length ?? 0;
      if (count > 99) { editor.commands.undo(); if (onLimitReached) onLimitReached(); return; }
      setWc(wordCount(editor));
      if (onContentChange) onContentChange(fromTiptap(json));
    },
  });

  useEffect(() => { if (editor) setWc(wordCount(editor)); }, [editor]);

  // ── Sync table attributes natively ─────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const syncTableAttrs = () => {
      if (editor.isDestroyed) return;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          try {
            const dom = editor.view.nodeDOM(pos);
            if (dom) {
              const table = dom.tagName === 'TABLE' ? dom : dom.querySelector('table');
              if (table) {
                if (node.attrs.tableStyle) table.setAttribute('data-table-style', node.attrs.tableStyle);
                else table.removeAttribute('data-table-style');
                if (node.attrs.headerColor) table.setAttribute('data-header-color', node.attrs.headerColor);
                else table.removeAttribute('data-header-color');
              }
            }
          } catch (e) {}
        }
      });
    };
    editor.on('update', syncTableAttrs);
    editor.on('transaction', syncTableAttrs);
    setTimeout(syncTableAttrs, 50); // initial render sync
    return () => { editor.off('update', syncTableAttrs); editor.off('transaction', syncTableAttrs); };
  }, [editor]);

  // ── Slash command detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      const { $from } = editor.state.selection;
      if ($from.parent.type.name !== 'paragraph') { setSlashCmd(null); return; }
      const text = $from.parent.textContent;
      const offset = $from.parentOffset;
      // Show picker when user types exactly '/' in an otherwise empty paragraph
      if (text === '/' && offset === 1) {
        try {
          const coords = editor.view.coordsAtPos($from.pos);
          setSlashCmd({ rect: { bottom: coords.bottom + 4, left: Math.max(coords.left - 20, 8) }, blockIndex: getCurrentBlockIndex(editor) });
        } catch { setSlashCmd(null); }
      } else {
        setSlashCmd(null);
      }
    };
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor]);

  // ── AI Autocomplete detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!editor || !config?.aiFeatures?.enabled) return;
    let timeoutId;
    
    const handleUpdate = ({ transaction }) => {
      clearTimeout(timeoutId);
      
      // 1. Cooldown & count tracking using metadata from the transaction
      if (transaction && transaction.getMeta('autocompleteAccepted')) {
        lastAcceptTimeRef.current = Date.now();
        acceptCountRef.current += 1;
        return; // Don't trigger another autocomplete request immediately!
      }
      
      // If it's a regular user typing update, we reset the acceptCountRef!
      if (transaction && transaction.docChanged && !transaction.getMeta('autocompleteSuggestionSet') && !transaction.getMeta('autocompleteAccepted')) {
        acceptCountRef.current = 0;
        
        // Velocity tracking
        const now = Date.now();
        keyStrokesRef.current.push(now);
        if (keyStrokesRef.current.length > 5) {
          keyStrokesRef.current.shift();
        }
      }

      const { state } = editor;
      const { $head } = state.selection;
      
      // 2. Ensure cursor is at the end of a paragraph block
      if ($head.parent.type.name !== 'paragraph') return;
      
      // 3. Cooldown check: do not trigger within 1.5 seconds of accepting a suggestion
      const timeSinceLastAccept = Date.now() - lastAcceptTimeRef.current;
      if (timeSinceLastAccept < 1500) {
        return;
      }
      
      const text = $head.parent.textContent;
      if ($head.parentOffset !== text.length) return; // Cursor must be at the end

      // 4. Trigger Gating thresholds (characters > 20, words > 4)
      const textBeforeCursor = text.substring(0, $head.parentOffset);
      if (textBeforeCursor.trim().length < 20) return;
      const wordsCount = textBeforeCursor.trim().split(/\s+/).filter(Boolean).length;
      if (wordsCount < 4) return;
      
      // 5. Velocity gating: > 4 keys/sec -> typing too fast
      if (keyStrokesRef.current.length >= 5) {
        const oldest = keyStrokesRef.current[keyStrokesRef.current.length - 5];
        const newest = keyStrokesRef.current[keyStrokesRef.current.length - 1];
        if (newest - oldest < 1250) { // 5 keys in less than 1.25s = 4 keys/s
          return;
        }
      }

      // 6. Trigger debounce (750ms) to reduce typing latency and server load
      timeoutId = setTimeout(async () => {
        // Only show if cursor hasn't moved
        if (editor.state.selection.head !== $head.pos) return;
        
        // 6. Human-Context Anchoring & Truncation
        let humanText = "";
        let aiText = "";
        
        $head.parent.forEach((node) => {
          const hasAiMark = node.marks && node.marks.some(m => m.type.name === 'aiGenerated');
          if (hasAiMark) {
            aiText += node.textContent;
          } else {
            humanText += node.textContent;
          }
        });
        
        const consecutiveAccepts = acceptCountRef.current;
        const forceFresh = consecutiveAccepts >= 2;
        
        let activeContextText = "";
        if (forceFresh) {
          activeContextText = humanText;
          acceptCountRef.current = 0; // reset
        } else {
          // Feed last human sentence + local semantic neighborhood
          activeContextText = humanText + (aiText ? " " + aiText : "");
        }
        
        // Reduce context pollution (max last 400 chars)
        if (activeContextText.length > 400) {
          activeContextText = activeContextText.slice(-400);
        }
        
        // Rhetorical Phase Calculator
        const totalSize = editor.state.doc.content.size;
        const currentPos = $head.pos;
        const relativePos = currentPos / Math.max(totalSize, 1);
        
        let rhetoricalPhase = 'body';
        if (totalSize < 500) {
          rhetoricalPhase = 'intro';
        } else if (relativePos < 0.15) {
          rhetoricalPhase = 'intro';
        } else if (relativePos < 0.3) {
          rhetoricalPhase = 'thesis';
        } else if (relativePos > 0.85) {
          rhetoricalPhase = 'conclusion';
        } else if (relativePos > 0.7) {
          rhetoricalPhase = 'reflection';
        } else {
          rhetoricalPhase = 'body';
        }

        const suggestion = await aiClient.fetchAutocomplete(activeContextText, forceFresh, rhetoricalPhase);
        if (suggestion && editor && !editor.isDestroyed) {
          // Only show if cursor hasn't moved
          if (editor.state.selection.head === $head.pos) {
            editor.view.dispatch(editor.state.tr.setMeta('autocompleteSuggestion', suggestion));
          }
        }
      }, 750); // 750ms debounce
    };
    
    editor.on('update', handleUpdate);
    return () => {
      clearTimeout(timeoutId);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  const handleSlashSelect = useCallback((type) => {
    if (!editor || slashCmd === null) return;
    setSlashCmd(null);
    editor.chain().focus().deleteRange({ from: editor.state.selection.$from.pos - 1, to: editor.state.selection.$from.pos }).run();
    const idx = slashCmd.blockIndex;
    if (type === 'image') {
      const content = [...(editor.getJSON().content || [])];
      content.splice(idx + 1, 0, { type: 'imageBlock', attrs: { src: null, caption: '', showCaption: false } });
      editor.commands.setContent({ type: 'doc', content }, true);
      return;
    }
    if (type === 'video') {
      const content = [...(editor.getJSON().content || [])];
      content.splice(idx + 1, 0, { type: 'videoBlock', attrs: { src: null } });
      editor.commands.setContent({ type: 'doc', content }, true);
      return;
    }
    if (type === 'table') {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    }
    const content = [...(editor.getJSON().content || [])];
    content[idx] = makeBlockNode(type, '');
    editor.commands.setContent({ type: 'doc', content }, true);
  }, [editor, slashCmd]);

  const handleImageInsert = (src, alt = '') => {
    if (!editor || !src) return;
    const content = [...(editor.getJSON().content || [])];
    const idx = imgInsertIdx ?? getCurrentBlockIndex(editor);
    content.splice(idx + 1, 0, { type: 'image', attrs: { src, alt, title: alt } });
    editor.commands.setContent({ type: 'doc', content }, true);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3"/>
        <span className="text-sm font-medium">Loading editor…</span>
      </div>
    );
  }

  const readingTime = Math.max(1, Math.ceil(wc / 200));
  const blockCount  = editor.getJSON().content?.length ?? 0;

  return (
    <div className={`relative ${focusMode ? 'focus-mode' : ''}`}>
      {focusMode && <div className="fixed inset-0 bg-brand-bg/95 z-30" onClick={() => setFocusMode(false)}/>}

      <div ref={editorWrapperRef} className={`relative group ${focusMode ? 'fixed inset-x-0 max-w-2xl mx-auto top-16 bottom-16 z-40 overflow-y-auto px-4' : ''}`}>
        {/* Float bars */}
        <FloatBar editor={editor}/>
        <TableBar editor={editor}/>

        {/* Block handle overlay */}
        <BlockHandle
          editor={editor}
          editorWrapperRef={editorWrapperRef}
          onLimitReached={onLimitReached}
          config={config}
          onImageRequest={(isImg, idx) => {
            const content = [...(editor.getJSON().content || [])];
            const nodeType = isImg ? 'imageBlock' : 'videoBlock';
            content.splice(idx + 1, 0, { type: nodeType, attrs: { src: null } });
            editor.commands.setContent({ type: 'doc', content }, true);
          }}
        />

        {/* Slash command picker */}
        {slashCmd && (
          <InsertBlockPicker
            anchorRect={slashCmd.rect}
            onSelect={handleSlashSelect}
            onClose={() => { setSlashCmd(null); editor.chain().focus().run(); }}
            allowedBlocks={config?.blocks?.allowed}
          />
        )}




        {/* Editor content */}
        <div className={`prose max-w-none transition-colors duration-300 ${config?.theme === 'dark' ? 'prose-invert text-gray-200' : 'text-cream-text'}`} style={{ paddingLeft: 48 }}>
          <EditorContent editor={editor}/>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/40 text-[11px] text-gray-600 font-mono select-none">
        <div className="flex items-center gap-3">
          <span>{wc} words</span>
          <span>·</span>
          <span>~{readingTime} min read</span>
          <span>·</span>
          <span>{blockCount}/99 blocks</span>
        </div>
        <button
          onClick={() => setFocusMode(f => !f)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-800 hover:bg-gray-800/50 text-gray-500 hover:text-gray-300 transition-all"
        >
          {focusMode ? <Maximize2 className="w-3 h-3"/> : <Minimize2 className="w-3 h-3"/>}
          <span>{focusMode ? 'Exit Focus' : 'Focus'}</span>
        </button>
      </div>
    </div>
  );
}
