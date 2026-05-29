import React, { useState, useRef } from 'react';
import { BubbleMenu } from '@tiptap/react';
import {
  Rows3, Columns3, Trash2,
  ArrowUpFromLine, ArrowDownFromLine,
  ArrowLeftFromLine, ArrowRightFromLine,
  Merge, Split, Palette, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const isCellSel = (state) => {
  try { return state.selection.constructor?.name === 'CellSelection'; }
  catch { return false; }
};

/**
 * Walk up the resolved position to find the nearest ancestor node of a given type name.
 * Returns { node, pos } or null.
 */
function findAncestorTable(state) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      const pos = $from.before(depth);
      return { node, pos };
    }
  }
  return null;
}

/**
 * Directly updates attributes on the table node ancestor using a raw ProseMirror transaction.
 * Accepts an already-resolved { node, pos } so it can be called after mousedown captures position.
 */
function applyTableAttrs(editor, found, attrUpdates) {
  if (!found) return false;
  const { state, dispatch } = editor.view;
  const { node, pos } = found;
  const newAttrs = { ...node.attrs, ...attrUpdates };
  
  // 1. Dispatch to ProseMirror
  const tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
  tr.setMeta('addToHistory', true);
  dispatch(tr);

  // 2. Directly update DOM attributes to force immediate re-rendering in the editor
  try {
    const domNode = editor.view.nodeDOM(pos);
    if (domNode) {
      const tableEl = domNode.tagName === 'TABLE' ? domNode : domNode.querySelector('table');
      if (tableEl) {
        if (attrUpdates.tableStyle !== undefined) {
          if (attrUpdates.tableStyle) tableEl.setAttribute('data-table-style', attrUpdates.tableStyle);
          else tableEl.removeAttribute('data-table-style');
        }
        if (attrUpdates.headerColor !== undefined) {
          if (attrUpdates.headerColor) tableEl.setAttribute('data-header-color', attrUpdates.headerColor);
          else tableEl.removeAttribute('data-header-color');
        }
      }
    }
  } catch (err) {
    console.error('Error updating table DOM attributes:', err);
  }

  return true;
}

/** Read current table attrs by walking up ancestry. */
function getTableAttrs(editor) {
  if (!editor) return {};
  const found = findAncestorTable(editor.state);
  return found ? found.node.attrs : {};
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HEADER_COLORS = [
  { id: 'indigo',  label: 'Indigo',  dot: 'rgba(79,70,229,0.7)' },
  { id: 'emerald', label: 'Emerald', dot: 'rgba(16,185,129,0.7)' },
  { id: 'amber',   label: 'Amber',   dot: 'rgba(245,158,11,0.7)' },
  { id: 'rose',    label: 'Rose',    dot: 'rgba(244,63,94,0.7)' },
  { id: 'slate',   label: 'Slate',   dot: 'rgba(100,116,139,0.7)' },
  { id: 'none',    label: 'None',    dot: 'rgba(255,255,255,0.1)' },
];

const TABLE_STYLES = [
  { id: null,       label: 'Default',  desc: 'Standard borders' },
  { id: 'minimal',  label: 'Minimal',  desc: 'Bottom lines only' },
  { id: 'bordered', label: 'Bordered', desc: 'Bold borders' },
  { id: 'striped',  label: 'Striped',  desc: 'Alternating rows' },
  { id: 'ghost',    label: 'Ghost',    desc: 'No borders' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function TableBar({ editor }) {
  const [showFmt, setShowFmt] = useState(false);
  // Capture the table position on mousedown so click handlers always have it
  const capturedTableRef = useRef(null);
  if (!editor) return null;

  const btn = (danger) =>
    `p-1.5 rounded transition-all ${
      danger
        ? 'text-red-500 hover:text-red-700 hover:bg-red-500/10'
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/8'
    }`;

  const Sep = () => <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-px flex-shrink-0" />;

  // Read attrs fresh from current selection for display
  const tableAttrs = getTableAttrs(editor);
  const curStyle   = tableAttrs.tableStyle  ?? null;
  const curHeader  = tableAttrs.headerColor ?? null;

  const applyStyle  = (val) => {
    const table = capturedTableRef.current || findAncestorTable(editor.state);
    applyTableAttrs(editor, table, { tableStyle: val });
  };
  const applyHeader = (val) => {
    const table = capturedTableRef.current || findAncestorTable(editor.state);
    applyTableAttrs(editor, table, { headerColor: val });
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBar"
      tippyOptions={{ duration: 100, placement: 'bottom', offset: [0, 12], zIndex: 9995 }}
      shouldShow={({ editor: ed, state }) => ed.isActive('table') || isCellSel(state)}
    >
      <div
        className="flex flex-col gap-1"
        onMouseDown={(e) => {
          // Capture the table location BEFORE anything can change, then
          // prevent default to stop the editor losing focus/selection.
          capturedTableRef.current = findAncestorTable(editor.state);
          e.preventDefault();
        }}
      >

        {/* ── Main ops row ─────────────────────────────────────────────── */}
        <div className="theme-panel flex items-center gap-px px-1.5 py-1 rounded-xl select-none">
          <button title="Insert row above"  onClick={() => editor.chain().focus().addRowBefore().run()}    className={btn()}><ArrowUpFromLine    className="w-3.5 h-3.5" /></button>
          <button title="Insert row below"  onClick={() => editor.chain().focus().addRowAfter().run()}     className={btn()}><ArrowDownFromLine   className="w-3.5 h-3.5" /></button>
          <button title="Delete row"        onClick={() => editor.chain().focus().deleteRow().run()}        className={btn()}><Rows3               className="w-3.5 h-3.5" /></button>
          <Sep />
          <button title="Insert col left"   onClick={() => editor.chain().focus().addColumnBefore().run()} className={btn()}><ArrowLeftFromLine   className="w-3.5 h-3.5" /></button>
          <button title="Insert col right"  onClick={() => editor.chain().focus().addColumnAfter().run()}  className={btn()}><ArrowRightFromLine  className="w-3.5 h-3.5" /></button>
          <button title="Delete column"     onClick={() => editor.chain().focus().deleteColumn().run()}     className={btn()}><Columns3            className="w-3.5 h-3.5" /></button>
          <Sep />
          <button title="Merge cells"       onClick={() => editor.chain().focus().mergeCells().run()}       className={btn()}><Merge               className="w-3.5 h-3.5" /></button>
          <button title="Split cell"        onClick={() => editor.chain().focus().splitCell().run()}        className={btn()}><Split               className="w-3.5 h-3.5" /></button>
          <button
            title="Toggle header row"
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className="p-1.5 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/10 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all text-xs font-bold"
          >H</button>
          <Sep />

          {/* Format toggle */}
          <button
            title="Table styling"
            onClick={() => setShowFmt(v => !v)}
            className={`flex items-center gap-0.5 p-1.5 rounded transition-all text-xs font-medium ${
              showFmt
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/8'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            {showFmt ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
          <Sep />
          <button title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()} className={btn(true)}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Formatting panel ─────────────────────────────────────────── */}
        {showFmt && (
          <div className="theme-panel flex flex-wrap items-start gap-4 px-3 py-2.5 rounded-xl select-none">

            {/* Style presets */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Layout</span>
              <div className="flex flex-wrap items-center gap-1">
                {TABLE_STYLES.map(s => (
                  <button
                    key={s.id ?? 'default'}
                    title={s.desc}
                    onClick={() => applyStyle(s.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border whitespace-nowrap ${
                      curStyle === s.id
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/40 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-white/8 border-transparent'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px self-stretch bg-gray-200 dark:bg-white/10" />

            {/* Header colour */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">Header</span>
              <div className="flex items-center gap-1.5">
                {HEADER_COLORS.map(c => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => applyHeader(c.id)}
                    style={{ background: c.dot }}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      curHeader === c.id
                        ? 'border-white dark:border-white scale-125 shadow-md'
                        : 'border-transparent hover:scale-110 hover:border-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </BubbleMenu>
  );
}
