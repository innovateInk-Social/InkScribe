import React, { useState, useRef } from 'react';
import { Link as LinkIcon, Upload, Image as Img, X } from 'lucide-react';

/**
 * ImageUploadModal — three-tab image picker:
 *   URL · Computer (local file) · Gallery (placeholder)
 */
export default function ImageUploadModal({ onInsert, onClose }) {
  const [tab, setTab]       = useState('url');   // 'url' | 'file' | 'gallery'
  const [url, setUrl]       = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef             = useRef(null);

  const doInsert = (src, alt = '') => { if (src) { onInsert(src, alt); onClose(); } };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const TAB = 'flex-1 py-1.5 text-xs font-medium transition-all rounded-lg';
  const tActive = `${TAB} bg-indigo-500/20 text-indigo-300`;
  const tIdle   = `${TAB} text-gray-500 hover:text-gray-300`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl border border-white/10 shadow-2xl w-80" style={{ background: 'rgba(10,14,23,0.98)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-sm font-semibold text-white">Insert Image</span>
          <button onClick={onClose} className="p-1 text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 pb-1">
          <button className={tab === 'url'     ? tActive : tIdle} onClick={() => setTab('url')}>URL</button>
          <button className={tab === 'file'    ? tActive : tIdle} onClick={() => setTab('file')}>Computer</button>
          <button className={tab === 'gallery' ? tActive : tIdle} onClick={() => setTab('gallery')}>Gallery</button>
        </div>

        <div className="px-3 pb-4 pt-2 space-y-3">
          {/* URL tab */}
          {tab === 'url' && (
            <>
              <input
                autoFocus
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') doInsert(url.trim()); if (e.key === 'Escape') onClose(); }}
                placeholder="https://example.com/image.png"
                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none transition-all"
              />
              {url && <img src={url} alt="preview" className="w-full h-28 object-cover rounded-lg opacity-80" onError={e => e.target.style.display='none'}/>}
              <button onClick={() => doInsert(url.trim())} disabled={!url.trim()} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                <LinkIcon className="w-3.5 h-3.5"/> Insert
              </button>
            </>
          )}

          {/* File tab */}
          {tab === 'file' && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
              {!preview
                ? <button onClick={() => fileRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-indigo-400 transition-all cursor-pointer">
                    <Upload className="w-6 h-6"/>
                    <span className="text-xs">Click to choose file</span>
                  </button>
                : <div className="relative">
                    <img src={preview} alt="preview" className="w-full h-28 object-cover rounded-xl"/>
                    <button onClick={() => { setPreview(null); fileRef.current.value=''; }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"><X className="w-3 h-3"/></button>
                  </div>
              }
              <button onClick={() => doInsert(preview)} disabled={!preview} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2">
                <Img className="w-3.5 h-3.5"/> Insert Image
              </button>
            </>
          )}

          {/* Gallery tab */}
          {tab === 'gallery' && (
            <div className="h-28 flex flex-col items-center justify-center gap-2 text-gray-600 rounded-xl border border-white/5">
              <Img className="w-7 h-7 opacity-30"/>
              <p className="text-xs text-center">Media gallery integration<br/>coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
