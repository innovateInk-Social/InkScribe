import React, { useState, useEffect, useRef } from 'react';
import InnovateInkEditor from './components/InnovateInkEditor';
import ReviewOverlay from './components/ReviewOverlay';
import PreviewMode from './components/PreviewMode';
import StatusIndicator from './components/StatusIndicator';
import { serializeArticleContent } from './processing/serializer';
import { validateArticle } from './processing/validator';
import { normalizeBlocks } from './processing/normalizer';
import { apiClient } from './transport/apiClient';
import { DEFAULT_MOCK_ARTICLE, DEFAULT_MOCK_COMMENTS } from './mocks/mockData';
import {
  Sun, Moon, Feather, MessageSquare, Eye, UploadCloud,
  Terminal, Code2, FileText, CheckCircle2, X, AlertOctagon, CheckCircle
} from 'lucide-react';

// ─── Environment flag ──────────────────────────────────────────────────────────
// All debug/simulation surfaces are tree-shaken out of production builds.
const IS_DEV = import.meta.env.DEV;

export default function App() {
  // ─── Query parameter bootstrap ────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') || 'draft'; // draft | review | preview
  const articleId = urlParams.get('article_id') || '123';
  const reviewerName = urlParams.get('reviewer') || 'Marcus Chen (Editor-in-Chief)';

  // ─── API Configuration Simulation ──────────────────────────────────────────
  const [editorConfig, setEditorConfig] = useState({
    theme: initialMode === 'review' ? 'cream' : 'dark', // default theme
    accentColor: '#6366f1', // default indigo-500
    aiFeatures: {
      enabled: false,
      endpoints: {
        autocomplete: 'http://localhost:8000/api/complete',
        grammar: 'http://localhost:8000/api/grammar',
        rewrite: 'http://localhost:8000/api/style'
      }
    },
    blocks: {
      allowed: ['paragraph', 'h1', 'h2', 'h3', 'quote', 'code', 'bulletList', 'orderedList', 'taskList', 'divider', 'callout-info', 'callout-tip', 'callout-warning', 'callout-danger', 'image', 'video', 'table']
    }
  });

  // ─── Core reactive states ──────────────────────────────────────────────────
  const [mode, setMode] = useState(initialMode);
  const [theme, setTheme] = useState(editorConfig.theme);
  const [article, setArticle] = useState(DEFAULT_MOCK_ARTICLE);
  const [comments, setComments] = useState(DEFAULT_MOCK_COMMENTS);
  const [saveState, setSaveState] = useState('saved');
  const [limitToast, setLimitToast] = useState(false);
  const [publishToast, setPublishToast] = useState(false); // Clean prod toast

  // ─── DEV-only states (tree-shaken in production) ──────────────────────────
  const [showDevDrawer, setShowDevDrawer] = useState(false);
  const [activePayloadTab, setActivePayloadTab] = useState('json');
  const [showDevPayloadModal, setShowDevPayloadModal] = useState(false);
  const [lastShippedPayload, setLastShippedPayload] = useState(null);

  // ─── Debounce refs ─────────────────────────────────────────────────────────
  const autosaveTimeout = useRef(null);
  const lastSavedBlocks = useRef(JSON.stringify(DEFAULT_MOCK_ARTICLE.blocks));

  // ─── Document title ────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = `InnovateInk Editor | ${article.title || 'Draft'}`;
  }, [article.title]);

  // ─── Theme sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('cream-mode');
      root.classList.add('dark');
      document.body.style.backgroundColor = '#080C14';
      document.body.style.color = '#D1D5DB';
    } else {
      root.classList.remove('dark');
      root.classList.add('cream-mode');
      document.body.style.backgroundColor = '#FAF8F5';
      document.body.style.color = '#2C2B29';
    }
    
    // Inject accent color dynamically
    root.style.setProperty('--color-brand-accent', editorConfig.accentColor);
  }, [theme, editorConfig.accentColor]);

  // ─── 99-block limit toast ──────────────────────────────────────────────────
  const triggerLimitToast = () => {
    setLimitToast(true);
    setTimeout(() => setLimitToast(false), 5000);
  };

  // ─── Debounced autosave engine ─────────────────────────────────────────────
  const handleContentChange = (updatedBlocks) => {
    const normalized = normalizeBlocks(updatedBlocks);
    const stringified = JSON.stringify(normalized);
    if (stringified === lastSavedBlocks.current) return;

    setArticle(prev => ({ ...prev, blocks: normalized }));
    setSaveState('syncing');

    if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);

    autosaveTimeout.current = setTimeout(async () => {
      const compilation = serializeArticleContent(normalized);

      const validation = validateArticle({ ...article, blocks: compilation.content_json });
      if (!validation.valid && IS_DEV) {
        console.warn('[Editor] Block validation issue:', validation.error);
      }

      // Diff updated blocks
      const prevBlocks = JSON.parse(lastSavedBlocks.current);
      const updatedBlockIds = compilation.content_json
        .filter((block, idx) => {
          const prev = prevBlocks[idx];
          return !prev || JSON.stringify(block) !== JSON.stringify(prev);
        })
        .map(b => b.id);

      const response = await apiClient.autosave(articleId, compilation.content_json, updatedBlockIds);

      setSaveState(response.success ? 'saved' : 'offline');
      lastSavedBlocks.current = JSON.stringify(compilation.content_json);

      // Only track payload in dev
      if (IS_DEV) {
        setLastShippedPayload({
          type: 'autosave',
          timestamp: new Date().toISOString(),
          payload: response.payload || {
            article_id: articleId,
            content_json: compilation.content_json,
            updated_blocks: updatedBlockIds
          }
        });
      }
    }, 3000);
  };

  // ─── Publish handler ───────────────────────────────────────────────────────
  const handlePublish = async () => {
    setSaveState('syncing');
    const compilation = serializeArticleContent(article.blocks);
    const response = await apiClient.publish(articleId, article.title, compilation);
    setSaveState(response.success ? 'saved' : 'offline');

    if (IS_DEV) {
      // Dev: show full payload modal with JSON/MD/HTML tabs
      setLastShippedPayload({
        type: 'publish',
        timestamp: new Date().toISOString(),
        payload: response.payload || {
          article_id: articleId,
          title: article.title,
          content_json: compilation.content_json,
          content_markdown: compilation.content_markdown,
          content_html: compilation.content_html
        }
      });
      setShowDevPayloadModal(true);
    } else {
      // Production: simple success toast only — no data exposed in UI
      setPublishToast(true);
      setTimeout(() => setPublishToast(false), 4000);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-all duration-300 ${theme === 'dark' ? 'bg-brand-bg text-gray-300' : 'bg-cream-bg text-cream-text'}`}>

      {/* ── 99 Block Limit Toast ─────────────────────────────────────────── */}
      {limitToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3 rounded-xl border border-brand-danger bg-brand-danger/20 backdrop-blur-md shadow-2xl animate-slide-up text-white select-none">
          <AlertOctagon className="w-5 h-5 text-brand-danger animate-bounce" />
          <div className="text-xs">
            <span className="font-bold">Maximum Block Limit Reached!</span>
            <p className="opacity-85 mt-0.5">Editor enforces a strict 99 block ceiling. Cannot insert more nodes.</p>
          </div>
        </div>
      )}

      {/* ── Production Publish Success Toast (non-dev only) ──────────────── */}
      {!IS_DEV && publishToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 px-5 py-3 rounded-xl border border-brand-success bg-brand-success/15 backdrop-blur-md shadow-2xl animate-slide-up text-white select-none">
          <CheckCircle className="w-5 h-5 text-brand-success" />
          <div className="text-xs">
            <span className="font-bold">Article published successfully!</span>
            <p className="opacity-75 mt-0.5">Your draft has been submitted to InnovateInk.</p>
          </div>
        </div>
      )}

      {/* ── Header Toolbar ───────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-40 border-b px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-between backdrop-blur-lg ${theme === 'dark' ? 'bg-brand-bg/85 border-gray-800/60' : 'bg-cream-bg/85 border-cream-border'}`}>

        {/* Logo */}
        <div className="flex items-center space-x-3 select-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-accent to-purple-600 flex items-center justify-center font-bold text-white tracking-tighter">
            ii
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm text-gray-900 dark:text-white tracking-wide uppercase">InnovateInk</h1>
            <p className="text-[10px] text-gray-500 font-mono">Editor-v1.0.0</p>
          </div>
        </div>

        {/* Mode Picker Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-black/5 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl max-w-sm select-none w-full sm:w-auto justify-center">
          <button
            onClick={() => setMode('draft')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              mode === 'draft' ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/40'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Draft Editor</span>
          </button>

          <button
            onClick={() => setMode('review')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              mode === 'review' ? 'bg-brand-comment text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Review Mode</span>
          </button>

          <button
            onClick={() => setMode('preview')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              mode === 'preview' ? 'bg-brand-success text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/40'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Public Preview</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
          <StatusIndicator saveState={saveState} blockCount={article.blocks.length} />

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'cream' : 'dark')}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-black/5 dark:hover:bg-gray-800/50 transition-colors bg-white/5"
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* DEV ONLY: Dev Console button */}
          {IS_DEV && (
            <button
              onClick={() => setShowDevDrawer(true)}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-brand-panel hover:bg-black/10 dark:hover:bg-gray-800/60 text-xs font-mono font-medium tracking-wide transition-colors text-indigo-600 dark:text-brand-glow"
            >
              <Terminal className="w-4 h-4 text-brand-accent animate-pulse-subtle" />
              <span>Dev Console</span>
            </button>
          )}

          {/* Publish button (draft mode only) */}
          {mode === 'draft' && (
            <button
              onClick={handlePublish}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-glow hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/35 active:scale-95 transition-all select-none"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publish Draft</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {mode === 'draft' && (
          <div className={`max-w-3xl mx-auto rounded-2xl p-4 md:p-8 border shadow-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'glass-surface border-gray-800/75 text-gray-200' 
              : 'bg-white border-cream-border text-cream-text'
          }`}>
            <input
              type="text"
              value={article.title}
              onChange={(e) => {
                setArticle(prev => ({ ...prev, title: e.target.value }));
                setSaveState('syncing');
              }}
              placeholder="Enter article title..."
              className={`w-full bg-transparent font-display font-extrabold text-3xl outline-none border-b pb-4 mb-6 leading-tight transition-colors duration-300 ${
                theme === 'dark'
                  ? 'text-white border-gray-800/40 placeholder-gray-700'
                  : 'text-cream-text border-cream-border placeholder-gray-300'
              }`}
            />
            <InnovateInkEditor
              initialArticle={article}
              onContentChange={handleContentChange}
              onLimitReached={triggerLimitToast}
              config={{ ...editorConfig, theme }}
            />
          </div>
        )}

        {mode === 'review' && (
          <ReviewOverlay
            article={article}
            comments={comments}
            onCommentsChange={(c) => {
              setComments(c);
              setSaveState('syncing');
              setTimeout(() => setSaveState('saved'), 1500);
            }}
            reviewerName={reviewerName}
            theme={theme}
          />
        )}

        {mode === 'preview' && (
          <div className={`max-w-6xl mx-auto rounded-2xl p-4 md:p-8 border shadow-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'glass-surface border-gray-800/75 text-gray-200' 
              : 'bg-white border-cream-border text-cream-text'
          }`}>
            <div className={`border-b pb-5 mb-6 text-center select-none transition-colors duration-300 ${
              theme === 'dark' ? 'border-gray-800' : 'border-cream-border'
            }`}>
              <span className="px-2.5 py-0.5 bg-brand-success/15 border border-brand-success/20 rounded text-[10px] uppercase font-bold text-brand-success tracking-widest">
                Reader Preview
              </span>
              <h1 className={`text-3xl font-extrabold font-display tracking-tight mt-3 mb-1.5 leading-tight transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-cream-text'
              }`}>{article.title}</h1>
            </div>
            <PreviewMode 
              article={article} 
              theme={theme} 
            />
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          DEV-ONLY UI — Tree-shaken entirely from production builds
          ═══════════════════════════════════════════════════════════════════ */}

      {IS_DEV && showDevPayloadModal && lastShippedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg/85 backdrop-blur-md px-4 font-sans">
          <div className="glass-surface w-full max-w-3xl rounded-2xl border border-brand-accent/30 shadow-2xl p-6 relative max-h-[85vh] flex flex-col animate-slide-up text-gray-300">
            <button
              onClick={() => setShowDevPayloadModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-gray-800">
              <CheckCircle2 className="w-8 h-8 text-brand-success animate-pulse-subtle" />
              <div>
                <h3 className="font-display font-extrabold text-white text-base leading-tight">
                  [DEV] Draft Shipped — Payload Inspector
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Outgoing payload to <code className="text-brand-glow font-mono font-bold">/api/editor/publish</code> — visible in development only
                </p>
              </div>
            </div>

            {/* Payload tab switcher */}
            <div className="flex items-center space-x-1.5 bg-black/40 border border-gray-800 p-1 rounded-xl mb-4 text-xs max-w-md select-none font-mono">
              {[
                { key: 'json', label: 'content_json', icon: <Code2 className="w-3.5 h-3.5" />, active: 'bg-brand-accent' },
                { key: 'markdown', label: 'content_markdown', icon: <FileText className="w-3.5 h-3.5" />, active: 'bg-indigo-600' },
                { key: 'html', label: 'content_html', icon: <Sun className="w-3.5 h-3.5" />, active: 'bg-brand-success' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivePayloadTab(tab.key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activePayloadTab === tab.key ? `${tab.active} text-white shadow` : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-gray-800 bg-black/30 p-4 font-mono text-xs text-green-400 max-h-[50vh]">
              {activePayloadTab === 'json' && (
                <pre>{JSON.stringify(lastShippedPayload.payload.content_json, null, 2)}</pre>
              )}
              {activePayloadTab === 'markdown' && (
                <pre className="whitespace-pre-wrap text-indigo-300">{lastShippedPayload.payload.content_markdown}</pre>
              )}
              {activePayloadTab === 'html' && (
                <pre className="whitespace-pre-wrap text-emerald-300">{lastShippedPayload.payload.content_html}</pre>
              )}
            </div>

            <div className="flex justify-end mt-5 pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowDevPayloadModal(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Return to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {IS_DEV && showDevDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl glass-panel shadow-2xl flex flex-col animate-slide-up text-gray-300 font-sans border-l border-gray-800/80">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between select-none">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-brand-accent animate-pulse-subtle" />
              <h3 className="font-display font-extrabold text-white text-sm">Dev Console · Sandbox Only</h3>
            </div>
            <button
              onClick={() => setShowDevDrawer(false)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Environment metadata */}
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none">Session Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  ['ARTICLE ID', articleId],
                  ['ACTIVE MODE', mode.toUpperCase()],
                  ['BLOCKS COUNT', `${article.blocks.length} / 99`],
                  ['REVIEWER', reviewerName],
                ].map(([label, val]) => (
                  <div key={label} className="p-2 bg-black/35 rounded border border-gray-800">
                    <span className="text-[10px] text-gray-500 block">{label}:</span>
                    <span className="text-white font-semibold truncate block">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block IDs live list */}
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none">Block Serial Map (Position Order)</h4>
              <div className="rounded-xl border border-gray-800 bg-black/35 p-3 font-mono text-[11px] text-cyan-400 max-h-40 overflow-auto">
                {article.blocks.map((b, i) => (
                  <div key={b.id} className="flex items-center space-x-2 py-0.5 border-b border-gray-800/40">
                    <span className="text-gray-600 w-5 text-right">{i + 1}.</span>
                    <span className="text-indigo-300 w-14">{b.id}</span>
                    <span className="text-gray-500">{b.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Last outbound dispatch */}
            <div>
              <div className="flex items-center justify-between mb-2 select-none">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Outbound Dispatch</h4>
                {lastShippedPayload && (
                  <span className="px-1.5 py-0.5 rounded bg-brand-success/15 border border-brand-success/35 text-[9px] font-mono text-brand-success uppercase font-semibold">
                    {lastShippedPayload.type}
                  </span>
                )}
              </div>
              {lastShippedPayload ? (
                <div className="rounded-xl border border-gray-800 bg-black/35 p-3.5 font-mono text-[11px] text-green-400 max-h-64 overflow-auto">
                  <div className="text-[9px] text-gray-500 mb-2 border-b border-gray-800/80 pb-1">
                    {new Date(lastShippedPayload.timestamp).toLocaleTimeString()}
                  </div>
                  <pre>{JSON.stringify(lastShippedPayload.payload, null, 2)}</pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                  <UploadCloud className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-xs">No payloads dispatched yet.</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Type in the editor to trigger autosave.</p>
                </div>
              )}
            </div>

            {/* Comments state */}
            <div>
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 select-none">Active Comments State</h4>
              <div className="rounded-xl border border-gray-800 bg-black/35 p-3.5 font-mono text-[11px] text-indigo-300 max-h-48 overflow-auto">
                <pre>{JSON.stringify(comments, null, 2)}</pre>
              </div>
            </div>

          </div>

          <div className="p-4 border-t border-gray-800 bg-black/20 select-none">
            <button
              onClick={() => setShowDevDrawer(false)}
              className="w-full py-2 bg-brand-accent hover:bg-brand-glow text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Close Console
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-6 border-t border-gray-800/40 text-center text-xs text-gray-600 select-none font-mono">
        InnovateInk // Article Editor Container
      </footer>

    </div>
  );
}
