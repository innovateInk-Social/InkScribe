import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BubbleMenu } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript, Highlighter, Type, ExternalLink, X, ChevronDown, Sparkles, Loader2,
  Coins, Zap
} from 'lucide-react';
import { TEXT_COLORS, HIGHLIGHT_COLORS } from './colors';
import { aiClient } from '../utils/aiClient';

export default function FloatBar({ editor }) {
  const [showLink, setShowLink]         = useState(false);
  const [linkVal, setLinkVal]           = useState('');
  const [showTextColor, setShowTxtCol]  = useState(false);
  const [showHighlight, setShowHL]      = useState(false);
  const [showAlign, setShowAlign]       = useState(false);
  const [showAi, setShowAi]             = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [linkPreview, setLinkPreview]   = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    if (!editor) return;
    setLinkVal(editor.getAttributes('link').href || '');
  }, [editor?.state?.selection]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const over = (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return setLinkPreview(null);
      const r = a.getBoundingClientRect();
      setLinkPreview({ url: a.href, x: r.left, y: r.bottom + 6 });
    };
    dom.addEventListener('mouseover', over);
    dom.addEventListener('mouseleave', () => setLinkPreview(null));
    return () => dom.removeEventListener('mouseover', over);
  }, [editor]);

  const closeAll = () => { setShowTxtCol(false); setShowHL(false); setShowLink(false); setShowAlign(false); setShowAi(false); };
  const applyLink = () => { linkVal.trim() ? editor.chain().focus().setLink({ href: linkVal.trim(), target: '_blank' }).run() : editor.chain().focus().unsetLink().run(); setShowLink(false); };

  const handleAiAction = async (action, arg) => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    setAiLoading(true);
    
    if (action === 'grammar') {
      const result = await aiClient.fetchGrammar(selectedText);
      setAiLoading(false);
      setShowAi(false);
      
      if (result && result !== selectedText) {
        editor.chain().focus()
          .deleteRange({ from, to })
          .insertContent({
            type: 'grammarSuggestion',
            attrs: { original: selectedText, corrected: result }
          })
          .run();
      }
    } else if (action === 'rewrite') {
      // Append a space to the second request to force the backend to bypass its exact-match cache and return a 2nd variation
      const [result1, result2] = await Promise.all([
        aiClient.fetchRewrite(selectedText, arg),
        aiClient.fetchRewrite(selectedText + ' ', arg)
      ]);
      
      setAiLoading(false);
      setShowAi(false);
      
      const rawVariations = [result1, result2].map(v => v?.trim());
      const variations = Array.from(new Set(rawVariations)).filter(v => v && v !== selectedText.trim());
      
      if (variations.length > 0) {
        editor.chain().focus()
          .deleteRange({ from, to })
          .insertContent({
            type: 'rewriteSuggestion',
            attrs: { original: selectedText, variations }
          })
          .run();
      }
    }
  };

  if (!editor) return null;

  const b = (on) => `p-1.5 rounded transition-all ${on ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 dark:bg-indigo-500/25' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/8'}`;
  const Sep = () => <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-px flex-shrink-0"/>;

  const ALIGNS = [
    { a: 'left',    icon: <AlignLeft    className="w-3.5 h-3.5"/> },
    { a: 'center',  icon: <AlignCenter  className="w-3.5 h-3.5"/> },
    { a: 'right',   icon: <AlignRight   className="w-3.5 h-3.5"/> },
    { a: 'justify', icon: <AlignJustify className="w-3.5 h-3.5"/> },
  ];
  const curAlign = ALIGNS.find(x => editor.isActive({ textAlign: x.a })) || ALIGNS[0];

  return (
    <>
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100, placement: 'top', offset: [0, 10] }}
        shouldShow={({ state }) => {
          const { from, to, node } = state.selection;
          if (node) {
            const typeName = node.type.name;
            if (typeName === 'imageBlock' || typeName === 'image' || typeName === 'videoBlock' || typeName === 'table') {
              return false;
            }
          }
          const isCellSel = state.selection.constructor?.name === 'CellSelection';
          if (isCellSel || editor.isActive('table')) {
            return false;
          }
          return from !== to && !editor.isActive('imageBlock') && !editor.isActive('image') && !editor.isActive('videoBlock');
        }}>
        <div className="theme-panel flex items-center gap-px px-1.5 py-1 rounded-xl shadow-2xl select-none"
          onMouseDown={e => e.preventDefault()}>

          {/* Inline marks */}
          <button title="Bold"          onClick={() => editor.chain().focus().toggleBold().run()}        className={b(editor.isActive('bold'))}><Bold          className="w-3.5 h-3.5"/></button>
          <button title="Italic"        onClick={() => editor.chain().focus().toggleItalic().run()}      className={b(editor.isActive('italic'))}><Italic        className="w-3.5 h-3.5"/></button>
          <button title="Underline"     onClick={() => editor.chain().focus().toggleUnderline().run()}   className={b(editor.isActive('underline'))}><Underline    className="w-3.5 h-3.5"/></button>
          <button title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}      className={b(editor.isActive('strike'))}><Strikethrough className="w-3.5 h-3.5"/></button>
          <button title="Code"          onClick={() => editor.chain().focus().toggleCode().run()}        className={b(editor.isActive('code'))}><Code           className="w-3.5 h-3.5"/></button>
          <button title="Superscript"   onClick={() => editor.chain().focus().toggleSuperscript().run()} className={b(editor.isActive('superscript'))}><Superscript  className="w-3.5 h-3.5"/></button>
          <button title="Subscript"     onClick={() => editor.chain().focus().toggleSubscript().run()}   className={b(editor.isActive('subscript'))}><Subscript    className="w-3.5 h-3.5"/></button>
          <Sep/>

          {/* Text color */}
          <div className="relative">
            <button title="Text color" onClick={() => { closeAll(); setShowTxtCol(v=>!v); }} className={`${b(showTextColor)} flex items-center gap-px`}>
              <Type className="w-3.5 h-3.5"/><ChevronDown className="w-2 h-2 opacity-50"/>
            </button>
            {showTextColor && <ColorPop colors={TEXT_COLORS} current={editor.getAttributes('textStyle').color}
              onPick={v => { v ? editor.chain().focus().setColor(v).run() : editor.chain().focus().unsetColor().run(); setShowTxtCol(false); }}
              onClose={() => setShowTxtCol(false)} label="Text"/>}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button title="Highlight" onClick={() => { closeAll(); setShowHL(v=>!v); }} className={`${b(showHighlight || editor.isActive('highlight'))} flex items-center gap-px`}>
              <Highlighter className="w-3.5 h-3.5"/><ChevronDown className="w-2 h-2 opacity-50"/>
            </button>
            {showHighlight && <ColorPop colors={HIGHLIGHT_COLORS} current={editor.getAttributes('highlight').color}
              onPick={v => { v ? editor.chain().focus().setHighlight({ color: v }).run() : editor.chain().focus().unsetHighlight().run(); setShowHL(false); }}
              onClose={() => setShowHL(false)} label="Highlight"/>}
          </div>
          <Sep/>

          {/* Alignment dropdown */}
          <div className="relative">
            <button title="Alignment" onClick={() => { closeAll(); setShowAlign(v=>!v); }} className={`${b(showAlign)} flex items-center gap-px`}>
              {curAlign.icon}<ChevronDown className="w-2 h-2 opacity-50"/>
            </button>
            {showAlign && (
              <AlignClose onClose={() => setShowAlign(false)}>
                <div className="theme-panel absolute top-full mt-1.5 left-0 z-50 p-1 rounded-xl shadow-2xl flex flex-col gap-px"
                  style={{ minWidth: 38 }}>
                  {ALIGNS.map(({ a, icon }) => (
                    <button key={a} title={`Align ${a}`} onClick={() => { editor.chain().focus().setTextAlign(a).run(); setShowAlign(false); }}
                      className={`p-1.5 rounded-lg transition-all ${curAlign.a === a ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/8'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </AlignClose>
            )}
          </div>
          <Sep/>

          {/* Link */}
          <div className="relative">
            <button title="Link" onClick={() => { closeAll(); setShowLink(v=>!v); }} className={b(editor.isActive('link') || showLink)}>
              <LinkIcon className="w-3.5 h-3.5"/>
            </button>
            {showLink && (
              <div className="theme-panel absolute top-full mt-2 left-0 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl"
                style={{ width: 256 }}>
                <input autoFocus value={linkVal} onChange={e => setLinkVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLink(false); }}
                  placeholder="https://…"
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500/50 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-all"/>
                <button onClick={applyLink} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-semibold transition-colors">OK</button>
                <button onClick={() => setShowLink(false)} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300"><X className="w-3 h-3"/></button>
              </div>
            )}
          </div>
          <Sep/>
          
          {/* AI Actions */}
          <div className="relative">
            <button title="AI Assistant" onClick={() => { closeAll(); setShowTokenModal(true); }} className={`${b(showTokenModal)} flex items-center gap-1 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 font-medium`}>
              <Sparkles className="w-3.5 h-3.5" />
              <ChevronDown className="w-2 h-2 opacity-50"/>
            </button>
          </div>

        </div>
      </BubbleMenu>

      {linkPreview && (
        <div className="theme-panel fixed z-[9998] px-3 py-1.5 rounded-lg shadow-xl text-xs flex items-center gap-2 pointer-events-none"
          style={{ top: linkPreview.y, left: linkPreview.x, maxWidth: 300 }}>
          <ExternalLink className="w-3 h-3 text-indigo-500 dark:text-indigo-400 flex-shrink-0"/>
          <span className="text-indigo-600 dark:text-indigo-300 truncate font-mono">{linkPreview.url}</span>
        </div>
      )}
      
      <OutOfTokensModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} />
    </>
  );
}

function AlignClose({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return <div ref={ref}>{children}</div>;
}

function ColorPop({ colors, current, onPick, onClose, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} className="theme-panel absolute top-full mt-1.5 left-0 z-50 p-2 rounded-xl shadow-2xl"
      style={{ width: 192 }}>
      <p className="text-[9px] font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-1.5 px-0.5">{label}</p>
      <div className="grid grid-cols-5 gap-1">
        {colors.map(c => (
          <button key={c.label} title={c.label} onClick={() => onPick(c.value)}
            className={`w-7 h-7 rounded-lg border-2 transition-all ${c.swatch} ${current === c.value ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-indigo-400 hover:scale-105'}`}/>
        ))}
      </div>
    </div>
  );
}

function OutOfTokensModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 animate-fade-in font-sans">
      <div 
        className="theme-panel w-full max-w-md rounded-2xl border border-indigo-500/20 shadow-2xl p-6 relative flex flex-col text-gray-300 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 relative animate-pulse-subtle">
            <Coins className="w-8 h-8 text-white" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-2 border-[#121824] dark:border-[#0f1422] flex items-center justify-center text-[10px] font-bold text-white">0</span>
          </div>
          
          <h3 className="font-display font-extrabold text-white text-xl leading-tight tracking-wide">
            Out of AI Tokens
          </h3>
          
          <p className="text-xs text-indigo-400 font-mono mt-1 uppercase tracking-widest">
            Credits Exhausted
          </p>
        </div>

        {/* Message Body */}
        <div className="my-5 text-center px-2">
          <p className="text-sm text-gray-300 leading-relaxed">
            You have utilized all your complimentary writing credits. Purchase more tokens to unlock advanced AI capabilities, including style rewrites, semantic autocomplete, and context-aware grammar corrections.
          </p>
          
          <div className="mt-4 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/10 flex items-center gap-3 text-left">
            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 animate-bounce" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-indigo-200 block mb-0.5">Need a quick boost?</span>
              <span className="text-gray-400">Tokens are instantly credited to your workspace upon payment completion.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <button
            onClick={() => {
              alert("Redirecting to InnovateInk credit checkout...");
              onClose();
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 active:scale-95 transition-all text-center"
          >
            Buy AI Tokens
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
