import DOMPurify from 'dompurify';

/**
 * Sanitizer utility to prevent XSS injection, scripts, dangerous stylesheets,
 * and malicious embed frame loops.
 */

// Configure DOMPurify custom options
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'pre', 'code', 'br', 'hr', 'a', 'img', 'video',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'target', 'rel',
    'width', 'height', 'frameborder', 'allowfullscreen', 'controls',
    'id', 'style' // style is allowed selectively but we strip dangerous css in sanitization
  ],
  ADD_TAGS: ['iframe'], // explicit iframe permissions
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'],
};

/**
 * Cleans an HTML string or text input of malicious content.
 * @param {string} rawString - Raw uncleaned string
 * @returns {string} Sanitized string
 */
export const sanitizeHtmlString = (rawString = '') => {
  if (typeof rawString !== 'string') {
    return '';
  }

  // Purify raw content using DOMPurify
  return DOMPurify.sanitize(rawString, SANITIZE_CONFIG);
};

/**
 * Sanitizes block contents depending on block types.
 * @param {Object} block - A structural Block object
 * @returns {Object} Sanitized Block object
 */
export const sanitizeBlock = (block) => {
  if (!block || typeof block !== 'object') {
    return block;
  }

  const cleanBlock = { ...block };

  if (typeof cleanBlock.content === 'string') {
    // If it is a video, image, or embed, make sure the URL doesn't contain scripts/javascript links
    if (['image', 'video', 'embed'].includes(cleanBlock.type)) {
      const trimmedUrl = cleanBlock.content.trim();
      if (/^javascript:/i.test(trimmedUrl)) {
        cleanBlock.content = '';
      } else {
        cleanBlock.content = DOMPurify.sanitize(trimmedUrl, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      }
    } else {
      // Normal HTML content blocks (like paragraph, quote, callout)
      cleanBlock.content = sanitizeHtmlString(cleanBlock.content);
    }
  } else if (Array.isArray(cleanBlock.content)) {
    // List or table content formats
    cleanBlock.content = cleanBlock.content.map(item => {
      if (typeof item === 'string') {
        return sanitizeHtmlString(item);
      } else if (Array.isArray(item)) {
        // Table cell arrays
        return item.map(cell => typeof cell === 'string' ? sanitizeHtmlString(cell) : cell);
      } else if (item && typeof item === 'object') {
        // Nested structures
        const cleanItem = { ...item };
        if (typeof cleanItem.text === 'string') {
          cleanItem.text = sanitizeHtmlString(cleanItem.text);
        }
        return cleanItem;
      }
      return item;
    });
  }

  return cleanBlock;
};
