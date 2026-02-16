import { useMemo } from "react";
import PropTypes from "prop-types";
import JsonBlock from "./JsonBlock";
import TerminalBlock from "./TerminalBlock";

/**
 * Detects if content is valid JSON (object or array).
 */
function looksLikeJson(str) {
  const trimmed = typeof str === "string" ? str.trim() : "";
  return (trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length > 1;
}

/**
 * Detects if content looks like terminal/shell output.
 * Heuristics: ls -la style (total N, permission strings), or multi-line command output.
 */
function looksLikeTerminalOutput(str) {
  const trimmed = typeof str === "string" ? str.trim() : "";
  if (!trimmed || trimmed.length < 10) return false;

  // ls -la style: starts with "total " followed by a number
  if (/^total\s+\d+/.test(trimmed)) return true;

  // Permission strings (drwxrwsr-x, -rw-r--r--, etc.)
  if (/\b(drwx|-rw-)[rwsx-]{6,9}\s+\d+/.test(trimmed)) return true;

  // Multiple lines with shell prompt characters ($ % # >), not just digits (avoids matching "4. Item" lists)
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length >= 2 && lines.some((l) => /^\s*[$%#>]\s*/.test(l))) {
    return true;
  }

  return false;
}

/**
 * SmartContentBlock - Detects content type and renders JSON or terminal blocks
 * with appropriate formatting. Falls through to children for normal content.
 */
function SmartContentBlock({ content, children, fallback }) {
  const { type, renderBlock } = useMemo(() => {
    const str = typeof content === "string" ? content : String(content || "");
    const trimmed = str.trim();

    if (looksLikeJson(trimmed)) {
      try {
        JSON.parse(trimmed);
        return { type: "json", renderBlock: true };
      } catch {
        // Not valid JSON, fall through
      }
    }

    if (looksLikeTerminalOutput(trimmed)) {
      return { type: "terminal", renderBlock: true };
    }

    return { type: "default", renderBlock: false };
  }, [content]);

  if (renderBlock && type === "json") {
    return <JsonBlock content={content} className="mb-3 last:mb-0" />;
  }

  if (renderBlock && type === "terminal") {
    return <TerminalBlock content={content} className="mb-3 last:mb-0" />;
  }

  return fallback ?? children ?? null;
}

SmartContentBlock.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.node,
  fallback: PropTypes.node,
};

export default SmartContentBlock;
