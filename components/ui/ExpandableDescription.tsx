'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface ExpandableDescriptionProps {
  description: string;
  /** Number of characters before truncation. Default 300 */
  maxLength?: number;
}

export default function ExpandableDescription({ description, maxLength = 300 }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const needsTruncation = description.length > maxLength;

  // Measure the full content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [description]);

  if (!description) {
    return (
      <p className="text-gray-400 italic text-sm">No description available yet.</p>
    );
  }

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="text-gray-600 leading-relaxed transition-[max-height] duration-500 ease-in-out overflow-hidden"
        style={{
          maxHeight: !needsTruncation
            ? 'none'
            : expanded
              ? `${(contentHeight ?? 1000) + 40}px`
              : '120px',
        }}
      >
        <ReactMarkdown
          components={{
            a: ({ ...props }) => (
              <a
                {...props}
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            p: ({ ...props }) => (
              <p {...props} className="mb-3 last:mb-0" />
            ),
          }}
        >
          {description}
        </ReactMarkdown>
      </div>

      {/* Gradient fade overlay when collapsed */}
      {needsTruncation && !expanded && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, white 0%, transparent 100%)',
          }}
        />
      )}

      {/* Toggle button */}
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-bold text-gray-900 hover:text-gray-600 transition-colors flex items-center gap-1.5 group"
        >
          <span className="border-b-2 border-dashed border-gray-300 group-hover:border-gray-500 transition-colors">
            {expanded ? 'Show Less' : 'Read More'}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}
