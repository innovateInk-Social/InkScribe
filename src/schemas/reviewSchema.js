/**
 * Validation schema for the active comment systems in Review Mode.
 * Aligns comments directly with sequential serial block IDs (blk_01 to blk_99).
 */
export const reviewSchema = {
  validateComment: (comment) => {
    if (!comment || typeof comment !== 'object') {
      return { valid: false, error: 'Comment must be a non-null object' };
    }

    if (!comment.author || typeof comment.author !== 'string') {
      return { valid: false, error: 'Comment author is required and must be a string' };
    }

    if (!comment.message || typeof comment.message !== 'string') {
      return { valid: false, error: 'Comment message is required and must be a string' };
    }

    return { valid: true };
  },

  validateReviewData: (reviewData) => {
    if (!reviewData || typeof reviewData !== 'object') {
      return { valid: false, error: 'Review data must be a key-value object of block IDs' };
    }

    const keys = Object.keys(reviewData);
    for (const key of keys) {
      if (!/^blk_\d{2}$/.test(key)) {
        return { valid: false, error: `Invalid block ID reference in comment key: ${key}` };
      }

      const commentsArray = reviewData[key];
      if (!Array.isArray(commentsArray)) {
        return { valid: false, error: `Comments mapping for block ${key} must be an array` };
      }

      for (let i = 0; i < commentsArray.length; i++) {
        const checkResult = reviewSchema.validateComment(commentsArray[i]);
        if (!checkResult.valid) {
          return { valid: false, error: `Comment index ${i} under block ${key} failed: ${checkResult.error}` };
        }
      }
    }

    return { valid: true };
  }
};
