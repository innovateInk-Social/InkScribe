import { normalizeBlocks } from './normalizer';

/**
 * Serializer utility converting flat custom block arrays into:
 * 1. content_json: The master custom block array (validated and normalized).
 * 2. content_markdown: Clean, standard-conforming Markdown.
 * 3. content_html: Highly styled static cached HTML for public distribution.
 */

/**
 * Compiles a list of custom blocks into standard semantic Markdown.
 * @param {Array} blocks - Custom block list
 * @returns {string} Markdown document string
 */
export const blocksToMarkdown = (blocks = []) => {
  return blocks.map(block => {
    const content = block.content || '';
    const metadata = block.metadata || {};

    switch (block.type) {
      case 'heading': {
        const level = metadata.level || 1;
        const hashes = '#'.repeat(level);
        return `${hashes} ${content}\n\n`;
      }
      case 'paragraph':
        return `${content}\n\n`;
      case 'quote': {
        const author = metadata.author ? `\n> — *${metadata.author}*` : '';
        return `> ${content}${author}\n\n`;
      }
      case 'image': {
        const alt = metadata.caption || 'Image';
        return `![${alt}](${content})\n\n`;
      }
      case 'video':
        return `[Video embed: ${content}](${content})\n\n`;
      case 'code': {
        const lang = metadata.language || 'javascript';
        return `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
      }
      case 'divider':
        return `---\n\n`;
      case 'list': {
        const isOrdered = metadata.listType === 'ordered';
        if (Array.isArray(content)) {
          return content.map((item, idx) => {
            const prefix = isOrdered ? `${idx + 1}.` : '-';
            return `${prefix} ${item}`;
          }).join('\n') + '\n\n';
        }
        return `- ${content}\n\n`;
      }
      case 'table': {
        if (!Array.isArray(content) || content.length === 0) return '';
        // content format: [ [cell1, cell2], [cell3, cell4] ]
        const tableLines = [];
        content.forEach((row, rowIdx) => {
          if (!Array.isArray(row)) return;
          const pipeRow = '| ' + row.join(' | ') + ' |';
          tableLines.push(pipeRow);
          // Insert separator after header row
          if (rowIdx === 0) {
            const separator = '| ' + row.map(() => '---').join(' | ') + ' |';
            tableLines.push(separator);
          }
        });
        return tableLines.join('\n') + '\n\n';
      }
      case 'embed':
        return `[Embed Reference](${content})\n\n`;
      case 'callout': {
        const variant = (metadata.variant || 'info').toUpperCase();
        return `> [!${variant}]\n> ${content}\n\n`;
      }
      default:
        return '';
    }
  }).join('').trim();
};

/**
 * Compiles a list of custom blocks into highly styled read-only static HTML.
 * @param {Array} blocks - Custom block list
 * @returns {string} Highly structured cached HTML string
 */
export const blocksToHtml = (blocks = []) => {
  const htmlContent = blocks.map(block => {
    const content = block.content || '';
    const metadata = block.metadata || {};

    // Helper to sanitize inline tag styling or replace newlines with brs
    const formatInline = (text) => {
      if (typeof text !== 'string') return '';
      return text.replace(/\n/g, '<br />');
    };

    switch (block.type) {
      case 'heading': {
        const level = metadata.level || 1;
        const align = metadata.alignment || 'left';
        const classes = {
          1: 'text-3xl font-bold font-display text-white mt-8 mb-4 tracking-tight leading-tight',
          2: 'text-2xl font-semibold font-display text-white mt-6 mb-3 tracking-tight',
          3: 'text-xl font-medium font-display text-white mt-5 mb-2',
        }[level] || 'text-2xl font-semibold font-display text-white';
        return `<h${level} id="${block.id}" class="${classes} text-${align}">${formatInline(content)}</h${level}>`;
      }
      case 'paragraph': {
        const align = metadata.alignment || 'left';
        return `<p id="${block.id}" class="text-gray-300 text-base leading-relaxed mb-4 text-${align}">${formatInline(content)}</p>`;
      }
      case 'quote': {
        const escAuthor = (metadata.author || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const authorHtml = escAuthor
          ? `<footer class="mt-3 flex justify-end"><cite class="text-sm font-medium not-italic text-indigo-400/80">&mdash;&nbsp;${escAuthor}</cite></footer>`
          : '';
        return `<blockquote id="${block.id}" class="relative border-l-4 border-indigo-500 pl-5 py-3 pr-4 italic text-gray-300 bg-indigo-500/5 rounded-r-xl my-5 overflow-hidden">
          <span class="absolute left-3 top-0 text-5xl leading-none text-indigo-500/15 font-serif select-none">&ldquo;</span>
          <p class="relative z-10 m-0">${formatInline(content)}</p>
          ${authorHtml}
        </blockquote>`;
      }
      case 'image': {
        const caption = metadata.caption ? `<figcaption class="text-sm text-gray-400 mt-2 text-center">${metadata.caption}</figcaption>` : '';
        return `<figure id="${block.id}" class="my-6 flex flex-col items-center">
          <img src="${content}" alt="${metadata.caption || 'Article media'}" class="rounded-lg max-w-full h-auto border border-gray-800 shadow-md" />
          ${caption}
        </figure>`;
      }
      case 'video':
        return `<div id="${block.id}" class="my-6 overflow-hidden rounded-lg border border-gray-800 shadow-md max-w-2xl mx-auto">
          <video src="${content}" controls class="w-full h-auto bg-black"></video>
        </div>`;
      case 'code': {
        const lang = metadata.language || 'javascript';
        return `<div id="${block.id}" class="relative my-6 rounded-lg overflow-hidden border border-gray-800 shadow-lg font-mono text-sm bg-brand-panel">
          <div class="flex items-center justify-between px-4 py-1.5 bg-gray-900 border-b border-gray-800 text-xs text-gray-400">
            <span>${lang}</span>
          </div>
          <pre class="p-4 overflow-x-auto text-green-400"><code class="language-${lang}">${content}</code></pre>
        </div>`;
      }
      case 'divider':
        return `<hr id="${block.id}" class="border-gray-800 my-8" />`;
      case 'list': {
        const tag = metadata.listType === 'ordered' ? 'ol' : 'ul';
        const listClass = tag === 'ol' ? 'list-decimal' : 'list-disc';
        if (Array.isArray(content)) {
          const listItems = content.map(item => `<li class="mb-1.5">${formatInline(item)}</li>`).join('');
          return `<${tag} id="${block.id}" class="${listClass} list-inside pl-5 mb-4 text-gray-300">${listItems}</${tag}>`;
        }
        return `<${tag} id="${block.id}" class="${listClass} list-inside pl-5 mb-4 text-gray-300"><li class="mb-1.5">${formatInline(content)}</li></${tag}>`;
      }
      case 'table': {
        if (!Array.isArray(content) || content.length === 0) return '';
        const rows = content.map((row, rowIdx) => {
          if (!Array.isArray(row)) return '';
          const cellTag = rowIdx === 0 ? 'th' : 'td';
          const cellClass = rowIdx === 0 
            ? 'px-4 py-2 border-b border-gray-800 bg-gray-900 font-medium text-left text-white' 
            : 'px-4 py-2 border-b border-gray-800 text-gray-300';
          const cells = row.map(cell => `<${cellTag} class="${cellClass}">${formatInline(cell)}</${cellTag}>`).join('');
          return `<tr class="hover:bg-brand-panel/20 transition-colors">${cells}</tr>`;
        }).join('');
        return `<div id="${block.id}" class="my-6 overflow-x-auto rounded-lg border border-gray-800">
          <table class="w-full border-collapse text-sm">${rows}</table>
        </div>`;
      }
      case 'embed': {
        // Embed block formats as sandboxed iframe
        return `<div id="${block.id}" class="my-6 overflow-hidden rounded-lg border border-gray-800 aspect-video max-w-2xl mx-auto shadow-md">
          <iframe src="${content}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>`;
      }
      case 'callout': {
        const variant = metadata.variant || 'info';
        const colors = {
          info: 'bg-blue-900/10 border-blue-800 text-blue-300',
          tip: 'bg-emerald-900/10 border-emerald-800 text-emerald-300',
          warning: 'bg-amber-900/10 border-amber-800 text-amber-300',
          danger: 'bg-red-900/10 border-red-800 text-red-300',
        }[variant] || 'bg-blue-900/10 border-blue-800 text-blue-300';

        const label = variant.charAt(0).toUpperCase() + variant.slice(1);
        return `<div id="${block.id}" class="border-l-4 p-4 rounded-r my-4 ${colors}">
          <div class="font-bold text-xs uppercase mb-1 tracking-wider">${label}</div>
          <div class="text-sm font-sans leading-relaxed">${formatInline(content)}</div>
        </div>`;
      }
      default:
        return '';
    }
  }).join('');

  // Embed within a basic, gorgeous HTML shell representing public styling
  return `<article class="innovateink-public-article font-sans max-w-3xl mx-auto py-8 px-4 bg-brand-bg text-gray-200">
    ${htmlContent}
  </article>`;
};

/**
 * Orchestrates complete serialization of raw blocks array.
 * @param {Array} rawBlocks - Raw editor blocks
 * @returns {Object} Serialized format block package
 */
export const serializeArticleContent = (rawBlocks = []) => {
  // Normalize block properties first
  const content_json = normalizeBlocks(rawBlocks);

  // Output full serialization compilation
  return {
    content_json,
    content_markdown: blocksToMarkdown(content_json),
    content_html: blocksToHtml(content_json)
  };
};
