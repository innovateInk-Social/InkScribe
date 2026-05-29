import React from 'react';
import { BubbleMenu } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, RefreshCw, Download, Trash2, MessageSquare } from 'lucide-react';

/**
 * ImageBar — appears when an image or imageBlock is selected.
 * Icon-only: align  · caption toggle · replace · download · delete
 */
export default function ImageBar({ editor }) {
  if (!editor) return null;

  const isBlock = editor.isActive('imageBlock');
  const isImg   = editor.isActive('image');

  const toggleCaption = () => {
    if (isBlock) {
      const { showCaption } = editor.getAttributes('imageBlock');
      editor.chain().focus().updateAttributes('imageBlock', { showCaption: !showCaption }).run();
    } else {
      const { title } = editor.getAttributes('image');
      editor.chain().focus().updateAttributes('image', { title: title ? '' : 'Caption…' }).run();
    }
  };

  const replaceImage = () => {
    const url = prompt('New image URL:', isBlock
      ? editor.getAttributes('imageBlock').src
      : editor.getAttributes('image').src || '');
    if (!url) return;
    if (isBlock) editor.chain().focus().updateAttributes('imageBlock', { src: url }).run();
    else editor.chain().focus().setImage({ src: url }).run();
  };

  const downloadImage = () => {
    const src = isBlock ? editor.getAttributes('imageBlock').src : editor.getAttributes('image').src;
    if (!src) return;
    const a = Object.assign(document.createElement('a'), { href: src, download: src.split('/').pop() || 'image', target: '_blank' });
    a.click();
  };

  const captionActive = isBlock
    ? !!editor.getAttributes('imageBlock').showCaption
    : !!editor.getAttributes('image').title;

  const b = (on = false) => `p-1.5 rounded transition-all ${on ? 'bg-indigo-500/25 text-indigo-300' : 'text-gray-400 hover:text-white hover:bg-white/8'}`;

  return (
    <BubbleMenu editor={editor}
      tippyOptions={{ duration: 120, placement: 'top', offset: [0, 10] }}
      shouldShow={({ editor }) => editor.isActive('imageBlock') || editor.isActive('image')}>
      <div className="flex items-center gap-px px-1.5 py-1 rounded-xl border border-white/10 shadow-2xl select-none"
        style={{ background: 'rgba(10,14,23,0.97)', backdropFilter: 'blur(20px)' }}
        onMouseDown={e => e.preventDefault()}>

        {/* Alignment — only for old image nodes (imageBlock uses drag/handle) */}
        {isImg && <>
          <button title="Align left"  onClick={() => editor.chain().focus().updateAttributes('image', { style: 'display:block;margin:0 auto 0 0' }).run()} className={b()}><AlignLeft  className="w-3.5 h-3.5"/></button>
          <button title="Center"      onClick={() => editor.chain().focus().updateAttributes('image', { style: 'display:block;margin:0 auto'    }).run()} className={b()}><AlignCenter className="w-3.5 h-3.5"/></button>
          <button title="Align right" onClick={() => editor.chain().focus().updateAttributes('image', { style: 'display:block;margin:0 0 0 auto' }).run()} className={b()}><AlignRight className="w-3.5 h-3.5"/></button>
          <div className="w-px h-4 bg-white/10 mx-1"/>
        </>}

        {/* Caption toggle */}
        <button title={captionActive ? 'Hide caption' : 'Show caption'} onClick={toggleCaption} className={b(captionActive)}>
          <MessageSquare className="w-3.5 h-3.5"/>
        </button>
        <div className="w-px h-4 bg-white/10 mx-1"/>

        {/* Replace */}
        <button title="Replace image" onClick={replaceImage} className={b()}><RefreshCw className="w-3.5 h-3.5"/></button>
        {/* Download */}
        <button title="Download"      onClick={downloadImage} className={b()}><Download  className="w-3.5 h-3.5"/></button>
        <div className="w-px h-4 bg-white/10 mx-1"/>

        {/* Delete */}
        <button title="Delete image" onClick={() => editor.chain().focus().deleteSelection().run()}
          className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </BubbleMenu>
  );
}
