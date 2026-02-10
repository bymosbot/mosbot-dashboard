import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM d, yyyy HH:mm');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// Parse date from database (PostgreSQL TIMESTAMP without timezone is typically UTC)
// If the date string doesn't have timezone info, treat it as UTC
export const parseDatabaseDate = (dateString) => {
  if (!dateString) return null;
  
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // If it's a number (timestamp), create Date from it
  if (typeof dateString === 'number') return new Date(dateString);
  
  // If it's a string, check if it has timezone info
  const str = String(dateString).trim();
  
  // If it ends with Z or has timezone offset (+/-HH:MM), parse as-is (already has timezone)
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  
  // PostgreSQL returns timestamps in format: "2026-02-04 09:18:17.087" (space-separated, no timezone)
  // Convert space to 'T' and append 'Z' to treat as UTC
  const isoString = str.replace(' ', 'T') + 'Z';
  return new Date(isoString);
};

// Format date/time in user's local timezone with full details
// Uses Singapore locale (en-SG) for dd/mm/yyyy format
export const formatDateTimeLocal = (date) => {
  if (!date) return '';
  const parsedDate = parseDatabaseDate(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) return '';
  
  return parsedDate.toLocaleString('en-SG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Strip markdown formatting from text for plain text previews
export const stripMarkdown = (text) => {
  if (!text) return '';
  
  let stripped = String(text);
  
  // Remove code blocks (```code```)
  stripped = stripped.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code (`code`)
  stripped = stripped.replace(/`([^`]+)`/g, '$1');
  
  // Remove links but keep text: [text](url) -> text
  stripped = stripped.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove images: ![alt](url) -> alt
  stripped = stripped.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Remove headers (# Header -> Header)
  stripped = stripped.replace(/^#{1,6}\s+(.+)$/gm, '$1');
  
  // Remove bold (**text** or __text__)
  stripped = stripped.replace(/\*\*([^*]+)\*\*/g, '$1');
  stripped = stripped.replace(/__([^_]+)__/g, '$1');
  
  // Remove italic (*text* or _text_)
  stripped = stripped.replace(/\*([^*]+)\*/g, '$1');
  stripped = stripped.replace(/_([^_]+)_/g, '$1');
  
  // Remove strikethrough (~~text~~)
  stripped = stripped.replace(/~~([^~]+)~~/g, '$1');
  
  // Remove list markers (-, *, 1.)
  stripped = stripped.replace(/^[\s]*[-*+]\s+/gm, '');
  stripped = stripped.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // Remove horizontal rules (---)
  stripped = stripped.replace(/^---+$/gm, '');
  
  // Clean up extra whitespace
  stripped = stripped.replace(/\n{3,}/g, '\n\n');
  stripped = stripped.trim();
  
  return stripped;
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Build a shareable URL for viewing a workspace file.
 * Use with React Router's Link or for copying to clipboard.
 *
 * @param {string} filePath - Full workspace path, e.g. "/tasks/012-subagents-page/PRD.md"
 * @returns {string} - Route path like "/workspace/tasks/012-subagents-page/PRD.md"
 *
 * @example
 * <Link to={getWorkspaceFileUrl('/tasks/012-subagents-page/PRD.md')}>View PRD</Link>
 */
export const getWorkspaceFileUrl = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '/workspace';
  const normalized = filePath.trim().replace(/\/+/g, '/');
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `/workspace${withSlash}`;
};

/**
 * Check if a string looks like a workspace file path (for auto-linking in markdown).
 * Matches paths like tasks/012-subagents-page/PRD.md, docs/README.md, /docs/file.md
 *
 * @param {string} str - String to check (e.g. from inline code or link href)
 * @returns {boolean}
 */
export const isWorkspaceFilePath = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed || trimmed.includes('..')) return false;
  // Exclude URLs, anchors, mailto
  if (/^(https?:|mailto:|#)/i.test(trimmed)) return false;
  // Match path-like strings: must have file extension or multi-segment path
  // e.g. tasks/012/PRD.md, docs/README.md, tasks/012-subagents-page/PRD
  return /^\/?[\w./-]+\.(md|mdx|txt|json|yaml|yml|js|jsx|ts|tsx|css|html)$/i.test(trimmed) ||
    /^\/?[\w-]+\/[\w./-]+$/.test(trimmed);
};
