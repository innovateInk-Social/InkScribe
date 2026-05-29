/**
 * Schema definitions for supported block types in the InnovateInk Editor.
 * Enforces strict typing, metadata shapes, and standard defaults.
 */
export const ALLOWED_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'quote',
  'image',
  'video',
  'code',
  'divider',
  'list',
  'table',
  'embed',
  'callout'
];

export const blockSchema = {
  validate: (block) => {
    if (!block || typeof block !== 'object') {
      return { valid: false, error: 'Block must be a non-null object' };
    }

    if (!block.id || !/^blk_\d{2}$/.test(block.id)) {
      return { valid: false, error: `Invalid or missing block ID: ${block.id || 'undefined'}. Must match blk_01 through blk_99.` };
    }

    if (!block.type || !ALLOWED_BLOCK_TYPES.includes(block.type)) {
      return { valid: false, error: `Unallowed block type: ${block.type || 'undefined'}` };
    }

    if (block.content === undefined || block.content === null) {
      return { valid: false, error: `Block content cannot be empty or null` };
    }

    // Specific block type validations
    switch (block.type) {
      case 'heading':
        if (typeof block.content !== 'string') {
          return { valid: false, error: 'Heading block content must be a string' };
        }
        if (block.metadata && block.metadata.level && ![1, 2, 3].includes(Number(block.metadata.level))) {
          return { valid: false, error: 'Heading metadata level must be 1, 2, or 3' };
        }
        break;

      case 'paragraph':
      case 'quote':
        if (typeof block.content !== 'string') {
          return { valid: false, error: `${block.type} content must be a string` };
        }
        break;

      case 'image':
      case 'video':
        if (typeof block.content !== 'string') {
          return { valid: false, error: `${block.type} source must be a string URL` };
        }
        break;

      case 'code':
        if (typeof block.content !== 'string') {
          return { valid: false, error: 'Code block content must be a string code template' };
        }
        break;

      case 'divider':
        // Divider typically has empty or static content
        break;

      case 'list':
        if (!Array.isArray(block.content)) {
          return { valid: false, error: 'List block content must be an array of list items' };
        }
        break;

      case 'table':
        if (!Array.isArray(block.content)) {
          return { valid: false, error: 'Table block content must be a two-dimensional grid array' };
        }
        break;

      case 'embed':
        if (typeof block.content !== 'string') {
          return { valid: false, error: 'Embed source must be a string URL or iframe element' };
        }
        break;

      case 'callout':
        if (typeof block.content !== 'string') {
          return { valid: false, error: 'Callout content must be a string' };
        }
        if (block.metadata && block.metadata.variant && !['info', 'tip', 'warning', 'danger'].includes(block.metadata.variant)) {
          return { valid: false, error: 'Callout variant must be info, tip, warning, or danger' };
        }
        break;

      default:
        break;
    }

    return { valid: true };
  }
};
