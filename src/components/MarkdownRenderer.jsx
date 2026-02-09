import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/**
 * MarkdownRenderer - A reusable component for rendering markdown content
 * with consistent styling across the application.
 *
 * @param {string} content - The markdown content to render
 * @param {string} size - Size variant: "sm" (default), "xs" (smaller text)
 * @param {string} className - Additional CSS classes for the wrapper
 * @param {boolean} breaks - Whether to convert soft line breaks to <br> (default: true).
 *   Set to false for structured markdown files where standard paragraph spacing is preferred.
 */
const MarkdownRenderer = ({ content, size = "sm", className = "", breaks = true }) => {
  const isExtraSmall = size === "xs";

  // Base text size classes
  const textSize = isExtraSmall ? "text-xs" : "text-sm";
  const proseSize = isExtraSmall ? "prose-xs" : "prose-sm";

  // Preprocess content to handle any encoding issues
  // Decode HTML entities if present (e.g., &#96; -> `)
  const preprocessedContent = content
    ? content.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
             .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    : '';

  // Component styles based on size
  const components = {
    // Headings
    h1: ({ _node, children, ...props }) => (
      <h1
        className={`font-bold text-dark-100 ${
          isExtraSmall ? "text-base mt-3 mb-1.5" : "text-2xl mt-6 mb-3"
        }`}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ _node, children, ...props }) => (
      <h2
        className={`font-semibold text-dark-100 ${
          isExtraSmall ? "text-sm mt-3 mb-1" : "text-xl mt-5 mb-2"
        }`}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ _node, children, ...props }) => (
      <h3
        className={`font-semibold text-dark-100 ${
          isExtraSmall ? "text-xs mt-2 mb-1" : "text-lg mt-4 mb-2"
        }`}
        {...props}
      >
        {children}
      </h3>
    ),

    // Paragraphs
    p: ({ _node, ...props }) => (
      <p
        className={`${textSize} text-dark-200 mb-3 last:mb-0 leading-relaxed`}
        {...props}
      />
    ),

    // Lists
    ul: ({ _node, ...props }) => {
      // Check if this is nested by examining parent structure
      let depth = 0;
      let parent = _node?.parent;
      while (parent) {
        if (parent.type === "listItem") depth++;
        parent = parent.parent;
      }
      const marginClass = depth > 0 ? "ml-4 mt-1" : "ml-4";
      return (
        <ul
          className={`list-disc list-outside ${marginClass} ${textSize} text-dark-200 mb-2 space-y-1 last:mb-0`}
          {...props}
        />
      );
    },
    ol: ({ _node, ...props }) => {
      // Check if this is nested by examining parent structure
      let depth = 0;
      let parent = _node?.parent;
      while (parent) {
        if (parent.type === "listItem") depth++;
        parent = parent.parent;
      }
      const marginClass = depth > 0 ? "ml-4 mt-1" : "ml-4";
      return (
        <ol
          className={`list-decimal list-outside ${marginClass} ${textSize} text-dark-200 mb-2 space-y-1 last:mb-0`}
          {...props}
        />
      );
    },
    li: ({ _node, ...props }) => {
      // Ensure list items can contain nested lists properly
      return (
        <li className={`${textSize} text-dark-200`} {...props} />
      );
    },

    // Code - in react-markdown v10+, the `inline` prop was removed.
    // Inline backticks render as bare <code>; fenced blocks render as <pre><code>.
    // Always style <code> as inline; <pre> handles block-level wrapping.
    code: ({ _node, children, ...props }) => {
      // Clean up any stray backticks that might appear in the children
      // This handles edge cases where markdown parsing might include backticks
      const cleanChildren = typeof children === 'string' 
        ? children.replace(/^`+|`+$/g, '') 
        : children;
      
      return (
        <code
          className={`bg-dark-900 px-1.5 py-0.5 rounded text-primary-400 ${textSize} font-mono whitespace-nowrap`}
          {...props}
        >
          {cleanChildren}
        </code>
      );
    },
    // Pre wraps fenced code blocks - provides block-level styling
    pre: ({ _node, ...props }) => (
      <pre
        className={`bg-dark-900 p-3 rounded text-primary-400 ${textSize} font-mono overflow-x-auto mb-2 [&>code]:p-0 [&>code]:whitespace-pre`}
        {...props}
      />
    ),

    // Blockquote
    blockquote: ({ _node, ...props }) => (
      <blockquote
        className="border-l-4 border-dark-600 pl-4 italic text-dark-300 mb-2"
        {...props}
      />
    ),

    // Horizontal rule
    hr: ({ _node, ...props }) => (
      <hr
        className={`border-dark-700 ${isExtraSmall ? "my-2" : "my-3"}`}
        {...props}
      />
    ),

    // Text formatting
    strong: ({ _node, ...props }) => (
      <strong className="font-semibold text-dark-100" {...props} />
    ),
    em: ({ _node, ...props }) => (
      <em className="italic text-dark-200" {...props} />
    ),

    // Links
    a: ({ _node, children, ...props }) => (
      <a
        className="text-primary-400 hover:text-primary-300 underline"
        {...props}
      >
        {children}
      </a>
    ),

    // Tables
    table: ({ _node, ...props }) => (
      <table
        className={`w-full border-collapse border border-dark-700 ${
          isExtraSmall ? "my-2" : "my-3"
        }`}
        {...props}
      />
    ),
    thead: ({ _node, ...props }) => (
      <thead className="bg-dark-900" {...props} />
    ),
    tbody: ({ _node, ...props }) => <tbody {...props} />,
    tr: ({ _node, ...props }) => (
      <tr className="border-b border-dark-700" {...props} />
    ),
    th: ({ _node, ...props }) => (
      <th
        className={`border border-dark-700 ${
          isExtraSmall ? "px-2 py-1" : "px-3 py-1.5"
        } text-left font-semibold text-dark-100 bg-dark-900 ${textSize}`}
        {...props}
      />
    ),
    td: ({ _node, ...props }) => (
      <td
        className={`border border-dark-700 ${
          isExtraSmall ? "px-2 py-1" : "px-3 py-1.5"
        } text-dark-200 ${textSize}`}
        {...props}
      />
    ),
  };

  return (
    <div
      className={`prose prose-invert ${proseSize} max-w-none text-dark-200 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={breaks ? [remarkGfm, remarkBreaks] : [remarkGfm]}
        components={components}
      >
        {preprocessedContent}
      </ReactMarkdown>
    </div>
  );
};

MarkdownRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["sm", "xs"]),
  className: PropTypes.string,
  breaks: PropTypes.bool,
};

export default MarkdownRenderer;
