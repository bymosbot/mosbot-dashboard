import { useMemo } from "react";
import PropTypes from "prop-types";

/**
 * JsonBlock - Renders JSON with formatted display and simple syntax highlighting.
 * Used when content is detected as valid JSON to improve readability.
 */
function JsonBlock({ content, className = "" }) {
  const { formatted, error } = useMemo(() => {
    try {
      const trimmed = typeof content === "string" ? content.trim() : String(content);
      if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) {
        return { formatted: null, error: "Not JSON" };
      }
      const parsed = JSON.parse(trimmed);
      const formatted = JSON.stringify(parsed, null, 2);
      return { formatted, error: null };
    } catch {
      return { formatted: null, error: "Invalid JSON" };
    }
  }, [content]);

  if (error || !formatted) {
    return null;
  }

  // Simple syntax-highlighted JSON rendering (keys, strings, numbers, booleans, null)
  const tokens = [];
  let i = 0;
  const len = formatted.length;

  while (i < len) {
    const c = formatted[i];

    if (c === '"') {
      const start = i;
      i++;
      while (i < len && formatted[i] !== '"') {
        if (formatted[i] === "\\") i++;
        i++;
      }
      if (i < len) i++;
      const str = formatted.slice(start, i);
      const isKey = formatted[i] === ":" || (formatted.slice(i).match(/^\s*:/));
      tokens.push({
        type: isKey ? "key" : "string",
        value: str,
      });
      continue;
    }

    if (/[0-9-]/.test(c) && (c === "-" || /[0-9]/.test(c))) {
      let start = i;
      if (c === "-") i++;
      while (i < len && /[0-9.eE+-]/.test(formatted[i])) i++;
      tokens.push({ type: "number", value: formatted.slice(start, i) });
      continue;
    }

    if (formatted.slice(i, i + 4) === "true") {
      tokens.push({ type: "boolean", value: "true" });
      i += 4;
      continue;
    }
    if (formatted.slice(i, i + 5) === "false") {
      tokens.push({ type: "boolean", value: "false" });
      i += 5;
      continue;
    }
    if (formatted.slice(i, i + 4) === "null") {
      tokens.push({ type: "null", value: "null" });
      i += 4;
      continue;
    }

    tokens.push({ type: "plain", value: c });
    i++;
  }

  const colorMap = {
    key: "text-primary-400",
    string: "text-emerald-400",
    number: "text-amber-400",
    boolean: "text-violet-400",
    null: "text-dark-500",
    plain: "text-dark-300",
  };

  return (
    <div
      className={`rounded-lg border border-dark-700 bg-dark-900 overflow-x-auto ${className}`}
      data-block-type="json"
    >
      <pre className="px-4 py-3 text-sm font-mono whitespace-pre m-0">
        {tokens.map((t, idx) => (
          <span key={idx} className={colorMap[t.type] || colorMap.plain}>
            {t.value}
          </span>
        ))}
      </pre>
    </div>
  );
}

JsonBlock.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  className: PropTypes.string,
};

export default JsonBlock;
