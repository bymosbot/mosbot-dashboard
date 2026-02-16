import { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkFrontmatter from "remark-frontmatter";
import { getWorkspaceFileUrl, isWorkspaceFilePath } from "../utils/helpers";
import SmartContentBlock from "./SmartContentBlock";
import JsonBlock from "./JsonBlock";
import TerminalBlock from "./TerminalBlock";

/**
 * Extracts plain text from React children (for paragraph content).
 */
function getTextFromChildren(children) {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getTextFromChildren).join("");
  if (children?.props?.children != null) return getTextFromChildren(children.props.children);
  return "";
}

/**
 * MarkdownRenderer - A reusable component for rendering markdown content
 * with consistent styling across the application.
 *
 * Features:
 * - Supports GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)
 * - Automatically strips YAML frontmatter (e.g., for markdown files with metadata)
 * - Configurable line break handling
 *
 * @param {string} content - The markdown content to render
 * @param {string} size - Size variant: "sm" (default), "xs" (smaller text)
 * @param {string} className - Additional CSS classes for the wrapper
 * @param {boolean} breaks - Whether to convert soft line breaks to <br> (default: true).
 *   Set to false for structured markdown files where standard paragraph spacing is preferred.
 * @param {string} workspaceBaseUrl - Optional base URL for workspace file links (default: '/workspaces'). Use '/docs' for docs pages.
 */
const MarkdownRenderer = ({ content, size = "sm", className = "", breaks = true, workspaceBaseUrl = '/workspaces' }) => {
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

  // Memoize components to prevent react-markdown from remounting all children
  // on every render, which can trigger "Maximum update depth exceeded" errors.
  const components = useMemo(() => ({
    // Headings - check for JSON/terminal content first
    h1: ({ node: _node, children, ...props }) => {
      const text = getTextFromChildren(children)?.trim() ?? "";
      const h1El = (
        <h1
          className={`font-bold text-dark-100 ${
            isExtraSmall ? "text-base mt-3 mb-1.5" : "text-2xl mt-6 mb-3"
          }`}
          {...props}
        >
          {children}
        </h1>
      );
      if (!text || text.length > 50000) return h1El;
      return <SmartContentBlock content={text} fallback={h1El} />;
    },
    h2: ({ node: _node, children, ...props }) => {
      const text = getTextFromChildren(children)?.trim() ?? "";
      const h2El = (
        <h2
          className={`font-semibold text-dark-100 ${
            isExtraSmall ? "text-sm mt-3 mb-1" : "text-xl mt-5 mb-2"
          }`}
          {...props}
        >
          {children}
        </h2>
      );
      if (!text || text.length > 50000) return h2El;
      return <SmartContentBlock content={text} fallback={h2El} />;
    },
    h3: ({ node: _node, children, ...props }) => {
      const text = getTextFromChildren(children)?.trim() ?? "";
      const h3El = (
        <h3
          className={`font-semibold text-dark-100 ${
            isExtraSmall ? "text-xs mt-2 mb-1" : "text-lg mt-4 mb-2"
          }`}
          {...props}
        >
          {children}
        </h3>
      );
      if (!text || text.length > 50000) return h3El;
      return <SmartContentBlock content={text} fallback={h3El} />;
    },

    // Paragraphs - use SmartContentBlock for JSON and terminal output
    p: ({ node: _node, children, ...props }) => {
      const text = getTextFromChildren(children)?.trim() ?? "";
      const pEl = (
        <p
          className={`${textSize} text-dark-200 mb-3 last:mb-0 leading-relaxed`}
          {...props}
        >
          {children}
        </p>
      );
      if (!text || text.length > 50000) return pEl;
      return (
        <SmartContentBlock content={text} fallback={pEl} />
      );
    },

    // Lists
    ul: ({ node, ...props }) => {
      // Check if this is nested by examining parent structure
      let depth = 0;
      let parent = node?.parent;
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
    ol: ({ node, ...props }) => {
      // Check if this is nested by examining parent structure
      let depth = 0;
      let parent = node?.parent;
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
    li: ({ node: _node, ...props }) => {
      // Ensure list items can contain nested lists properly
      return (
        <li className={`${textSize} text-dark-200`} {...props} />
      );
    },

    // Code - in react-markdown v10+, the `inline` prop was removed.
    // Inline backticks render as bare <code>; fenced blocks render as <pre><code>.
    // Inline code that looks like a workspace file path becomes a clickable link.
    code: ({ node, ...props }) => {
      const isBlockCode = node?.parent?.type === "pre";
      const content = typeof props.children === "string" ? props.children : String(props.children?.[0] ?? "");
      const isFileLink = !isBlockCode && content && isWorkspaceFilePath(content);
      const codeClass = `bg-dark-900 px-1.5 py-0.5 rounded text-primary-400 ${textSize} font-mono break-words`;
      if (isFileLink) {
        return (
          <Link
            to={getWorkspaceFileUrl(content, workspaceBaseUrl)}
            className={`${codeClass} hover:text-primary-300 underline cursor-pointer`}
          >
            {props.children}
          </Link>
        );
      }
      return (
        <code className={codeClass} {...props} />
      );
    },
    // Pre wraps fenced code blocks - use JsonBlock/TerminalBlock for json/bash
    pre: ({ node, children, ...props }) => {
      const codeNode = node?.children?.[0];
      const classNames = codeNode?.properties?.className;
      const lang = Array.isArray(classNames)
        ? classNames.find((c) => typeof c === "string" && c.startsWith("language-"))
        : typeof classNames === "string" && classNames.startsWith("language-")
        ? classNames
        : null;
      const langType = lang?.replace("language-", "") ?? "";

      // Extract text: from hast text node, or from React children
      let text = "";
      const codeChild = codeNode?.children?.[0];
      if (codeChild?.type === "text" && codeChild.value) {
        text = codeChild.value;
      } else {
        const ch = children?.props?.children ?? children;
        text = typeof ch === "string" ? ch : Array.isArray(ch) ? ch.join("") : String(ch ?? "");
      }

      if (langType === "json" && text.trim()) {
        return (
          <div className="mb-2">
            <JsonBlock content={text} />
          </div>
        );
      }
      if ((langType === "bash" || langType === "sh" || langType === "shell") && text.trim()) {
        return (
          <div className="mb-2">
            <TerminalBlock content={text} />
          </div>
        );
      }
      return (
        <pre
          className={`bg-dark-900 p-3 rounded text-primary-400 ${textSize} font-mono overflow-x-auto mb-2 [&>code]:p-0 [&>code]:whitespace-pre`}
          {...props}
        >
          {children}
        </pre>
      );
    },

    // Blockquote
    blockquote: ({ node: _node, ...props }) => (
      <blockquote
        className="border-l-4 border-dark-600 pl-4 italic text-dark-300 mb-2"
        {...props}
      />
    ),

    // Horizontal rule
    hr: ({ node: _node, ...props }) => (
      <hr
        className={`border-dark-700 ${isExtraSmall ? "my-2" : "my-3"}`}
        {...props}
      />
    ),

    // Text formatting
    strong: ({ node: _node, ...props }) => (
      <strong className="font-semibold text-dark-100" {...props} />
    ),
    em: ({ node: _node, ...props }) => (
      <em className="italic text-dark-200" {...props} />
    ),

    // Links - workspace file paths use internal Link for SPA navigation
    a: ({ node: _node, href, children, ...props }) => {
      const isWorkspaceLink = href && isWorkspaceFilePath(href);
      const linkClass = "text-primary-400 hover:text-primary-300 underline";
      if (isWorkspaceLink) {
        return (
          <Link to={getWorkspaceFileUrl(href, workspaceBaseUrl)} className={linkClass}>
            {children}
          </Link>
        );
      }
      return (
        <a className={linkClass} href={href} {...props}>
          {children}
        </a>
      );
    },

    // Tables
    table: ({ node: _node, ...props }) => (
      <table
        className={`w-full border-collapse border border-dark-700 ${
          isExtraSmall ? "my-2" : "my-3"
        }`}
        {...props}
      />
    ),
    thead: ({ node: _node, ...props }) => (
      <thead className="bg-dark-900" {...props} />
    ),
    tbody: ({ node: _node, ...props }) => <tbody {...props} />,
    tr: ({ node: _node, ...props }) => (
      <tr className="border-b border-dark-700" {...props} />
    ),
    th: ({ node: _node, ...props }) => (
      <th
        className={`border border-dark-700 ${
          isExtraSmall ? "px-2 py-1" : "px-3 py-1.5"
        } text-left font-semibold text-dark-100 bg-dark-900 ${textSize}`}
        {...props}
      />
    ),
    td: ({ node: _node, ...props }) => (
      <td
        className={`border border-dark-700 ${
          isExtraSmall ? "px-2 py-1" : "px-3 py-1.5"
        } text-dark-200 ${textSize}`}
        {...props}
      />
    ),
  }), [isExtraSmall, textSize, workspaceBaseUrl]);

  // Memoize plugin arrays to keep stable references across renders
  const remarkPlugins = useMemo(
    () => breaks ? [remarkGfm, remarkBreaks, remarkFrontmatter] : [remarkGfm, remarkFrontmatter],
    [breaks]
  );

  return (
    <div
      className={`prose prose-invert ${proseSize} max-w-none text-dark-200 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
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
  workspaceBaseUrl: PropTypes.string,
};

export default MarkdownRenderer;
