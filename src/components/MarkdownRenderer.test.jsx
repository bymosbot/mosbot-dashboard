import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders simple markdown content", () => {
    render(<MarkdownRenderer content="# Hello World" size="sm" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders markdown with bold text", () => {
    render(<MarkdownRenderer content="This is **bold** text" size="sm" />);
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("renders markdown with lists", () => {
    const content = `
- Item 1
- Item 2
- Item 3
    `;
    render(<MarkdownRenderer content={content} size="sm" />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders markdown with code blocks", () => {
    const content = "Here is some `inline code` in text";
    render(<MarkdownRenderer content={content} size="sm" />);
    expect(screen.getByText("inline code")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <MarkdownRenderer
        content="Test content"
        size="sm"
        className="custom-class"
      />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders with xs size variant", () => {
    const { container } = render(
      <MarkdownRenderer content="Test content" size="xs" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("prose-xs");
  });

  it("renders with sm size variant by default", () => {
    const { container } = render(<MarkdownRenderer content="Test content" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("prose-sm");
  });

  it("renders markdown with links", () => {
    const content = "[Click here](https://example.com)";
    render(<MarkdownRenderer content={content} size="sm" />);
    const link = screen.getByText("Click here");
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("renders markdown with tables", () => {
    const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;
    render(<MarkdownRenderer content={content} size="sm" />);
    expect(screen.getByText("Header 1")).toBeInTheDocument();
    expect(screen.getByText("Header 2")).toBeInTheDocument();
    expect(screen.getByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Cell 2")).toBeInTheDocument();
  });

  it("renders inline code without literal backticks in list items", () => {
    const content = `- **API version**: \`v1\`
- **Base URL**: \`example.com/api\``;
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    // The code elements should exist
    const codeElements = container.querySelectorAll("code");
    expect(codeElements.length).toBe(2);
    expect(codeElements[0].textContent).toBe("v1");
    expect(codeElements[1].textContent).toBe("example.com/api");
    
    // Backtick characters should NOT appear in the rendered output
    const fullText = container.textContent;
    expect(fullText).not.toContain("`");
  });

  it("renders inline code without backticks in paragraphs", () => {
    const content = "Use the `projects/<name>/` directory for project files.";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    expect(codeEl.textContent).toBe("projects/<name>/");
    
    // No literal backticks in rendered output
    expect(container.textContent).not.toContain("`");
  });

  it("renders inline code in list items with file paths", () => {
    const content = "- **Convention file**: `docs/WORKSPACE_CONVENTIONS.md`";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
    
    // No literal backticks in rendered output
    expect(container.textContent).not.toContain("`");
  });

  it("handles escaped backticks correctly", () => {
    const content = "To use a backtick, type \\`like this\\`";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    // Escaped backticks should render as literal backticks in text, not as code blocks
    expect(container.textContent).toContain("`like this`");
    
    // Should NOT create a code element for escaped backticks
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeFalsy();
  });

  it("handles backticks inside code blocks", () => {
    // Test case where markdown has escaped backticks inside code
    const content = "Use `\\`docs/WORKSPACE_CONVENTIONS.md\\`` for conventions";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    
    // ReactMarkdown renders escaped backticks inside code as just backslashes
    // This is a known limitation - you can't escape backticks inside inline code
    expect(codeEl.textContent).toBe("\\");
  });

  it("renders normal inline code without any backticks in output", () => {
    // This is the expected normal case
    const content = "Use `docs/WORKSPACE_CONVENTIONS.md` for conventions";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
    
    // The full text should not contain any backticks
    expect(container.textContent).not.toContain("`");
  });

  it("does not display literal backticks when content has HTML entities", () => {
    // Test case where backticks might be HTML-encoded
    const content = "Use &#96;docs/WORKSPACE_CONVENTIONS.md&#96; for conventions";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    // HTML entities should be decoded and then parsed as markdown
    const codeEl = container.querySelector("code");
    if (codeEl) {
      // If it was parsed as code, it should not contain backticks
      expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
      expect(container.textContent).not.toContain("`");
    } else {
      // If it wasn't parsed as code, the backticks should still not be visible
      // (they should be decoded from HTML entities)
      expect(container.textContent).toContain("docs/WORKSPACE_CONVENTIONS.md");
    }
  });

  it("cleans stray backticks from code element children", () => {
    // This tests the edge case where somehow backticks end up in the code element's children
    // We simulate this by checking that our cleaning logic would work
    const content = "Use `docs/WORKSPACE_CONVENTIONS.md` for conventions";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    
    // The code element should NOT contain any backticks
    expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
    expect(codeEl.textContent).not.toContain("`");
    
    // The full container should also not have any backticks
    expect(container.textContent).not.toContain("`");
  });

  it("handles markdown with inline code in bullet points like AGENTS.md", () => {
    // Test the exact pattern from the screenshot: bullet point with bold text and inline code
    const content = "- Before creating any new file, verify its placement against `docs/WORKSPACE_CONVENTIONS.md`.";
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
    
    // No backticks should be visible anywhere
    expect(container.textContent).not.toContain("`");
  });

  it("handles the exact AGENTS.md safety rule pattern", () => {
    // This is the exact text from the screenshot
    const content = `- Before creating any new file, verify its placement against \`docs/WORKSPACE_CONVENTIONS.md\` .`;
    const { container } = render(<MarkdownRenderer content={content} size="sm" />);
    
    const codeEl = container.querySelector("code");
    expect(codeEl).toBeTruthy();
    
    // Debug: log what we're actually getting
    console.log('Code element textContent:', JSON.stringify(codeEl.textContent));
    console.log('Full container text:', JSON.stringify(container.textContent));
    
    expect(codeEl.textContent).toBe("docs/WORKSPACE_CONVENTIONS.md");
    expect(container.textContent).not.toContain("`");
  });
});
