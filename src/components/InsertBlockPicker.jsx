import React, { useState, useEffect, useRef } from 'react';
import {
  Type, Heading1, Heading2, Heading3, Quote, Code2,
  List, ListOrdered, CheckSquare, Minus, Image as ImageIcon,
  Video, Grid, Info, Lightbulb, AlertTriangle, XCircle
} from 'lucide-react';

// Colors match BlockHandle TURN_ITEMS
const SECTIONS = [
  { label: 'Text', items: [
    { key: 'paragraph',       label: 'Text',    icon: <Type          className="w-4 h-4"/>, color: 'text-gray-800 dark:text-gray-300' },
    { key: 'h1',              label: 'H1',      icon: <Heading1      className="w-4 h-4"/>, color: 'text-gray-900 dark:text-white' },
    { key: 'h2',              label: 'H2',      icon: <Heading2      className="w-4 h-4"/>, color: 'text-gray-900 dark:text-white' },
    { key: 'h3',              label: 'H3',      icon: <Heading3      className="w-4 h-4"/>, color: 'text-gray-800 dark:text-gray-200' },
    { key: 'quote',           label: 'Quote',   icon: <Quote         className="w-4 h-4"/>, color: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'code',            label: 'Code',    icon: <Code2         className="w-4 h-4"/>, color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'bulletList',      label: 'Bullet',  icon: <List          className="w-4 h-4"/>, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'orderedList',     label: 'Numbered',icon: <ListOrdered   className="w-4 h-4"/>, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'taskList',        label: 'Todo',    icon: <CheckSquare   className="w-4 h-4"/>, color: 'text-violet-600 dark:text-violet-400' },
    { key: 'divider',         label: 'Divider', icon: <Minus         className="w-4 h-4"/>, color: 'text-gray-500' },
  ]},
  { label: 'Media', items: [
    { key: 'image',           label: 'Image',   icon: <ImageIcon     className="w-4 h-4"/>, color: 'text-cyan-600 dark:text-cyan-400' },
    { key: 'video',           label: 'Video',   icon: <Video         className="w-4 h-4"/>, color: 'text-red-600 dark:text-red-400' },
    { key: 'table',           label: 'Table',   icon: <Grid          className="w-4 h-4"/>, color: 'text-blue-600 dark:text-blue-300' },
  ]},
  { label: 'Callout', items: [
    { key: 'callout-info',    label: 'Info',    icon: <Info          className="w-4 h-4"/>, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'callout-tip',     label: 'Tip',     icon: <Lightbulb     className="w-4 h-4"/>, color: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'callout-warning', label: 'Warning', icon: <AlertTriangle className="w-4 h-4"/>, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'callout-danger',  label: 'Danger',  icon: <XCircle       className="w-4 h-4"/>, color: 'text-red-600 dark:text-red-400' },
  ]},
];

const ALL_ITEMS = SECTIONS.flatMap(s => s.items);

export default function InsertBlockPicker({ anchorRect, onSelect, onClose, allowedBlocks }) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [search, setSearch]         = useState('');
  const searchRef = useRef(null);
  const menuRef   = useRef(null);

  // Filter allowed items if config is provided
  const availableItems = allowedBlocks 
    ? ALL_ITEMS.filter(item => allowedBlocks.includes(item.key))
    : ALL_ITEMS;

  const filtered = search.trim() 
    ? availableItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase())) 
    : null;
  const navItems = filtered || availableItems;

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { setFocusedIdx(0); }, [search]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => (i+1) % navItems.length); }
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => (i-1+navItems.length) % navItems.length); }
      if (e.key === 'Enter') { e.preventDefault(); onSelect(navItems[focusedIdx]?.key); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [focusedIdx, navItems, onClose, onSelect]);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const W = 220, H = 360;
  const top  = Math.min(Math.max(anchorRect.top, 8), window.innerHeight - H - 8);
  const left = Math.max(8, anchorRect.left - W - 12);

  return (
    <div ref={menuRef} style={{ position:'fixed', top, left, width:W, zIndex:9999, pointerEvents:'auto', borderRadius:12 }}
      className="theme-panel flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

      {/* Search */}
      <div className="px-2.5 pt-2.5 pb-1.5">
        <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-all"/>
      </div>

      {/* Icon grid — icons only, title attr for tooltip */}
      <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: 290 }}>
        {filtered ? (
          filtered.length === 0
            ? <p className="text-center text-gray-400 dark:text-gray-600 text-xs py-6">No results</p>
            : <div className="grid grid-cols-5 gap-1 pt-1">
                {filtered.map((item, idx) => <IconBtn key={item.key} item={item} focused={focusedIdx===idx} onHover={() => setFocusedIdx(idx)} onClick={() => onSelect(item.key)}/>)}
              </div>
        ) : SECTIONS.map(sec => {
          const allowedItems = sec.items.filter(item => allowedBlocks ? allowedBlocks.includes(item.key) : true);
          if (allowedItems.length === 0) return null;
          return (
            <div key={sec.label} className="mt-1.5">
              <div className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-1 pb-1">{sec.label}</div>
              <div className="grid grid-cols-5 gap-1">
                {allowedItems.map(item => {
                  const gi = availableItems.indexOf(item);
                  return <IconBtn key={item.key} item={item} focused={focusedIdx===gi} onHover={() => setFocusedIdx(gi)} onClick={() => onSelect(item.key)}/>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 dark:border-white/5 px-3 py-1.5 text-[9px] text-gray-500 dark:text-gray-700 font-mono flex justify-between">
        <span>← →</span><span>Enter</span><span>Esc</span>
      </div>
    </div>
  );
}

function IconBtn({ item, focused, onHover, onClick }) {
  return (
    <button title={item.label} onMouseEnter={onHover} onClick={onClick}
      className={`flex items-center justify-center p-2.5 rounded-lg transition-all border
        ${focused ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-600 dark:text-white' : `${item.color} border-transparent hover:bg-black/5 dark:hover:bg-white/6 hover:border-gray-200 dark:hover:border-white/10`}`}>
      {item.icon}
    </button>
  );
}
