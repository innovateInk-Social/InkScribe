import { articleSchema } from '../schemas/articleSchema';
import { reviewSchema } from '../schemas/reviewSchema';

/**
 * Validator utility to run schemas checks on final serialized payloads
 * before autosave or publish dispatches.
 */

/**
 * Validates a Master Article Object.
 * @param {Object} article - The final article serialization object
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateArticle = (article) => {
  try {
    return articleSchema.validate(article);
  } catch (err) {
    return { valid: false, error: err.message || 'Unknown schema error during validation.' };
  }
};

/**
 * Validates Review comments mapping.
 * @param {Object} reviewData - Block comment threads mappings
 * @returns {Object} { valid: boolean, error: string|null }
 */
export const validateReview = (reviewData) => {
  try {
    return reviewSchema.validateReviewData(reviewData);
  } catch (err) {
    return { valid: false, error: err.message || 'Unknown review schema error.' };
  }
};
