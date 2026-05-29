import { Mark, mergeAttributes } from '@tiptap/core';

export const AiGeneratedMark = Mark.create({
  name: 'aiGenerated',

  addOptions() {
    return {
      HTMLAttributes: {
        'data-ai': 'true',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-ai="true"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});
