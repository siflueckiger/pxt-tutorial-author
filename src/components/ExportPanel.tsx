import { useState } from "react";

interface ExportPanelProps {
  markdown: string;
  onClose: () => void;
}

export function ExportPanel({ markdown, onClose }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tutorial.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel">
        <div className="modal__header">
          <h2>Tutorial Markdown</h2>
          <button
            type="button"
            className="iconBtn"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>

        <pre className="markdownPreview">{markdown}</pre>

        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button type="button" className="btn" onClick={download}>
            Download .md
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
