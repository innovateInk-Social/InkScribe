import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Clock, Plus, CornerDownRight, Trash2 } from 'lucide-react';

/**
 * ReviewOverlay Component.
 * Implements the interactive Read-Only Review Workspace.
 * Reviewers can hover/click blocks to see/manage comments, but CANNOT edit content.
 */
export default function ReviewOverlay({ article, comments, onCommentsChange, reviewerName = "Lead Reviewer", theme = "dark" }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [newCommentText, setNewCommentText] = useState("");
  const isDark = theme === 'dark';

  const handleBlockClick = (blockId) => {
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
    setNewCommentText("");
  };

  // Add comment handler
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedBlockId) return;

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

  // Toggle resolved status
  const handleToggleResolve = (blockId, commentId) => {
    const blockComments = comments[blockId] || [];
    const updated = blockComments.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    );

    onCommentsChange({
      ...comments,
      [blockId]: updated
    });
  };

  // Delete comment handler
  const handleDeleteComment = (blockId, commentId) => {
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

  // Helper to render block previews statically in Review Mode
  const renderStaticBlock = (block) => {
    const content = block.content || '';
    const metadata = block.metadata || {};

    const isDark = theme === 'dark';
    const baseClass = "transition-all duration-300 rounded-lg p-3 my-1.5 cursor-pointer relative border";
    const highlightClass = selectedBlockId === block.id
      ? (isDark ? "bg-brand-panel border-indigo-500/50 shadow-[0_0_15px_rgba(129,140,248,0.15)] scale-[1.01]" : "bg-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]")
      : (isDark ? "bg-transparent border-transparent hover:bg-brand-panel/30 hover:border-gray-800" : "bg-transparent border-transparent hover:bg-black/5 hover:border-cream-border");

    const hasComments = comments[block.id] && comments[block.id].length > 0;
    const unresolvedComments = hasComments ? comments[block.id].filter(c => !c.resolved).length : 0;

    return (
      <div 
        key={block.id} 
        onClick={() => handleBlockClick(block.id)}
        className={`${baseClass} ${highlightClass}`}
      >
        {/* Visual serial tag */}
        <span className="absolute top-2.5 right-3 text-[10px] font-mono font-medium text-gray-600 select-none">
          {block.id.toUpperCase()}
        </span>

        {/* Comment indicator badge on block */}
        {hasComments && (
          <span className={`absolute top-2.5 left-2.5 flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide ${unresolvedComments > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-brand-success/20 text-brand-success border border-brand-success/30'}`}>
            <MessageSquare className="w-3 h-3" />
            <span>{unresolvedComments}</span>
          </span>
        )}

        <div className={hasComments ? "pl-7 pt-1" : "pt-1"}>
          {block.type === 'heading' && (
            <div className={`font-display font-bold text-${metadata.alignment || 'left'} ${isDark ? 'text-white' : 'text-black'} ${
              metadata.level === 1 ? 'text-2xl' : metadata.level === 2 ? 'text-xl' : 'text-lg'
            }`}>
              {content || <span className="text-gray-600 italic">Empty Heading</span>}
            </div>
          )}

          {block.type === 'paragraph' && (
            <p className={`text-sm leading-relaxed text-${metadata.alignment || 'left'} ${isDark ? 'text-gray-300' : 'text-gray-900 font-medium'}`}>
              {content || <span className="text-gray-600 italic">Empty Paragraph</span>}
            </p>
          )}

          {block.type === 'quote' && (
            <blockquote className={`border-l-4 border-indigo-500 pl-4 py-1.5 italic rounded-r ${
              isDark ? 'text-gray-300 bg-brand-panel/40' : 'text-gray-900 bg-indigo-500/5'
            }`}>
              {content || 'Empty Quote'}
            </blockquote>
          )}

          {block.type === 'image' && (
            <div className="flex flex-col items-center my-2">
              <img src={content || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'} alt={metadata.caption || ''} className={`rounded border max-h-48 object-cover ${isDark ? 'border-gray-800' : 'border-cream-border'}`} />
              {metadata.caption && <span className="text-xs text-gray-500 mt-1">{metadata.caption}</span>}
            </div>
          )}

          {block.type === 'video' && (
            <div className={`flex items-center space-x-2 text-xs p-2.5 rounded border ${isDark ? 'text-gray-500 bg-black/40 border-gray-800' : 'text-gray-900 bg-cream-bg/40 border-cream-border'}`}>
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>YouTube Video Embed:</span>
              <a href={content} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline truncate max-w-xs">{content}</a>
            </div>
          )}

          {block.type === 'code' && (
            <div className={`font-mono text-xs p-3 rounded border overflow-x-auto ${
              isDark ? 'bg-brand-panel border-gray-800 text-green-400' : 'bg-white border-cream-border text-gray-900'
            }`}>
              <div className={`text-[10px] border-b pb-1 mb-2 ${isDark ? 'text-gray-500 border-gray-800' : 'text-[#4b4943] border-cream-border'}`}>{metadata.language || 'javascript'}</div>
              <pre>{content}</pre>
            </div>
          )}

          {block.type === 'divider' && (
            <hr className={`my-4 ${isDark ? 'border-gray-800' : 'border-cream-border'}`} />
          )}

          {block.type === 'list' && (
            <div className={`text-sm pl-4 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
              {Array.isArray(content) ? (
                <ul className={metadata.listType === 'ordered' ? 'list-decimal' : 'list-disc'}>
                  {content.map((item, i) => <li key={i} className="mb-0.5">{item}</li>)}
                </ul>
              ) : (
                <p>{content}</p>
              )}
            </div>
          )}

          {block.type === 'table' && (
            <div className={`overflow-x-auto border rounded my-2 text-xs ${isDark ? 'border-gray-800' : 'border-cream-border'}`}>
              <table className="w-full border-collapse">
                <tbody>
                  {Array.isArray(content) && content.map((row, r) => (
                    <tr key={r} className={`border-b ${isDark ? 'border-gray-800' : 'border-cream-border'}`}>
                      {Array.isArray(row) && row.map((cell, c) => (
                        <td key={c} className={`p-2 ${
                          r === 0 
                            ? (isDark ? 'bg-gray-900 font-bold text-white' : 'bg-[#f6f5f0] font-bold text-black') 
                            : (isDark ? 'text-gray-300' : 'text-gray-900')
                        }`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {block.type === 'embed' && (
            <div className={`flex items-center space-x-2 text-xs p-2.5 rounded border ${isDark ? 'text-gray-500 bg-black/40 border-gray-800' : 'text-gray-900 bg-cream-bg/40 border-cream-border'}`}>
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>General IFrame Link:</span>
              <a href={content} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline truncate max-w-xs">{content}</a>
            </div>
          )}

          {block.type === 'callout' && (
            <div className={`border-l-4 p-3 rounded-r ${
              isDark 
                ? (
                  metadata.variant === 'tip' ? 'bg-emerald-950/10 border-emerald-800 text-emerald-300' :
                  metadata.variant === 'warning' ? 'bg-amber-950/10 border-amber-800 text-amber-300' :
                  metadata.variant === 'danger' ? 'bg-red-950/10 border-red-800 text-red-300' :
                  'bg-blue-950/10 border-blue-800 text-blue-300'
                )
                : (
                  metadata.variant === 'tip' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 font-semibold' :
                  metadata.variant === 'warning' ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-semibold' :
                  metadata.variant === 'danger' ? 'bg-red-500/10 border-red-500 text-red-950 font-semibold' :
                  'bg-blue-500/10 border-blue-500 text-blue-950 font-semibold'
                )
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5">{metadata.variant || 'info'}</div>
              <div className="text-xs">{content}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      
      {/* Read-Only Article Reader Flow (Columns: 7) */}
      <div className="lg:col-span-7 space-y-2 max-h-[80vh] overflow-y-auto pr-2">
        <div className={`mb-6 pb-4 border-b ${isDark ? 'border-gray-800' : 'border-cream-border'}`}>
          <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Review Workspace (Read-Only)</div>
          <h1 className={`text-3xl font-extrabold font-display tracking-tight leading-tight ${isDark ? 'text-white' : 'text-black'}`}>{article.title}</h1>
        </div>
        
        {article.blocks && article.blocks.map(renderStaticBlock)}
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
