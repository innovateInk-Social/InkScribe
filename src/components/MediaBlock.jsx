import React, { useState, useRef, useCallback } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Upload, AlignLeft, AlignCenter, AlignRight, RefreshCw, Trash2, MessageSquare, Crop, X, Check, ExternalLink, Maximize2, RotateCcw, Download, SlidersHorizontal, Undo2, Redo2, FlipHorizontal, Blend, Columns } from 'lucide-react';
import { toYoutubeEmbed } from '../utils/blockUtils';

const PRESETS = [
  { id:'normal', label:'Normal', f:'' },
  { id:'gray',   label:'Gray',   f:'grayscale(100%)' },
  { id:'sepia',  label:'Sepia',  f:'sepia(80%) brightness(105%)' },
  { id:'warm',   label:'Warm',   f:'brightness(108%) saturate(130%) sepia(12%)' },
  { id:'cool',   label:'Cool',   f:'saturate(85%) hue-rotate(18deg) brightness(102%)' },
  { id:'vivid',  label:'Vivid',  f:'brightness(105%) contrast(115%) saturate(145%)' },
  { id:'dark',   label:'Dark',   f:'brightness(72%) contrast(112%)' },
  { id:'matte',  label:'Matte',  f:'brightness(95%) contrast(88%) saturate(72%)' },
];

// Filter builder — combines preset + individual sliders
const mkFilter = (a) => {
  const parts = [];
  if (a.imgFilter) parts.push(a.imgFilter);
  if ((a.imgBright  ??100) !== 100)  parts.push(`brightness(${a.imgBright}%)`);
  if ((a.imgContrast??100) !== 100)  parts.push(`contrast(${a.imgContrast}%)`);
  if ((a.imgSat     ??100) !== 100)  parts.push(`saturate(${a.imgSat}%)`);
  if ((a.imgHue     ??0)   !== 0)    parts.push(`hue-rotate(${a.imgHue}deg)`);
  if ((a.imgBlur    ??0)   !== 0)    parts.push(`blur(${a.imgBlur}px)`);
  if (a.imgInvert)                   parts.push('invert(100%)');
  return parts.join(' ') || undefined;
};

// Slider — DON'T stopPropagation on mousedown so range drag still works
const Sld = ({ label, val, min, max, onChange }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[9px] text-gray-600 whitespace-nowrap">{label} {val}</span>
    <input type="range" min={min} max={max} value={val}
      onChange={e => onChange(+e.target.value)}
      onMouseDown={e => e.nativeEvent.stopImmediatePropagation()}
      className="w-16 cool-slider"/>
  </div>
);

const btn = (on) => `p-1.5 rounded transition-all border ${on ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`;
const Sep = () => <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-px flex-shrink-0"/>;

// ── URL param helpers ─────────────────────────────────────────────────────────
const ytToggle  = (src, key, val) => { try { const u = new URL(src); u.searchParams.has(key) ? u.searchParams.delete(key) : u.searchParams.set(key, val); return u.toString(); } catch { return src; } };
const ytHas     = (src, key)      => { try { return new URL(src||'').searchParams.has(key); } catch { return false; } };

// ── Image NodeView ────────────────────────────────────────────────────────────
function ImageNodeView({ node, updateAttributes, deleteNode, selected }) {
  const { src, caption, showCaption, align, imgWidth, imgFilter='', imgOpacity=100,
          imgBright=100, imgContrast=100, imgSat=100, imgHue=0, imgBlur=0, imgInvert=false, originalSrc } = node.attrs;
  const [url, setUrl]           = useState('');
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [dragging, setDragging] = useState(null);
  const [cropErr, setCropErr]   = useState('');
  const [showFmt, setShowFmt]   = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  // Local src history for undo/redo
  const [srcHistory, setSrcHistory] = useState([]);
  const [srcFuture,  setSrcFuture]  = useState([]);
  const fileRef   = useRef(null);
  const imgRef    = useRef(null);
  const dragStart = useRef(null);

  // Push to history before changing src
  const pushSrc = useCallback((newSrc) => {
    setSrcHistory(h => [...h, src]);
    setSrcFuture([]);
    updateAttributes({ src: newSrc });
  }, [src, updateAttributes]);

  const undoImg = () => {
    if (!srcHistory.length) return;
    setSrcFuture(f => [src, ...f]);
    const prev = srcHistory[srcHistory.length - 1];
    setSrcHistory(h => h.slice(0, -1));
    updateAttributes({ src: prev });
  };

  const redoImg = () => {
    if (!srcFuture.length) return;
    setSrcHistory(h => [...h, src]);
    const next = srcFuture[0];
    setSrcFuture(f => f.slice(1));
    updateAttributes({ src: next });
  };

  const loadFile = (file) => {
    if (!file?.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => {
      const newSrc = e.target.result;
      // Save as originalSrc if not already set
      updateAttributes({ src: newSrc, originalSrc: node.attrs.originalSrc || newSrc });
    };
    r.readAsDataURL(file);
  };

  // ── Crop: fetch image → object URL → canvas (bypasses CORS) ────────────────
  const applyCrop = useCallback(async () => {
    if (!src) return;
    setCropErr('');
    const doCrop = (imgEl) => {
      const x = Math.round(imgEl.naturalWidth  * cropRect.x / 100);
      const y = Math.round(imgEl.naturalHeight * cropRect.y / 100);
      const w = Math.round(imgEl.naturalWidth  * cropRect.w / 100);
      const h = Math.round(imgEl.naturalHeight * cropRect.h / 100);
      const c = document.createElement('canvas');
      c.width = w || 1; c.height = h || 1;
      try {
        c.getContext('2d').drawImage(imgEl, x, y, w, h, 0, 0, w, h);
        // pushSrc records this change in local history for undo
        pushSrc(c.toDataURL('image/jpeg', 0.92));
        setCropMode(false);
        setCropRect({ x: 0, y: 0, w: 100, h: 100 });
      } catch { setCropErr('Cannot crop (CORS). Save the image locally first.'); }
    };
    // data/blob URLs — canvas works directly
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const img = new window.Image(); img.onload = () => doCrop(img); img.src = src; return;
    }
    // External URL — fetch as blob to bypass CORS
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => { doCrop(img); URL.revokeObjectURL(objUrl); };
      img.onerror = () => { URL.revokeObjectURL(objUrl); setCropErr('Could not load image.'); };
      img.src = objUrl;
    } catch { setCropErr('Cannot crop (CORS). Save the image locally first.'); }
  }, [src, cropRect, updateAttributes]);

  // ── Crop drag handlers — position relative to the <img> element ────────────
  const onCropDown = (e, handle) => {
    e.preventDefault(); e.stopPropagation();
    const imgRect = imgRef.current?.getBoundingClientRect();
    if (!imgRect) return;
    setDragging(handle);
    dragStart.current = { mx: e.clientX, my: e.clientY, rect: { ...cropRect }, imgRect };
  };
  const onCropMove = useCallback((e) => {
    if (!dragging || !dragStart.current) return;
    const { mx, my, rect, imgRect } = dragStart.current;
    const dx = (e.clientX - mx) / imgRect.width  * 100;
    const dy = (e.clientY - my) / imgRect.height * 100;
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const nr = { ...rect };
    if      (dragging === 'move') { nr.x=cl(rect.x+dx,0,100-rect.w); nr.y=cl(rect.y+dy,0,100-rect.h); }
    else if (dragging === 'se')   { nr.w=cl(rect.w+dx,5,100-rect.x); nr.h=cl(rect.h+dy,5,100-rect.y); }
    else if (dragging === 'sw')   { const nw=cl(rect.w-dx,5,rect.x+rect.w); nr.x=rect.x+rect.w-nw; nr.w=nw; nr.h=cl(rect.h+dy,5,100-rect.y); }
    else if (dragging === 'ne')   { nr.w=cl(rect.w+dx,5,100-rect.x); const nh=cl(rect.h-dy,5,rect.y+rect.h); nr.y=rect.y+rect.h-nh; nr.h=nh; }
    else if (dragging === 'nw')   { const nw=cl(rect.w-dx,5,rect.x+rect.w); nr.x=rect.x+rect.w-nw; nr.w=nw; const nh=cl(rect.h-dy,5,rect.y+rect.h); nr.y=rect.y+rect.h-nh; nr.h=nh; }
    setCropRect(nr);
  }, [dragging]);
  // Download with canvas filters applied
  const downloadFormatted = useCallback(async () => {
    const doCanvas = (imgEl) => {
      const c = document.createElement('canvas');
      c.width = imgEl.naturalWidth; c.height = imgEl.naturalHeight;
      const ctx = c.getContext('2d');
      const f = mkFilter(node.attrs);
      if (f) ctx.filter = f;
      ctx.globalAlpha = (imgOpacity ?? 100) / 100;
      ctx.drawImage(imgEl, 0, 0);
      Object.assign(document.createElement('a'), { href: c.toDataURL('image/jpeg', 0.92), download: 'image.jpg' }).click();
    };
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new window.Image();
      img.onload = () => { doCanvas(img); URL.revokeObjectURL(objUrl); };
      img.src = objUrl;
    } catch { Object.assign(document.createElement('a'), { href: src, download: 'image', target: '_blank' }).click(); }
  }, [src, node.attrs]);

  const mStyle   = align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0';
  const wPct      = imgWidth || 100;
  const curFilter = mkFilter(node.attrs) || undefined;
  // Remove all formatting: restore originalSrc (undoes crop), reset all filters
  const resetFmt  = () => updateAttributes({
    src: originalSrc || src,
    imgWidth: 100, align: 'left',
    imgFilter: '', imgBright: 100, imgContrast: 100, imgSat: 100,
    imgOpacity: 100, imgHue: 0, imgBlur: 0, imgInvert: false,
  });

  if (src) {
    return (
      <NodeViewWrapper as="figure" className="my-3" style={{ overflow: 'visible', position: 'relative', display: 'block' }} contentEditable={false}
        onMouseMove={cropMode ? onCropMove : undefined}
        onMouseUp={cropMode ? () => setDragging(null) : undefined}>

        {/* Filter sub-bar */}
        {selected && showFmt && !cropMode && (
          <div className="theme-panel absolute z-31 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-2xl"
            style={{ top: -118, borderRadius: 12, padding: '8px 10px' }}
            onMouseDown={e => e.stopPropagation()}>
            {/* Filter presets */}
            <div className="flex items-center gap-1 mb-2">
              {PRESETS.map(p => (
                <button key={p.id} title={p.label} onClick={() => updateAttributes({ imgFilter: p.f })}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-all ${imgFilter===p.f ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>
                  {p.label}
                </button>
              ))}
              {/* Invert toggle */}
              <button title="Invert" onClick={() => updateAttributes({ imgInvert: !imgInvert })}
                className={`p-1 rounded border transition-all ${imgInvert ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>
                <Blend className="w-3 h-3"/>
              </button>
              <button title="Flip horizontal (CSS)" onClick={() => updateAttributes({ imgFlip: !node.attrs.imgFlip })}
                className={`p-1 rounded border transition-all ${node.attrs.imgFlip ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>
                <FlipHorizontal className="w-3 h-3"/>
              </button>
              {/* Compare toggle */}
              <button title="Compare Before/After" onClick={() => setCompareMode(v => !v)}
                className={`p-1 rounded border transition-all ${compareMode ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>
                <Columns className="w-3 h-3"/>
              </button>
            </div>
            {/* Sliders row */}
            <div className="flex items-center gap-2.5">
              <Sld label="Opacity"  val={imgOpacity??100}  min={10} max={100} onChange={v=>updateAttributes({imgOpacity:v})}/>
              <Sld label="Bright"   val={imgBright??100}   min={50} max={200} onChange={v=>updateAttributes({imgBright:v})}/>
              <Sld label="Contrast" val={imgContrast??100} min={50} max={200} onChange={v=>updateAttributes({imgContrast:v})}/>
              <Sld label="Sat"      val={imgSat??100}      min={0}  max={200} onChange={v=>updateAttributes({imgSat:v})}/>
              <Sld label="Hue"      val={imgHue??0}        min={0}  max={360} onChange={v=>updateAttributes({imgHue:v})}/>
              <Sld label="Blur"     val={imgBlur??0}       min={0}  max={10}  onChange={v=>updateAttributes({imgBlur:v})}/>
            </div>
          </div>
        )}

        {/* Main toolbar */}
        {selected && !cropMode && (
          <div className="theme-panel absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-px px-1.5 py-1 rounded-xl shadow-2xl select-none whitespace-nowrap"
            style={{ borderRadius: 12 }} onMouseDown={e => e.stopPropagation()}>
            <button title="Align left"  onClick={()=>updateAttributes({align:'left'})}   className={btn(!align||align==='left')}><AlignLeft   className="w-3.5 h-3.5"/></button>
            <button title="Center"      onClick={()=>updateAttributes({align:'center'})} className={btn(align==='center')}><AlignCenter className="w-3.5 h-3.5"/></button>
            <button title="Align right" onClick={()=>updateAttributes({align:'right'})}  className={btn(align==='right')}><AlignRight  className="w-3.5 h-3.5"/></button>
            <Sep/>
            {[25,50,75].map(w=>(
              <button key={w} title={`Width ${w}%`} onClick={()=>updateAttributes({imgWidth:w})}
                className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all border ${wPct===w?'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>{w}%</button>
            ))}
            <button title="Fit to block" onClick={()=>updateAttributes({imgWidth:100})} className={btn(wPct===100)}><Maximize2 className="w-3.5 h-3.5"/></button>
            <Sep/>
            <button title="Toggle caption" onClick={()=>updateAttributes({showCaption:!showCaption})} className={btn(showCaption)}><MessageSquare className="w-3.5 h-3.5"/></button>
            <button title="Crop image"     onClick={()=>{setCropRect({x:0,y:0,w:100,h:100});setCropErr('');setCropMode(true);}} className={btn(false)}><Crop className="w-3.5 h-3.5"/></button>
            <button title="Image filters"  onClick={()=>setShowFmt(v=>!v)} className={btn(showFmt)}><SlidersHorizontal className="w-3.5 h-3.5"/></button>
            <Sep/>
            {/* Src undo/redo (local history for crop/replace) */}
            <button title="Undo image change" onClick={undoImg} disabled={!srcHistory.length} className={`${btn(false)} disabled:opacity-30`}><Undo2 className="w-3.5 h-3.5"/></button>
            <button title="Redo image change" onClick={redoImg} disabled={!srcFuture.length}  className={`${btn(false)} disabled:opacity-30`}><Redo2 className="w-3.5 h-3.5"/></button>
            <Sep/>
            <button title="Replace image"  onClick={()=>{ setSrcHistory(h=>[...h,src]); setSrcFuture([]); updateAttributes({src:null, originalSrc:null}); }} className={btn(false)}><RefreshCw className="w-3.5 h-3.5"/></button>
            <button title="Download with formatting" onClick={downloadFormatted} className={btn(false)}><Download className="w-3.5 h-3.5"/></button>
            <button title="Remove all formatting"    onClick={resetFmt}         className={btn(false)}><RotateCcw className="w-3.5 h-3.5"/></button>
            <Sep/>
            <button title="Delete image" onClick={deleteNode} className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        )}

        {/* Image wrapper — crop overlay is INSIDE here, so it only covers the image */}
        <div style={{ display:'block', width:`${wPct}%`, margin: mStyle, position:'relative', overflow: cropMode ? 'visible' : 'hidden', borderRadius: 12 }}
          className={selected && !cropMode ? 'ring-2 ring-indigo-500/40' : ''}>
          <img ref={imgRef} src={compareMode ? (originalSrc || src) : src} alt={caption||''}
            style={{
              width:'100%', display:'block', borderRadius: 12,
              filter: compareMode ? undefined : curFilter,
              opacity: compareMode ? undefined : (imgOpacity??100)/100,
              transform: compareMode ? undefined : (node.attrs.imgFlip ? 'scaleX(-1)' : undefined),
            }}
            className="max-h-[520px] object-cover"/>

          {/* Compare Overlays */}
          {compareMode && (
            <>
              <div className="absolute inset-0 z-10 pointer-events-none" style={{ clipPath: `inset(0 0 0 ${splitPos}%)`, borderRadius: 12, overflow: 'hidden' }}>
                 <img src={src} alt="" style={{ filter: curFilter, opacity: (imgOpacity??100)/100, transform: node.attrs.imgFlip ? 'scaleX(-1)' : undefined, width: '100%', height: '100%' }} className="object-cover" />
              </div>
              <input type="range" min="0" max="100" value={splitPos} onChange={e => setSplitPos(+e.target.value)} onMouseDown={e => e.nativeEvent.stopImmediatePropagation()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 p-0" />
              <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)] z-15 pointer-events-none" style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }} />
            </>
          )}

          {/* Crop overlay — absolutely covers only the <img> */}
          {cropMode && (
            <div className="absolute inset-0 select-none" style={{ zIndex: 20, cursor:'crosshair', borderRadius: 12, overflow:'hidden', background:'rgba(0,0,0,0.45)' }}>
              {/* Selection */}
              <div className="absolute border-2 border-white/90 cursor-move"
                style={{ left:`${cropRect.x}%`, top:`${cropRect.y}%`, width:`${cropRect.w}%`, height:`${cropRect.h}%` }}
                onMouseDown={e=>onCropDown(e,'move')}>
                {/* Corner handles */}
                {[['nw','0%','0%'],['ne','0%','100%'],['sw','100%','0%'],['se','100%','100%']].map(([h,top,left])=>(
                  <div key={h} className="absolute w-3 h-3 bg-white border border-gray-700 rounded-sm"
                    style={{ top, left, transform:'translate(-50%,-50%)', cursor:'nwse-resize' }}
                    onMouseDown={e=>onCropDown(e,h)}/>
                ))}
              </div>
              {/* Controls */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{zIndex:21}}>
                {cropErr && <p className="text-red-400 text-[10px] bg-black/80 px-2 py-0.5 rounded">{cropErr}</p>}
                <div className="flex gap-2">
                  <button onMouseDown={e=>{e.preventDefault();applyCrop();}} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg font-semibold shadow"><Check className="w-3.5 h-3.5"/>Apply</button>
                  <button onMouseDown={e=>{e.preventDefault();setCropMode(false);setCropErr('');}} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg shadow"><X className="w-3.5 h-3.5"/>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {showCaption && (
          <input value={caption||''} onChange={e=>updateAttributes({caption:e.target.value})}
            onKeyDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
            placeholder="Add a caption…"
            className="w-full text-center text-sm italic text-gray-500 dark:text-gray-400 bg-transparent outline-none mt-1.5 placeholder-gray-400 dark:placeholder-gray-700 border-b border-gray-100 dark:border-white/5 pb-0.5"/>
        )}
      </NodeViewWrapper>
    );
  }

  // ── Empty placeholder ─────────────────────────────────────────────────────
  return (
    <NodeViewWrapper as="div" style={{ display:'block' }}>
      <div contentEditable={false}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();loadFile(e.dataTransfer.files?.[0]);}}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all select-none ${selected?'border-indigo-500/40 bg-indigo-500/5':'border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15'}`}>
        <svg className="w-7 h-7 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <p className="text-xs text-gray-500 dark:text-gray-600">Drop image · paste URL · choose file</p>
        <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
          <input value={url} onChange={e=>setUrl(e.target.value)}
            onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'&&url.trim())updateAttributes({src:url.trim()});}}
            onClick={e=>e.stopPropagation()} placeholder="https://…"
            className="bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-indigo-500/40 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-700 outline-none w-44 transition-all"/>
          <button onMouseDown={e=>{e.preventDefault();if(url.trim())updateAttributes({src:url.trim()});}} className="px-3 py-1.5 bg-black/5 dark:bg-white/8 hover:bg-black/8 dark:hover:bg-white/15 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs rounded-lg border border-gray-200 dark:border-white/10 transition-all">Set</button>
          <button onMouseDown={e=>{e.preventDefault();fileRef.current?.click();}} title="Choose file" className="p-2 bg-black/5 dark:bg-white/8 hover:bg-black/8 dark:hover:bg-white/15 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg border border-gray-200 dark:border-white/10 transition-all"><Upload className="w-3.5 h-3.5"/></button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>loadFile(e.target.files?.[0])}/>
      </div>
    </NodeViewWrapper>
  );
}

// ── Video NodeView ────────────────────────────────────────────────────────────
function VideoNodeView({ node, updateAttributes, deleteNode, selected }) {
  const { src, vidWidth } = node.attrs;
  const [url, setUrl]       = useState('');
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef(null);
  const wPct = vidWidth || 100;
  const showBar = selected || hovered;

  const handleMouseEnter = () => { clearTimeout(hoverTimeout.current); setHovered(true); };
  const handleMouseLeave = () => { hoverTimeout.current = setTimeout(() => setHovered(false), 300); };

  if (src) {
    return (
      <NodeViewWrapper as="div" className="my-3" style={{ overflow:'visible', position:'relative', display:'block' }} contentEditable={false}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {/* Video toolbar — shows on hover or selection */}
        {showBar && (
          <div className="theme-panel absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-px px-1.5 py-1 rounded-xl shadow-2xl select-none whitespace-nowrap"
            style={{ borderRadius: 12 }} onMouseDown={e=>e.stopPropagation()}>
            {/* Width — aspect ratio preserved via aspect-video class */}
            {[50,75,100].map(w=>(
              <button key={w} title={`Width ${w}%`} onClick={()=>updateAttributes({vidWidth:w})}
                className={`px-1.5 py-1 rounded text-[10px] font-mono transition-all border ${wPct===w?'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>{w}%</button>
            ))}
            <Sep/>
            <button title={ytHas(src,'autoplay')?'Autoplay ON (click to off)':'Autoplay OFF'} onClick={()=>updateAttributes({src:ytToggle(src,'autoplay','1')})}
              className={`px-1.5 py-1 rounded text-[10px] transition-all border ${ytHas(src,'autoplay')?'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>Auto</button>
            <button title={ytHas(src,'loop')?'Loop ON':'Loop OFF'}   onClick={()=>updateAttributes({src:ytToggle(src,'loop','1')})}
              className={`px-1.5 py-1 rounded text-[10px] transition-all border ${ytHas(src,'loop')?'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>Loop</button>
            <button title={ytHas(src,'mute')?'Muted':'Unmuted'}      onClick={()=>updateAttributes({src:ytToggle(src,'mute','1')})}
              className={`px-1.5 py-1 rounded text-[10px] transition-all border ${ytHas(src,'mute')?'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8 border-transparent'}`}>Mute</button>
            <Sep/>
            <button title="Replace video" onClick={() => updateAttributes({src: null})} className={btn(false)}><RefreshCw className="w-3.5 h-3.5"/></button>
            <button title="Open in YouTube" onClick={()=>window.open(src.replace('/embed/','/watch?v='),'_blank')} className={btn(false)}><ExternalLink className="w-3.5 h-3.5"/></button>
            <Sep/>
            <button title="Delete" onClick={deleteNode} className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        )}
        <div style={{ width:`${wPct}%`, margin:'0 auto' }} className={`rounded-xl overflow-hidden ${selected?'ring-2 ring-red-500/30':''}`}>
          <iframe src={src} className="w-full aspect-video block" frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
        </div>
      </NodeViewWrapper>
    );
  }

  // ── Empty video placeholder ───────────────────────────────────────────────
  return (
    <NodeViewWrapper as="div" style={{ display:'block' }}>
      <div contentEditable={false}
        className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 transition-all select-none ${selected?'border-red-500/30 bg-red-500/5':'border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/15'}`}>
        <svg className="w-7 h-7 text-red-500/60" viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 3H4.4A1.4 1.4 0 003 4.4v15.2A1.4 1.4 0 004.4 21h15.2a1.4 1.4 0 001.4-1.4V4.4A1.4 1.4 0 0019.6 3zm-9.1 13V8l6.5 4-6.5 4z"/></svg>
        <p className="text-xs text-gray-500 dark:text-gray-600">Paste YouTube URL · press Enter to embed</p>
        <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
          <input value={url} onChange={e=>setUrl(e.target.value)}
            onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){const s=toYoutubeEmbed(url);if(s)updateAttributes({src:s});}}}
            onClick={e=>e.stopPropagation()} placeholder="https://youtube.com/watch?v=…"
            className="bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-red-500/40 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-700 outline-none w-60 transition-all"/>
          <button onMouseDown={e=>{e.preventDefault();const s=toYoutubeEmbed(url);if(s)updateAttributes({src:s});}} className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded-lg transition-all font-semibold">Embed</button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ── Extensions ────────────────────────────────────────────────────────────────
export const ImageBlock = Node.create({
  name: 'imageBlock', group: 'block', atom: true, draggable: true, selectable: true,
  addAttributes() {
    return {
      src:{default:null}, caption:{default:''}, showCaption:{default:false},
      align:{default:'left'}, imgWidth:{default:100}, originalSrc:{default:null},
      imgFilter:{default:''}, imgOpacity:{default:100},
      imgBright:{default:100}, imgContrast:{default:100}, imgSat:{default:100},
      imgHue:{default:0}, imgBlur:{default:0}, imgInvert:{default:false}, imgFlip:{default:false},
    };
  },
  parseHTML()  { return [{ tag: 'figure[data-image-block]' }]; },
  renderHTML({ HTMLAttributes }) { return ['figure', mergeAttributes({ 'data-image-block':'' }, HTMLAttributes)]; },
  addNodeView() { return ReactNodeViewRenderer(ImageNodeView); },
});

export const VideoBlock = Node.create({
  name: 'videoBlock', group: 'block', atom: true, draggable: true, selectable: true,
  addAttributes() { return { src:{default:null}, vidWidth:{default:100} }; },
  parseHTML()  { return [{ tag: 'div[data-video-block]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-video-block':'' }, HTMLAttributes)]; },
  addNodeView() { return ReactNodeViewRenderer(VideoNodeView); },
});
