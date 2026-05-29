/**
 * Normalizer pipeline utility.
 * Enforces the 99-block ceiling and assigns serial block IDs (blk_01 to blk_99)
 * STRICTLY by position order in the array.
 *
 * KEY RULE: Serial numbers always reflect the block's current visual position.
 * If a block moves from position 40 → 3, it becomes blk_03 and all blocks
 * between positions 3 and 40 get shifted up by one (blk_03 → blk_04, etc.).
 *
 * This is a full sequential re-assignment on every normalize call.
 */

/**
 * Normalizes an array of blocks by strictly assigning serial IDs based on position.
 * @param {Array} blocks - Raw input blocks (may already have IDs)
 * @returns {Array} Clean, normalized blocks with position-correct serial IDs
 */
export const normalizeBlocks = (blocks = []) => {
  if (!Array.isArray(blocks)) return [];

  // 1. Enforce strict 99-block ceiling
  const list = blocks.slice(0, 99);

  // 2. Reassign serial IDs strictly by position (1-indexed, zero-padded to 2 digits)
  return list.map((block, index) => {
    const positionId = `blk_${String(index + 1).padStart(2, '0')}`;

    if (!block || typeof block !== 'object') {
      return {
        id: positionId,
        type: 'paragraph',
        content: '',
        metadata: {}
      };
    }

    // Ensure content and metadata are valid
    let content = block.content;
    if (content === undefined || content === null) {
      content = '';
    }

    const metadata = block.metadata && typeof block.metadata === 'object'
      ? { ...block.metadata }
      : {};

    return {
      id: positionId,
      type: block.type || 'paragraph',
      content,
      metadata
    };
  });
};
