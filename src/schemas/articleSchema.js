import { blockSchema } from './blockSchema';

/**
 * Validation schema for the entire article JSON structure.
 * Every article loaded/saved in the system must match this blueprint.
 */
export const articleSchema = {
  validate: (article) => {
    if (!article || typeof article !== 'object') {
      return { valid: false, error: 'Article must be a non-null object' };
    }

    if (!article.article_id) {
      return { valid: false, error: 'Missing required field: article_id' };
    }

    if (article.version !== undefined && typeof article.version !== 'number') {
      return { valid: false, error: 'Article version must be a numeric value' };
    }

    if (article.title && typeof article.title !== 'string') {
      return { valid: false, error: 'Article title must be a string value' };
    }

    if (!Array.isArray(article.blocks)) {
      return { valid: false, error: 'Article blocks must be an array collection' };
    }

    if (article.blocks.length > 99) {
      return { valid: false, error: `Article block count of ${article.blocks.length} exceeds the structural ceiling limit of 99 blocks.` };
    }

    // Validate each child block
    for (let i = 0; i < article.blocks.length; i++) {
      const blockResult = blockSchema.validate(article.blocks[i]);
      if (!blockResult.valid) {
        return { valid: false, error: `Block index ${i} failure: ${blockResult.error}` };
      }
    }

    return { valid: true };
  }
};
