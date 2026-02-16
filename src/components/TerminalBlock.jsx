import PropTypes from "prop-types";
import { ComputerDesktopIcon } from "@heroicons/react/24/outline";

/**
 * TerminalBlock - Renders bash/shell output in a terminal-style view.
 * Used when content looks like terminal output (ls, command output, etc.).
 */
function TerminalBlock({ content, className = "" }) {
  const text = typeof content === "string" ? content : String(content);
  const lines = text.split("\n");

  return (
    <div
      className={`rounded-lg border border-dark-700 bg-dark-950 overflow-hidden ${className}`}
      data-block-type="terminal"
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-dark-800/80 border-b border-dark-700">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
          <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
          <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
        </div>
        <ComputerDesktopIcon className="w-4 h-4 text-dark-500 ml-1" />
        <span className="text-xs text-dark-500 font-medium">Terminal</span>
      </div>
      {/* Terminal content */}
      <pre className="px-4 py-3 text-sm font-mono text-dark-200 whitespace-pre overflow-x-auto m-0 leading-relaxed">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
    </div>
  );
}

TerminalBlock.propTypes = {
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  className: PropTypes.string,
};

export default TerminalBlock;
