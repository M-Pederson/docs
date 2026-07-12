export const RichEmailCopy = ({ text }) => {
  const contentRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const normalize = (value) => {
    const lines = String(value || "").replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");
    const indents = lines
      .filter((line) => line.trim())
      .map((line) => (line.match(/^\s*/) || [""])[0].length);
    const indent = indents.length ? Math.min(...indents) : 0;
    return lines.map((line) => line.slice(indent)).join("\n");
  };

  const normalized = normalize(text);
  const boldLines = new Set([
    "Recent highlights",
    "When Can You Get Access?",
    "Fundraising Status & Strategy",
    "Here is the illustrative paper value for each of you individually:",
    "For both of you combined:",
  ]);

  const renderInline = (line, paragraphIndex, lineIndex) =>
    line.split(/(https?:\/\/[^\s)]+)/g).filter(Boolean).map((part, partIndex) =>
      part.startsWith("http://") || part.startsWith("https://") ? (
        <a key={`${paragraphIndex}-${lineIndex}-${partIndex}`} href={part}>
          {part}
        </a>
      ) : (
        <span key={`${paragraphIndex}-${lineIndex}-${partIndex}`}>{part}</span>
      )
    );

  const paragraphs = normalized.split(/\n\s*\n/);

  const copyFormatted = async () => {
    const node = contentRef.current;
    if (!node) return;

    const plain = normalized;
    const html = `<div>${node.innerHTML}</div>`;

    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new window.ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand("copy");
        selection.removeAllRanges();
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="rich-email-copy not-prose">
      <style>{`
        .rich-email-copy {
          border: 1px solid var(--gray-a5);
          border-radius: 12px;
          overflow: hidden;
          margin: 12px 0 24px;
          background: var(--background);
        }
        .rich-email-copy-toolbar {
          display: flex;
          justify-content: flex-end;
          padding: 10px 12px;
          border-bottom: 1px solid var(--gray-a4);
          background: var(--gray-a2);
        }
        .rich-email-copy-button {
          appearance: none;
          border: 1px solid var(--gray-a6);
          border-radius: 8px;
          padding: 7px 12px;
          background: var(--background);
          color: inherit;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
        }
        .rich-email-copy-button:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
        .rich-email-copy-content {
          padding: 18px 20px;
          line-height: 1.55;
          color: var(--foreground);
        }
        .rich-email-paragraph {
          margin: 0;
        }
        .rich-email-spacer {
          line-height: 0.75;
        }
        .rich-email-copy-content strong {
          font-weight: 700;
        }
        .rich-email-copy-content a {
          color: var(--primary);
          text-decoration: underline;
        }
      `}</style>
      <div className="rich-email-copy-toolbar">
        <button type="button" className="rich-email-copy-button" onClick={copyFormatted}>
          {copied ? "Copied with formatting" : "Copy formatted email"}
        </button>
      </div>
      <div ref={contentRef} className="rich-email-copy-content">
        {paragraphs.map((paragraph, paragraphIndex) => {
          const lines = paragraph.split("\n");
          const shouldBoldFirstLine = boldLines.has(lines[0]) || lines[0].startsWith("• ");
          return (
            <div key={paragraphIndex}>
              <div className="rich-email-paragraph">
                {lines.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex === 0 && shouldBoldFirstLine ? (
                      <strong style={{ fontWeight: 700 }}>{renderInline(line, paragraphIndex, lineIndex)}</strong>
                    ) : (
                      renderInline(line, paragraphIndex, lineIndex)
                    )}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </div>
              {paragraphIndex < paragraphs.length - 1 ? (
                <div className="rich-email-spacer">
                  <br />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
