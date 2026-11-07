import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Renders a LaTeX formula with KaTeX. Falls back to the raw text if the formula cannot be parsed.
export const KatexFormula: React.FC<{ latex: string; displayMode?: boolean }> = ({ latex, displayMode = true }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, { displayMode, throwOnError: false, output: 'html' });
    } catch {
      return null;
    }
  }, [latex, displayMode]);

  if (html === null) return <span className="font-mono">{latex}</span>;
  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
};
