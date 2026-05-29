// Shared block creation + text extraction utilities

export const makeBlockNode = (type, text = '') => {
  const t = text ? [{ type: 'text', text }] : [];
  const p = [{ type: 'paragraph', content: t }];
  switch (type) {
    case 'paragraph':   return { type: 'paragraph', content: t };
    case 'h1':          return { type: 'heading', attrs: { level: 1 }, content: t };
    case 'h2':          return { type: 'heading', attrs: { level: 2 }, content: t };
    case 'h3':          return { type: 'heading', attrs: { level: 3 }, content: t };
    case 'quote':       return { type: 'blockquote', content: p };
    case 'code':        return { type: 'codeBlock', attrs: { language: 'javascript' }, content: t };
    case 'bulletList':  return { type: 'bulletList',  content: [{ type: 'listItem',  content: p }] };
    case 'orderedList': return { type: 'orderedList', content: [{ type: 'listItem',  content: p }] };
    case 'taskList':    return { type: 'taskList',    content: [{ type: 'taskItem', attrs: { checked: false }, content: p }] };
    case 'divider':     return { type: 'horizontalRule' };
    default:
      if (type.startsWith('callout-')) return { type: 'blockquote', attrs: { class: type }, content: p };
      return { type: 'paragraph', content: t };
  }
};

export const getBlockText = (node) => {
  if (!node?.content) return '';
  return node.content.map(c => c.type === 'text' ? c.text : getBlockText(c)).join('');
};

// Returns YouTube embed URL from any YouTube URL format or embed code snippet
export const toYoutubeEmbed = (input) => {
  if (!input) return null;
  // Already embed URL
  if (input.includes('youtube.com/embed/')) {
    const m = input.match(/youtube\.com\/embed\/([^?"&]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  // watch?v=
  const watchM = input.match(/[?&]v=([^&"]+)/);
  if (watchM) return `https://www.youtube.com/embed/${watchM[1]}`;
  // youtu.be/
  const shortM = input.match(/youtu\.be\/([^?"&\s]+)/);
  if (shortM) return `https://www.youtube.com/embed/${shortM[1]}`;
  // embed code snippet — extract src
  const srcM = input.match(/src=["']([^"']+)["']/);
  if (srcM) return toYoutubeEmbed(srcM[1]);
  return null;
};

// Get current block index from editor state
export const getCurrentBlockIndex = (editor) => {
  if (!editor) return 0;
  try {
    const { $from } = editor.state.selection;
    return $from.index(0);
  } catch { return 0; }
};
