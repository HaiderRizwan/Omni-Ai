import React from 'react';

// Simple client-side formatter to render server-cleaned text with visual hierarchy
// Rules applied here:
// - Lines that look like headings (ALL CAPS line) → render as bold heading
// - Bullet lines starting with '-' or a number+dot → render as list items
// - Preserve paragraphs

const isHeading = (line) => {
  const trimmed = line.trim();
  if (trimmed.length < 3) return false;
  // Consider a heading if majority is uppercase or contains typical heading separators
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upperRatio = letters.split('').filter(c => c === c.toUpperCase()).length / letters.length;
  return upperRatio > 0.8 || /[:\-–—]$/.test(trimmed);
};

const splitIntoBlocks = (text) => {
  const lines = text.split(/\n/);
  const blocks = [];
  let currentList = null;

  const flushList = () => {
    if (currentList && currentList.items.length) {
      blocks.push({ type: 'list', ordered: currentList.ordered, items: currentList.items });
    }
    currentList = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      blocks.push({ type: 'spacer' });
      continue;
    }

    const bulletMatch = line.match(/^[-\u2022]\s+(.*)$/); // - or •
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (!currentList) currentList = { ordered: false, items: [] };
      currentList.items.push(bulletMatch[1]);
      continue;
    }
    if (orderedMatch) {
      if (!currentList) currentList = { ordered: true, items: [] };
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    flushList();

    if (isHeading(line)) {
      blocks.push({ type: 'heading', text: line.trim() });
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  flushList();
  return blocks.filter((b, i, arr) => !(b.type === 'spacer' && (i === 0 || (arr[i - 1] && arr[i - 1].type === 'spacer'))));
};

const FormattedMessage = ({ text }) => {
  if (!text) return null;
  const blocks = splitIntoBlocks(text);

  const renderListItem = (content, key) => {
    const parts = String(content).split(/:\s*/);
    if (parts.length > 1) {
      const label = parts.shift();
      const rest = parts.join(': ');
      return (
        <li key={key}>
          <span className="font-semibold text-gray-100">{label}:</span>{' '}<span className="text-gray-200">{rest}</span>
        </li>
      );
    }
    return <li key={key}>{content}</li>;
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="font-extrabold text-gray-100 tracking-wide text-lg md:text-xl">
              {block.text}
            </div>
          );
        }
        if (block.type === 'paragraph') {
          return (
            <div key={idx} className="text-gray-200">
              {block.text}
            </div>
          );
        }
        if (block.type === 'list') {
          return block.ordered ? (
            <ol key={idx} className="list-decimal list-inside space-y-1">
              {block.items.map((it, i) => renderListItem(it, i))}
            </ol>
          ) : (
            <ul key={idx} className="list-disc list-inside space-y-1">
              {block.items.map((it, i) => renderListItem(it, i))}
            </ul>
          );
        }
        return <div key={idx} className="h-2" />;
      })}
    </div>
  );
};

export default FormattedMessage;


