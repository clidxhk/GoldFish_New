import ReactMarkdown from "react-markdown";
import "katex/dist/katex.min.css";
import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import { useRef, useState, RefObject, useEffect, useMemo } from "react";
import { copyToClipboard, useWindowSize } from "../utils";
import mermaid from "mermaid";
import Locale from "../locales";
import LoadingIcon from "../icons/three-dots.svg";
import ReloadButtonIcon from "../icons/reload.svg";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { showImageModal, FullScreen } from "./ui-lib";
import {
  ArtifactsShareButton,
  HTMLPreview,
  HTMLPreviewHandler,
} from "./artifacts";
import { useChatStore } from "../store";
import { IconButton } from "./button";

import { useAppConfig } from "../store/config";
import clsx from "clsx";

let aiWordsPromise: Promise<string[]> | null = null;

function getAiWords() {
  if (!aiWordsPromise) {
    aiWordsPromise = fetch("/api/ai-words")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`failed to fetch ai words: ${res.status}`);
        }
        const data = (await res.json()) as { words?: string[] };
        return Array.isArray(data.words) ? data.words : [];
      })
      .catch((error) => {
        console.error("[markdown] failed to load ai words", error);
        return [];
      });
  }

  return aiWordsPromise;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createAiWordHighlighter(words: string[]) {
  const normalizedWords = Array.from(
    new Set(words.map((word) => word.trim()).filter(Boolean)),
  ).sort((a, b) => b.length - a.length);

  if (normalizedWords.length === 0) {
    return () => undefined;
  }

  const pattern = new RegExp(normalizedWords.map(escapeRegExp).join("|"), "gi");
  const blockedTags = new Set(["code", "pre", "script", "style"]);

  function highlightTextNode(node: any) {
    const value = typeof node?.value === "string" ? node.value : "";
    if (!value) return undefined;

    pattern.lastIndex = 0;
    const matches = Array.from(value.matchAll(pattern)) as RegExpMatchArray[];
    if (matches.length === 0) return undefined;

    const children: any[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const matchedText = match[0];
      const startIndex = match.index ?? 0;

      if (startIndex > lastIndex) {
        children.push({
          type: "text",
          value: value.slice(lastIndex, startIndex),
        });
      }

      children.push({
        type: "element",
        tagName: "span",
        properties: {
          className: ["ai-word-highlight"],
        },
        children: [{ type: "text", value: matchedText }],
      });

      lastIndex = startIndex + matchedText.length;
    }

    if (lastIndex < value.length) {
      children.push({
        type: "text",
        value: value.slice(lastIndex),
      });
    }

    return children;
  }

  function visit(node: any) {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === "element" && blockedTags.has(node.tagName)) return;

    const nextChildren: any[] = [];

    for (const child of node.children) {
      if (child?.type === "text") {
        const highlightedChildren = highlightTextNode(child);
        if (highlightedChildren) {
          nextChildren.push(...highlightedChildren);
          continue;
        }
      }

      visit(child);
      nextChildren.push(child);
    }

    node.children = nextChildren;
  }

  return () => (tree: any) => {
    visit(tree);
  };
}

export function Mermaid(props: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (props.code && ref.current) {
      mermaid
        .run({
          nodes: [ref.current],
          suppressErrors: true,
        })
        .catch((e) => {
          setHasError(true);
          console.error("[Mermaid] ", e.message);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.code]);

  function viewSvgInNewWindow() {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const text = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([text], { type: "image/svg+xml" });
    showImageModal(URL.createObjectURL(blob));
  }

  if (hasError) {
    return null;
  }

  return (
    <div
      className={clsx("no-dark", "mermaid")}
      style={{
        cursor: "pointer",
        overflow: "auto",
      }}
      ref={ref}
      onClick={() => viewSvgInNewWindow()}
    >
      {props.code}
    </div>
  );
}

export function PreCode(props: { children: any }) {
  const ref = useRef<HTMLPreElement>(null);
  const previewRef = useRef<HTMLPreviewHandler>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const { height } = useWindowSize();
  const chatStore = useChatStore();
  const session = chatStore.currentSession();

  const renderArtifacts = useDebouncedCallback(() => {
    if (!ref.current) return;
    const mermaidDom = ref.current.querySelector("code.language-mermaid");
    if (mermaidDom) {
      setMermaidCode((mermaidDom as HTMLElement).innerText);
    }
    const htmlDom = ref.current.querySelector("code.language-html");
    const refText = ref.current.querySelector("code")?.innerText;
    if (htmlDom) {
      setHtmlCode((htmlDom as HTMLElement).innerText);
    } else if (
      refText?.startsWith("<!DOCTYPE") ||
      refText?.startsWith("<svg") ||
      refText?.startsWith("<?xml")
    ) {
      setHtmlCode(refText);
    }
  }, 600);

  const config = useAppConfig();
  const enableArtifacts =
    session.mask?.enableArtifacts !== false && config.enableArtifacts;

  //Wrap the paragraph for plain-text
  useEffect(() => {
    if (ref.current) {
      const codeElements = ref.current.querySelectorAll(
        "code",
      ) as NodeListOf<HTMLElement>;
      const wrapLanguages = [
        "",
        "md",
        "markdown",
        "text",
        "txt",
        "plaintext",
        "tex",
        "latex",
      ];
      codeElements.forEach((codeElement) => {
        let languageClass = codeElement.className.match(/language-(\w+)/);
        let name = languageClass ? languageClass[1] : "";
        if (wrapLanguages.includes(name)) {
          codeElement.style.whiteSpace = "pre-wrap";
        }
      });
      setTimeout(renderArtifacts, 1);
    }
  }, []);

  return (
    <>
      <pre ref={ref}>
        <span
          className="copy-code-button"
          onClick={() => {
            if (ref.current) {
              copyToClipboard(
                ref.current.querySelector("code")?.innerText ?? "",
              );
            }
          }}
        ></span>
        {props.children}
      </pre>
      {mermaidCode.length > 0 && (
        <Mermaid code={mermaidCode} key={mermaidCode} />
      )}
      {htmlCode.length > 0 && enableArtifacts && (
        <FullScreen className="no-dark html" right={70}>
          <ArtifactsShareButton
            style={{ position: "absolute", right: 20, top: 10 }}
            getCode={() => htmlCode}
          />
          <IconButton
            style={{ position: "absolute", right: 120, top: 10 }}
            bordered
            icon={<ReloadButtonIcon />}
            shadow
            onClick={() => previewRef.current?.reload()}
          />
          <HTMLPreview
            ref={previewRef}
            code={htmlCode}
            autoHeight={!document.fullscreenElement}
            height={!document.fullscreenElement ? 600 : height}
          />
        </FullScreen>
      )}
    </>
  );
}

function CustomCode(props: { children: any; className?: string }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const enableCodeFold =
    session.mask?.enableCodeFold !== false && config.enableCodeFold;

  const ref = useRef<HTMLPreElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const codeHeight = ref.current.scrollHeight;
      setShowToggle(codeHeight > 400);
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [props.children]);

  const toggleCollapsed = () => {
    setCollapsed((collapsed) => !collapsed);
  };
  const renderShowMoreButton = () => {
    if (showToggle && enableCodeFold && collapsed) {
      return (
        <div
          className={clsx("show-hide-button", {
            collapsed,
            expanded: !collapsed,
          })}
        >
          <button onClick={toggleCollapsed}>{Locale.NewChat.More}</button>
        </div>
      );
    }
    return null;
  };
  return (
    <>
      <code
        className={clsx(props?.className)}
        ref={ref}
        style={{
          maxHeight: enableCodeFold && collapsed ? "400px" : "none",
          overflowY: "hidden",
        }}
      >
        {props.children}
      </code>

      {renderShowMoreButton()}
    </>
  );
}

function escapeBrackets(text: string) {
  const pattern =
    /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g;
  return text.replace(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock;
      } else if (squareBracket) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket) {
        return `$${roundBracket}$`;
      }
      return match;
    },
  );
}

function tryWrapHtmlCode(text: string) {
  // try add wrap html code (fixed: html codeblock include 2 newline)
  // ignore embed codeblock
  if (text.includes("```")) {
    return text;
  }
  return text
    .replace(
      /([`]*?)(\w*?)([\n\r]*?)(<!DOCTYPE html>)/g,
      (match, quoteStart, lang, newLine, doctype) => {
        return !quoteStart ? "\n```html\n" + doctype : match;
      },
    )
    .replace(
      /(<\/body>)([\r\n\s]*?)(<\/html>)([\n\r]*)([`]*)([\n\r]*?)/g,
      (match, bodyEnd, space, htmlEnd, newLine, quoteEnd) => {
        return !quoteEnd ? bodyEnd + space + htmlEnd + "\n```\n" : match;
      },
    );
}

type MarkdownSegment =
  | { type: "markdown"; content: string }
  | { type: "thinking"; content: string; summary: string };

function parseMarkdownSegments(content: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const detailsOpenTag = "<details>";
  const detailsCloseTag = "</details>";
  const summaryOpenTag = "<summary>";
  const summaryCloseTag = "</summary>";
  const defaultSummary = "Thinking";

  let currentIndex = 0;

  while (currentIndex < content.length) {
    const detailsStart = content.indexOf(detailsOpenTag, currentIndex);

    if (detailsStart === -1) {
      const remainingContent = content.slice(currentIndex);
      if (remainingContent) {
        segments.push({ type: "markdown", content: remainingContent });
      }
      break;
    }

    const markdownBefore = content.slice(currentIndex, detailsStart);
    if (markdownBefore) {
      segments.push({ type: "markdown", content: markdownBefore });
    }

    const summaryStart = content.indexOf(
      summaryOpenTag,
      detailsStart + detailsOpenTag.length,
    );
    const summaryEnd =
      summaryStart === -1
        ? -1
        : content.indexOf(
            summaryCloseTag,
            summaryStart + summaryOpenTag.length,
          );

    if (summaryStart === -1 || summaryEnd === -1) {
      segments.push({
        type: "markdown",
        content: content.slice(detailsStart),
      });
      break;
    }

    const summary =
      content.slice(summaryStart + summaryOpenTag.length, summaryEnd).trim() ||
      defaultSummary;
    const thinkingStart = summaryEnd + summaryCloseTag.length;
    const detailsEnd = content.indexOf(detailsCloseTag, thinkingStart);

    if (detailsEnd === -1) {
      segments.push({
        type: "thinking",
        summary,
        content: content.slice(thinkingStart).trim(),
      });
      break;
    }

    segments.push({
      type: "thinking",
      summary,
      content: content.slice(thinkingStart, detailsEnd).trim(),
    });
    currentIndex = detailsEnd + detailsCloseTag.length;
  }

  return segments;
}

function _MarkDownContent(props: { content: string }) {
  const [aiWords, setAiWords] = useState<string[]>([]);

  useEffect(() => {
    getAiWords().then(setAiWords);
  }, []);

  const escapedContent = useMemo(() => {
    return tryWrapHtmlCode(escapeBrackets(props.content));
  }, [props.content]);
  const segments = useMemo(
    () => parseMarkdownSegments(escapedContent),
    [escapedContent],
  );
  const aiWordHighlighter = useMemo(
    () => createAiWordHighlighter(aiWords),
    [aiWords],
  );

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "thinking") {
          return (
            <details key={`thinking-${index}`} className="thinking-block">
              <summary className="thinking-summary">{segment.summary}</summary>
              <div className="thinking-content">
                <MarkdownRenderer
                  content={segment.content}
                  aiWordHighlighter={aiWordHighlighter}
                />
              </div>
            </details>
          );
        }

        return (
          <MarkdownRenderer
            key={`markdown-${index}`}
            content={segment.content}
            aiWordHighlighter={aiWordHighlighter}
          />
        );
      })}
    </>
  );
}

function MarkdownRenderer(props: {
  content: string;
  aiWordHighlighter: ReturnType<typeof createAiWordHighlighter>;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
      rehypePlugins={[
        RehypeKatex,
        props.aiWordHighlighter,
        [
          RehypeHighlight,
          {
            detect: false,
            ignoreMissing: true,
          },
        ],
      ]}
      components={{
        pre: PreCode,
        code: CustomCode,
        p: (pProps) => <p {...pProps} dir="auto" />,
        a: (aProps) => {
          const href = aProps.href || "";
          if (/\.(aac|mp3|opus|wav)$/.test(href)) {
            return (
              <figure>
                <audio controls src={href}></audio>
              </figure>
            );
          }
          if (/\.(3gp|3g2|webm|ogv|mpeg|mp4|avi)$/.test(href)) {
            return (
              <video controls width="99.9%">
                <source src={href} />
              </video>
            );
          }
          const isInternal = /^\/#/i.test(href);
          const target = isInternal ? "_self" : aProps.target ?? "_blank";
          return <a {...aProps} target={target} />;
        },
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
}

export const MarkdownContent = React.memo(_MarkDownContent);

export function Markdown(
  props: {
    content: string;
    loading?: boolean;
    fontSize?: number;
    fontFamily?: string;
    parentRef?: RefObject<HTMLDivElement>;
    defaultShow?: boolean;
  } & React.DOMAttributes<HTMLDivElement>,
) {
  const mdRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: `${props.fontSize ?? 14}px`,
        fontFamily: props.fontFamily || "inherit",
      }}
      ref={mdRef}
      onContextMenu={props.onContextMenu}
      onDoubleClickCapture={props.onDoubleClickCapture}
      dir="auto"
    >
      {props.loading ? (
        <LoadingIcon />
      ) : (
        <MarkdownContent content={props.content} />
      )}
    </div>
  );
}
