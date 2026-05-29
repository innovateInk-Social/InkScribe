import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  GripVertical, Plus, Type, Heading1, Heading2, Heading3,
  Quote, Code2, List, ListOrdered, CheckSquare, Minus,
  Trash2, Copy, ChevronUp, ChevronDown,
  Info, AlertTriangle, XCircle, Lightbulb, Palette
} from 'lucide-react';
import InsertBlockPicker from './InsertBlockPicker';
import { BG_COLORS, TEXT_COLORS } from './colors';
import { makeBlockNode, getBlockText, toYoutubeEmbed } from '../utils/blockUtils';

// ── Flat keyboard-nav item list ──────────────────────────────────────────────
const TURN_ITEMS = [
  { key: 'paragraph',       label: 'Text',         icon: <Type className="w-3.5 h-3.5"/>,        color: 'text-gray-800 dark:text-gray-300' },
  { key: 'h1',              label: 'H1',            icon: <Heading1 className="w-3.5 h-3.5"/>,    color: 'text-gray-900 dark:text-white' },
  { key: 'h2',              label: 'H2',            icon: <Heading2 className="w-3.5 h-3.5"/>,    color: 'text-gray-900 dark:text-white' },
  { key: 'h3',              label: 'H3',            icon: <Heading3 className="w-3.5 h-3.5"/>,    color: 'text-gray-800 dark:text-gray-200' },
  { key: 'quote',           label: 'Quote',         icon: <Quote className="w-3.5 h-3.5"/>,       color: 'text-indigo-600 dark:text-indigo-400' },
  { key: 'code',            label: 'Code',          icon: <Code2 className="w-3.5 h-3.5"/>,       color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'bulletList',      label: 'Bullet',        icon: <List className="w-3.5 h-3.5"/>,        color: 'text-blue-600 dark:text-blue-400' },
  { key: 'orderedList',     label: 'Numbered',      icon: <ListOrdered className="w-3.5 h-3.5"/>, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'taskList',        label: 'Todo',          icon: <CheckSquare className="w-3.5 h-3.5"/>, color: 'text-violet-600 dark:text-violet-400' },
  { key: 'divider',         label: 'Divider',       icon: <Minus className="w-3.5 h-3.5"/>,       color: 'text-gray-500' },
  { key: 'callout-info',    label: 'Info',          icon: <Info className="w-3.5 h-3.5"/>,        color: 'text-blue-600 dark:text-blue-400' },
  { key: 'callout-tip',     label: 'Tip',           icon: <Lightbulb className="w-3.5 h-3.5"/>,   color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'callout-warning', label: 'Warning',       icon: <AlertTriangle className="w-3.5 h-3.5"/>,color:'text-amber-600 dark:text-amber-400' },
  { key: 'callout-danger',  label: 'Danger',        icon: <XCircle className="w-3.5 h-3.5"/>,     color: 'text-red-600 dark:text-red-400' },
  { key: '__moveUp',        label: 'Move Up',       icon: <ChevronUp className="w-3.5 h-3.5"/>,   color: 'text-gray-500 dark:text-gray-400' },
  { key: '__moveDown',      label: 'Move Down',     icon: <ChevronDown className="w-3.5 h-3.5"/>, color: 'text-gray-500 dark:text-gray-400' },
  { key: '__duplicate',     label: 'Duplicate',     icon: <Copy className="w-3.5 h-3.5"/>,        color: 'text-blue-600 dark:text-blue-400' },
  { key: '__delete',        label: 'Delete',        icon: <Trash2 className="w-3.5 h-3.5"/>,      color: 'text-red-600 dark:text-red-400' },
];
const cleanMergeAttributes = (targetType, currentAttrs = {}, targetAttrs = {}) => {
  const result = {};

  // Preserve global block styles if they exist
  if (currentAttrs.blockBg) result.blockBg = currentAttrs.blockBg;
  if (currentAttrs.blockColor) result.blockColor = currentAttrs.blockColor;

  if (targetType === 'heading') {
    result.level = targetAttrs.level || 1;
  } else if (targetType === 'blockquote') {
    if (targetAttrs.class) {
      result.class = targetAttrs.class;
    } else {
      result.author = targetAttrs.author || '';
    }
  } else if (targetType === 'codeBlock') {
    result.language = targetAttrs.language || 'javascript';
  } else if (targetType === 'table') {
    result.tableStyle = targetAttrs.tableStyle || null;
    result.headerColor = targetAttrs.headerColor || null;
  } else if (targetType === 'taskList' || targetType === 'taskItem') {
    if (targetAttrs.checked !== undefined) {
      result.checked = targetAttrs.checked;
    }
  }

  return result;
};

export default function BlockHandle({ editor, editorWrapperRef, onLimitReached, onImageRequest, config }) {
  const [handles, setHandles]           = useState([]);
  const [activeMenu, setActiveMenu]     = useState(null); // index → turn-into open
  const [menuPos, setMenuPos]           = useState({ top: 0, left: 0 });
  const [focusedKey, setFocusedKey]     = useState(null);
  const [dragIndex, setDragIndex]       = useState(null);
  const [dropTarget, setDropTarget]     = useState(null);
  const [picker, setPicker]             = useState(null); // { index, anchorRect } for InsertBlockPicker
  const [colorMode, setColorMode]       = useState(null); // 'bg' | 'text' | null
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const menuRef    = useRef(null);
  const dragMoved  = useRef(false);

  // Filter based on API config if available, otherwise allow all
  const allowedBlocks = config?.blocks?.allowed || ALL_NAV_KEYS;
  const activeTurnItems = TURN_ITEMS.filter(item => 
    item.key.startsWith('__') || allowedBlocks.includes(item.key)
  );
  const activeNavKeys = activeTurnItems.map(i => i.key);
  const convertItems = TURN_ITEMS.slice(0, 10).filter(item => allowedBlocks.includes(item.key));
  const calloutItems = TURN_ITEMS.slice(10, 14).filter(item => allowedBlocks.includes(item.key));
  const activeActions = activeTurnItems.filter(item => item.key.startsWith('__'));

  // ── Track mouse hover over editor blocks ───────────────────────────────────
  useEffect(() => {
    if (!editorWrapperRef.current) return;
    const wr = editorWrapperRef.current;
    
    const handleMouseMove = (e) => {
      const tiptapEl = wr.querySelector('.tiptap');
      if (!tiptapEl) return;
      const children = Array.from(tiptapEl.children);
      let found = null;
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = i;
          break;
        }
      }
      setHoveredIndex(found);
    };

    const handleMouseLeave = () => {
      setHoveredIndex(null);
    };

    wr.addEventListener('mousemove', handleMouseMove);
    wr.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      wr.removeEventListener('mousemove', handleMouseMove);
      wr.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editorWrapperRef]);

  // ── Position refresh ───────────────────────────────────────────────────────
  const refreshHandles = useCallback(() => {
    if (!editor || !editorWrapperRef.current) return;
    const tiptapEl = editorWrapperRef.current.querySelector('.tiptap');
    if (!tiptapEl) return;
    const wr = editorWrapperRef.current.getBoundingClientRect();
    setHandles(Array.from(tiptapEl.children).map((el, index) => {
      const r = el.getBoundingClientRect();
      return { index, top: r.top - wr.top + editorWrapperRef.current.scrollTop, height: r.height };
    }));
  }, [editor, editorWrapperRef]);

  useEffect(() => {
    if (!editor || !editorWrapperRef.current) return;
    const el = editorWrapperRef.current.querySelector('.tiptap');
    if (!el) return;
    const mo = new MutationObserver(refreshHandles);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    const ro = new ResizeObserver(refreshHandles);
    ro.observe(el);
    refreshHandles();
    return () => { mo.disconnect(); ro.disconnect(); };
  }, [editor, editorWrapperRef, refreshHandles]);

  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', refreshHandles);
    editor.on('update', refreshHandles);
    return () => { editor.off('transaction', refreshHandles); editor.off('update', refreshHandles); };
  }, [editor, refreshHandles]);

  // ── Outside click: close turn-into menu ───────────────────────────────────
  useEffect(() => {
    if (activeMenu === null) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) closeMenu(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [activeMenu]);

  // ── Auto-reposition menu when block moves (move up/down) ──────────────────
  useEffect(() => {
    if (activeMenu === null || !editorWrapperRef.current) return;
    const tiptapEl = editorWrapperRef.current.querySelector('.tiptap');
    if (!tiptapEl || !tiptapEl.children[activeMenu]) return;
    const elRect = tiptapEl.children[activeMenu].getBoundingClientRect();
    const leftPos = Math.max(8, elRect.left - 220 - 12);
    setMenuPos({ top: elRect.top, left: leftPos });
  }, [activeMenu, handles]);

  // ── Keyboard nav inside turn-into menu ────────────────────────────────────
  useEffect(() => {
    if (activeMenu === null) return;
    const h = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      const idx = activeNavKeys.indexOf(focusedKey);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = activeNavKeys[(idx + 1) % activeNavKeys.length];
        setFocusedKey(n);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const n = activeNavKeys[(idx - 1 + activeNavKeys.length) % activeNavKeys.length];
        setFocusedKey(n);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedKey) handleAction(activeMenu, focusedKey);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [activeMenu, focusedKey]);

  const closeMenu = () => { setActiveMenu(null); setFocusedKey(null); setColorMode(null); };

  // ── Block actions ─────────────────────────────────────────────────────────
  const apply = (jsonContent) => {
    editor.commands.setContent({ type: 'doc', content: jsonContent }, true);
    refreshHandles();
  };

  const focusBlock = (idx) => {
    if (!editorWrapperRef.current) return;
    const el = editorWrapperRef.current.querySelector('.tiptap');
    if (!el || !el.children[idx]) return;
    const dom = el.children[idx];
    const pos = editor.view.posAtDOM(dom, 0);
    editor.chain().focus().setTextSelection(pos).run();
  };

  const handleAction = (index, key) => {
    if (key.startsWith('__')) {
      if (key === '__delete')    deleteBlock(index);
      if (key === '__duplicate') duplicateBlock(index);
      if (key === '__moveUp')    moveBlock(index, -1);
      if (key === '__moveDown')  moveBlock(index, 1);
      return;
    }
    // Convert type
    const content = [...(editor.getJSON().content || [])];
    const current = content[index];
    if (!current) return;
    const text = getBlockText(current);

    let nextNode = makeBlockNode(key, text);
    const targetType = nextNode.type;
    nextNode.attrs = cleanMergeAttributes(targetType, current.attrs || {}, nextNode.attrs || {});
    
    content[index] = nextNode;
    apply(content);
    setTimeout(() => focusBlock(index), 50);
  };

  const deleteBlock = (index) => {
    const content = [...(editor.getJSON().content || [])];
    content.splice(index, 1);
    apply(content);
    closeMenu();
    setTimeout(() => focusBlock(Math.max(0, index - 1)), 50);
  };

  const duplicateBlock = (index) => {
    const content = [...(editor.getJSON().content || [])];
    if (content.length >= 99) { onLimitReached?.(); return; }
    const clone = JSON.parse(JSON.stringify(content[index]));
    content.splice(index + 1, 0, clone);
    apply(content);
    closeMenu();
    setTimeout(() => focusBlock(index + 1), 50);
  };

  const moveBlock = (index, dir) => {
    const content = [...(editor.getJSON().content || [])];
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= content.length) return;
    const [rm] = content.splice(index, 1);
    content.splice(targetIdx, 0, rm);
    apply(content);
    // Keep activeMenu open at the new block position!
    setActiveMenu(targetIdx);
    setTimeout(() => focusBlock(targetIdx), 50);
  };

  const applyBlockBg = (index, color) => {
    const content = [...(editor.getJSON().content || [])];
    const item = content[index];
    if (!item) return;
    item.attrs = { ...item.attrs, blockBg: color };
    apply(content);
  };

  const applyBlockColor = (index, color) => {
    const content = [...(editor.getJSON().content || [])];
    const item = content[index];
    if (!item) return;
    item.attrs = { ...item.attrs, blockTextColor: color };
    apply(content);
  };

  const insertBlock = (index, type) => {
    const content = [...(editor.getJSON().content || [])];
    if (content.length >= 99) { onLimitReached?.(); return; }

    if (type === 'image' || type === 'video') {
      const isImg = type === 'image';
      onImageRequest?.(isImg, index);
      setPicker(null);
      return;
    }

    if (type === 'table') {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      setPicker(null);
      return;
    }

    const n = makeBlockNode(type, '');
    content.splice(index + 1, 0, n);
    apply(content);
    setPicker(null);
    setTimeout(() => focusBlock(index + 1), 50);
  };

  // ── Drag & Drop handlers ───────────────────────────────────────────────────
  const onDragStart = (e, index) => { dragMoved.current = false; setDragIndex(index); e.dataTransfer.setData('text/plain', index); };
  const onDragOver = (e, index) => { e.preventDefault(); dragMoved.current = true; if (index !== dragIndex) setDropTarget(index); };
  const onDrop = (e, ti) => {
    e.preventDefault(); setDropTarget(null);
    if (dragIndex === null || dragIndex === ti) { setDragIndex(null); return; }
    const content = [...(editor.getJSON().content || [])];
    const [rm] = content.splice(dragIndex, 1);
    content.splice(ti, 0, rm);
    apply(content); setDragIndex(null);
    setTimeout(() => focusBlock(ti), 50);
  };
  const onDragEnd = () => { setDragIndex(null); setDropTarget(null); };

  // Click on grip → open turn-into menu
  const onGripClick = (e, index) => {
    if (dragMoved.current) return;
    e.stopPropagation();
    if (activeMenu === index) { closeMenu(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    // Open menu strictly on the left of the grip button, keeping it clear of the typing area
    const leftPos = Math.max(8, r.left - 220 - 12);
    setMenuPos({ top: r.top, left: leftPos });
    setActiveMenu(index);
    setFocusedKey(activeNavKeys[0]);
  };

  if (!editor) return null;

  const totalBlocks = editor.getJSON().content?.length ?? 0;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>

      {/* InsertBlockPicker */}
      {picker && createPortal(
        <InsertBlockPicker
          anchorRect={picker.anchorRect}
          onSelect={(type) => insertBlock(picker.index, type)}
          onClose={() => setPicker(null)}
          allowedBlocks={config?.blocks?.allowed}
        />,
        document.body
      )}

      {handles.map(({ index, top, height }) => {
        const isDragging   = dragIndex === index;
        const isDropTarget = dropTarget === index && dragIndex !== null;

        return (
          <div
            key={index}
            className="absolute left-0 flex items-start pointer-events-auto"
            style={{ top, height, width: 48 }}
            onDragOver={(e) => onDragOver(e, index)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => onDrop(e, index)}
          >
            {/* Drop indicator */}
            {isDropTarget && <div className="absolute -top-px left-0 right-0 h-0.5 bg-indigo-500 rounded-full z-20 pointer-events-none" />}

            {/* Handle buttons */}
            <div 
              className={`flex items-center mt-1 transition-opacity duration-150 ${
                isDragging ? 'opacity-25' : (hoveredIndex === index || activeMenu === index || picker?.index === index) ? 'opacity-100' : 'opacity-0'
              }`}
            >

              {/* Grip: click=turn-into, drag=reorder */}
              <div
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragEnd={onDragEnd}
                onClick={(e) => onGripClick(e, index)}
                className={`flex items-center justify-center w-5 h-6 rounded select-none transition-all ${
                  activeMenu === index ? 'text-indigo-400 bg-indigo-500/15 cursor-pointer' : 'text-gray-500 hover:text-gray-900 dark:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-gray-800/60 cursor-grab active:cursor-grabbing'
                }`}
                title="Click: change type  ·  Drag: reorder"
              >
                <GripVertical className="w-3.5 h-3.5"/>
              </div>

              {/* +: open block type picker */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const r = e.currentTarget.getBoundingClientRect();
                  setPicker({ index, anchorRect: r });
                }}
                className="flex items-center justify-center w-5 h-6 rounded text-gray-500 hover:text-indigo-600 dark:text-gray-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-indigo-500/10 transition-all"
                title="Add block below"
              >
                <Plus className="w-3.5 h-3.5"/>
              </button>
            </div>

            {/* Turn-Into / Change type menu */}
            {activeMenu === index && createPortal(
              <div
                ref={menuRef}
                className="theme-panel fixed z-[9999] animate-fade-in flex flex-col shadow-2xl"
                style={{ top: menuPos.top, left: menuPos.left, width: 220, borderRadius: 12 }}
              >
                {/* Tiny keyboard hint header */}
                <div className="flex items-center justify-end px-2.5 pt-2 pb-1 flex-shrink-0">
                  <span className="text-[9px] text-gray-500 dark:text-gray-700 font-mono">↑↓ Enter Esc</span>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto" style={{ maxHeight: 390 }}>

                  {convertItems.length > 0 && (
                    <div className="px-2 pb-1">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-0.5 pb-1">Convert to</div>
                      <div className="grid grid-cols-5 gap-1">
                        {convertItems.map(item => (
                          <button key={item.key} title={item.label}
                            onMouseEnter={() => setFocusedKey(item.key)}
                            onClick={() => handleAction(index, item.key)}
                            className={`flex items-center justify-center p-2.5 rounded-lg transition-all border
                              ${focusedKey === item.key ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-white' : `${item.color} border-transparent hover:bg-black/5 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white hover:border-gray-200 dark:hover:border-white/10`}`}
                          >{item.icon}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {calloutItems.length > 0 && (
                    <div className="px-2 pt-0.5 pb-1 border-t border-gray-100 dark:border-white/5">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-0.5 py-1">Callout</div>
                      <div className="grid grid-cols-4 gap-1">
                        {calloutItems.map(item => (
                          <button key={item.key} title={item.label}
                            onMouseEnter={() => setFocusedKey(item.key)}
                            onClick={() => handleAction(index, item.key)}
                            className={`flex items-center justify-center p-2.5 rounded-lg transition-all border
                              ${focusedKey === item.key ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-white' : `${item.color} border-transparent hover:bg-black/5 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white hover:border-gray-200 dark:hover:border-white/10`}`}
                          >{item.icon}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Block colors */}
                  <div className="px-2 pt-1 border-t border-gray-100 dark:border-white/5">
                    <div className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-0.5 py-1">Block Color</div>
                    <div className="flex gap-1 mb-1.5">
                      <button onClick={() => setColorMode(colorMode === 'bg' ? null : 'bg')}
                        className={`flex items-center gap-1 flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all ${colorMode === 'bg' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800/50 hover:bg-black/5 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'}`}>
                        <Palette className="w-3 h-3"/> BG
                      </button>
                      <button onClick={() => setColorMode(colorMode === 'text' ? null : 'text')}
                        className={`flex items-center gap-1 flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all ${colorMode === 'text' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800/50 hover:bg-black/5 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'}`}>
                        <Type className="w-3 h-3"/> Text
                      </button>
                    </div>
                    {(colorMode === 'bg' || colorMode === 'text') && (
                      <div className="grid grid-cols-5 gap-1 pb-1.5">
                        {(colorMode === 'bg' ? BG_COLORS : TEXT_COLORS).map(c => (
                          <button key={c.label} title={c.label}
                            onClick={() => colorMode === 'bg' ? applyBlockBg(index, c.value) : applyBlockColor(index, c.value)}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${c.swatch} border-transparent hover:border-indigo-400 dark:hover:border-white/30 hover:scale-110`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {colorMode === null && (
                    <div className="py-1 flex flex-col border-t border-gray-100 dark:border-white/5">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Actions</div>
                      {activeActions.map((item, i) => {
                        const disabled = (item.key === '__moveUp' && index === 0) || (item.key === '__moveDown' && index >= totalBlocks - 1);
                        return (
                          <button key={item.key} title={item.label} disabled={disabled}
                            onMouseEnter={() => setFocusedKey(item.key)}
                            onClick={() => !disabled && handleAction(index, item.key)}
                            className={`flex items-center gap-2 px-3 py-1.5 mx-2 rounded-lg text-[11px] transition-all
                              ${focusedKey === item.key && !disabled ? 'bg-brand-accent/20 text-brand-accent dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}
                              ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
                            <span className={item.color}>{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        );
      })}
    </div>
  );
}



