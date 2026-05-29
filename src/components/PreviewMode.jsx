import React, { useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Copy, Check, MessageSquare, CheckCircle, Clock, Plus, CornerDownRight, Trash2 } from 'lucide-react';

/**
 * Highly polished CodeBlock sub-component for Preview Mode.
 * Renders beautiful syntax highlighted code block with copy-to-clipboard button.
 */
function CodeBlock({ content, language, theme }) {
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  const highlightCode = (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {}
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch (e) {
      return code;
    }
  };

  const highlighted = highlightCode(content, language);

  return (
    <div className={`relative my-6 rounded-lg overflow-hidden border shadow-md font-mono text-xs group transition-all duration-300 ${
      isDark ? 'border-gray-800/80 bg-brand-panel' : 'border-cream-border bg-white code-block-wrapper'
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 text-[10px] select-none transition-colors duration-300 ${
        isDark ? 'bg-gray-900 border-b border-gray-800 text-gray-500' : 'bg-[#f6f5f0] border-b border-cream-border text-[#4b4943]'
      }`}>
        <span className="uppercase font-semibold tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`p-1 rounded transition-all active:scale-95 flex items-center gap-1 text-[10px] ${
            isDark ? 'hover:bg-white/10 hover:text-white text-gray-400' : 'hover:bg-black/5 hover:text-black text-[#4b4943]'
          }`}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className={`p-4 overflow-x-auto m-0 leading-relaxed code-block-pre ${
        isDark ? 'text-green-400' : 'text-gray-800'
      }`}>
        <code 
          className={`language-${language || ''} hljs`} 
          dangerouslySetInnerHTML={{ __html: highlighted }} 
        />
      </pre>
    </div>
  );
}

/**
 * PreviewMode Component.
 * Implements clean, theme-agnostic public article rendering.
 * ABSOLUTELY NO block borders, metadata labels, comment indicators,
 * edit handles, formatting headers, or sidebar chrome in pure reader mode.
 * Supports interactive block selection and commenting sidebar if comments props are passed.
 */
export default function PreviewMode({ article, theme = 'dark', comments, onCommentsChange, reviewerName = "Lead Reviewer" }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const isDark = theme === 'dark';

  if (!article || !article.blocks || article.blocks.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500 font-sans">
        <p className="text-sm italic">This draft does not contain any blocks to preview.</p>
      </div>
    );
  }

  const handleBlockClick = (blockId) => {
    if (!comments) return;
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
    setNewCommentText("");
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedBlockId || !onCommentsChange) return;

    const blockComments = comments[selectedBlockId] || [];
    const newComment = {
      id: `c_${Date.now()}`,
      author: reviewerName,
      message: newCommentText.trim(),
      timestamp: new Date().toISOString(),
      resolved: false
    };

    const updatedComments = {
      ...comments,
      [selectedBlockId]: [...blockComments, newComment]
    };

    onCommentsChange(updatedComments);
    setNewCommentText("");
  };

  const handleToggleResolve = (blockId, commentId) => {
    if (!onCommentsChange) return;
    const blockComments = comments[blockId] || [];
    const updated = blockComments.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    );

    onCommentsChange({
      ...comments,
      [blockId]: updated
    });
  };

  const handleDeleteComment = (blockId, commentId) => {
    if (!onCommentsChange) return;
    const blockComments = comments[blockId] || [];
    const filtered = blockComments.filter(c => c.id !== commentId);
    
    const updatedComments = { ...comments };
    if (filtered.length === 0) {
      delete updatedComments[blockId];
    } else {
      updatedComments[blockId] = filtered;
    }

    onCommentsChange(updatedComments);
  };

  // Render individual block with public-facing static styling rules
  const renderPublicBlock = (block) => {
    const content = block.content || '';
    const metadata = block.metadata || {};

    // Helper to preserve formatting and replace newlines with linebreaks
    const formatText = (text) => {
      if (typeof text !== 'string') return '';
      return text.split('\n').map((line, i) => (
        <span key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ));
    };

    switch (block.type) {
      case 'heading': {
        const level = metadata.level || 1;
        const align = metadata.alignment || 'left';
        const isDark = theme === 'dark';
        const textCol = isDark ? 'text-white' : 'text-black';
        const classes = {
          1: `text-4xl font-extrabold font-display ${textCol} mt-10 mb-4 tracking-tight leading-tight`,
          2: `text-2xl font-bold font-display ${textCol} mt-8 mb-3.5 tracking-tight`,
          3: `text-xl font-semibold font-display ${textCol} mt-6 mb-2`,
        }[level] || `text-2xl font-bold font-display ${textCol}`;
        return (
          <h1 key={block.id} className={`${classes} text-${align}`}>
            {formatText(content)}
          </h1>
        );
      }
      case 'paragraph': {
        const align = metadata.alignment || 'left';
        const isDark = theme === 'dark';
        return (
          <p key={block.id} className={`text-base leading-relaxed mb-5 text-${align} ${isDark ? 'text-gray-300' : 'text-gray-900 font-medium'}`}>
            {formatText(content)}
          </p>
        );
      }
      case 'quote': {
        const author = metadata.author || '';
        const isDark = theme === 'dark';
        return (
          <blockquote key={block.id} className="my-6">
            <p className="m-0 text-gray-900 dark:text-gray-300">{formatText(content)}</p>
            {author && (
              <div className="flex justify-end items-center gap-1.5 mt-2 not-italic select-none">
                <span className="text-[11px] text-gray-500 font-medium">— by</span>
                <span className={`text-[11px] font-medium italic ${isDark ? 'text-indigo-300/80' : 'text-indigo-600'}`}>{author}</span>
              </div>
            )}
          </blockquote>
        );
      }
      case 'image':
        return (
          <figure key={block.id} className="my-8 flex flex-col items-center select-none">
            <img src={content} alt={metadata.caption || 'Article media'} className="rounded-xl max-w-full h-auto border border-gray-800 shadow-md" />
            {metadata.caption && (
              <figcaption className="text-xs text-gray-500 mt-2.5 text-center leading-relaxed italic">
                {metadata.caption}
              </figcaption>
            )}
          </figure>
        );
      case 'video':
        return (
          <div key={block.id} className="my-8 overflow-hidden rounded-xl border border-gray-800 shadow-lg max-w-2xl mx-auto aspect-video">
            <video src={content} controls className="w-full h-full bg-black"></video>
          </div>
        );
      case 'code':
        return <CodeBlock key={block.id} content={content} language={metadata.language} theme={theme} />;
      
      case 'divider':
        return <hr key={block.id} className="border-gray-800 my-10" />;
      
      case 'list': {
        const isOrdered = metadata.listType === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';
        const items = Array.isArray(content) ? content : [content];
        const isDark = theme === 'dark';
        return (
          <ListTag key={block.id} className={`list-outside pl-6 mb-5 space-y-1 text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
            {items.map((item, idx) => <li key={idx}>{formatText(item)}</li>)}
          </ListTag>
        );
      }
      case 'table': {
        const rows = Array.isArray(content) ? content : [];
        const tableStyle = metadata.tableStyle || null;
        const headerColor = metadata.headerColor || null;
        return (
          <div key={block.id} className="tableWrapper my-6 overflow-x-auto">
            <table 
              data-table-style={tableStyle} 
              data-header-color={headerColor}
              className="w-full border-collapse text-sm"
            >
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {Array.isArray(row) && row.map((cell, cIdx) => {
                      const CellTag = rIdx === 0 ? 'th' : 'td';
                      return (
                        <CellTag key={cIdx}>
                          {formatText(cell)}
                        </CellTag>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case 'embed':
        return (
          <div key={block.id} className="my-8 overflow-hidden rounded-xl border border-gray-800 shadow-md aspect-video max-w-2xl mx-auto">
            <iframe src={content} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
          </div>
        );
      case 'callout': {
        const variant = metadata.variant || 'info';
        return (
          <blockquote key={block.id} className={`callout-${variant} my-6`}>
            <p className="m-0">{formatText(content)}</p>
          </blockquote>
        );
      }
      default:
        return null;
    }
  };

  const renderPublicBlockWithWrapper = (block) => {
    const rendered = renderPublicBlock(block);
    if (!rendered) return null;

    if (!comments) {
      return rendered;
    }

    const hasComments = comments[block.id] && comments[block.id].length > 0;
    const unresolvedComments = hasComments ? comments[block.id].filter(c => !c.resolved).length : 0;
    
    const baseClass = "transition-all duration-300 rounded-lg px-4 py-3 my-2 cursor-pointer relative border";
    const highlightClass = selectedBlockId === block.id
      ? (isDark ? "bg-brand-panel border-indigo-500/30 shadow-[0_4px_20px_rgba(129,140,248,0.08)] scale-[1.01]" : "bg-white border-indigo-500/40 shadow-[0_4px_20px_rgba(99,102,241,0.08)] scale-[1.01]")
      : (isDark ? "bg-transparent border-transparent hover:bg-white/[0.02] hover:border-gray-800/40" : "bg-transparent border-transparent hover:bg-black/[0.02] hover:border-cream-border");

    return (
      <div 
        key={block.id} 
        onClick={() => handleBlockClick(block.id)}
        className={`${baseClass} ${highlightClass}`}
      >
        {/* Subtle hover/selected serial code */}
        <span className="absolute top-2.5 right-3 text-[9px] font-mono font-medium text-gray-600/70 select-none">
          {block.id ? block.id.toUpperCase() : ''}
        </span>

        {/* Comment indicator badge on block */}
        {hasComments && (
          <span className={`absolute top-2.5 left-2.5 flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide ${unresolvedComments > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-brand-success/20 text-brand-success border border-brand-success/30'}`}>
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{unresolvedComments}</span>
          </span>
        )}

        <div className={hasComments ? "pl-7 pt-1" : "pt-1"}>
          {rendered}
        </div>
      </div>
    );
  };

  if (comments) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
        
        {/* Premium Public Reader Flow (Columns: 7 or 8 for wider display) */}
        <div className="lg:col-span-7 space-y-2 max-h-[80vh] overflow-y-auto pr-2">
          <article className="max-w-2xl mx-auto py-6 font-sans inkpack">
            {article.blocks.map(renderPublicBlockWithWrapper)}
          </article>
        </div>

        {/* Interactive Comments Drawer Panel (Columns: 5) */}
        <div className="lg:col-span-5">
          <div className={`sticky top-4 rounded-2xl p-5 border shadow-xl max-h-[80vh] overflow-y-auto flex flex-col transition-all duration-300 ${
            isDark ? 'glass-surface border-gray-800/80' : 'bg-white border-cream-border text-gray-900'
          }`}>
            {selectedBlockId ? (
              <>
                {/* Heading */}
                <div className={`flex items-center justify-between border-b pb-3.5 mb-4 ${isDark ? 'border-gray-800' : 'border-cream-border'}`}>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-xs font-mono rounded border border-indigo-500/20">
                      {selectedBlockId.toUpperCase()}
                    </span>
                    <h3 className={`font-display font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Block Comments Thread</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedBlockId(null)}
                    className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>

                {/* Comment Thread List */}
                <div className="flex-1 space-y-4 mb-5 max-h-[40vh] overflow-y-auto pr-1">
                  {comments[selectedBlockId] && comments[selectedBlockId].length > 0 ? (
                    comments[selectedBlockId].map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg border transition-all duration-300 ${
                          comment.resolved 
                            ? 'bg-brand-success/5 border-brand-success/15 opacity-65' 
                            : (isDark ? 'bg-brand-card/40 border-gray-800' : 'bg-white border-cream-border shadow-sm')
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-display font-bold text-xs ${isDark ? 'text-white' : 'text-black'}`}>{comment.author}</span>
                          <div className="flex items-center space-x-1.5">
                            {/* Resolve Checkbox */}
                            <button
                              onClick={() => handleToggleResolve(selectedBlockId, comment.id)}
                              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide transition-all border ${
                                comment.resolved
                                  ? 'bg-brand-success/10 text-brand-success border-brand-success/20 hover:bg-brand-success/20'
                                  : (isDark ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-cream-border hover:bg-black/5')
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>{comment.resolved ? 'Resolved' : 'Resolve'}</span>
                            </button>
                            
                            {/* Delete Comment */}
                            <button 
                              onClick={() => handleDeleteComment(selectedBlockId, comment.id)}
                              className="p-1 rounded text-gray-500 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className={`text-xs leading-relaxed pl-1 ${isDark ? 'text-gray-300' : 'text-gray-900 font-medium'}`}>{comment.message}</p>

                        <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-500 pl-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-10 text-center text-gray-500 border border-dashed rounded-xl ${
                      isDark ? 'border-gray-800 bg-black/10' : 'border-cream-border bg-black/5'
                    }`}>
                      <MessageSquare className="w-7 h-7 text-gray-700 mb-2" />
                      <p className="text-xs">No comments placed yet on this block.</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Use the box below to write the first message!</p>
                    </div>
                  )}
                </div>

                {/* Add New Comment */}
                <form onSubmit={handleAddComment} className={`border-t pt-4 mt-auto ${isDark ? 'border-gray-800' : 'border-cream-border'}`}>
                  <div className="flex flex-col space-y-2">
                    <textarea
                      rows="3"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={`Write comment as ${reviewerName}...`}
                      className={`w-full p-2.5 text-xs rounded-lg border focus:border-indigo-500 focus:outline-none resize-none font-sans transition-all ${
                        isDark 
                          ? 'text-gray-300 bg-brand-bg border-gray-800 placeholder-gray-600' 
                          : 'text-gray-900 bg-white border-cream-border placeholder-gray-400 shadow-sm'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="flex items-center justify-center space-x-1.5 w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 active:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500">
                <CornerDownRight className="w-10 h-10 text-indigo-400/40 mb-3.5 animate-pulse-subtle" />
                <h3 className={`font-display font-semibold text-sm mb-1 ${isDark ? 'text-white' : 'text-black'}`}>Select a Block to Review</h3>
                <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>
                  Click any paragraph, heading, or media block on the left panel to display, resolve, or insert comment threads.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standalone public-facing rendering (no comments)
  return (
    <article className="max-w-2xl mx-auto py-6 font-sans inkpack">
      {article.blocks.map(renderPublicBlock)}
    </article>
  );
}
