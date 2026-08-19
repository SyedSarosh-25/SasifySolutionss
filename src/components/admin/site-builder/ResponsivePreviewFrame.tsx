import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SitePageRenderer from "@/site-builder/SitePageRenderer";
import type { SitePage } from "@/site-builder/schema";

type PreviewViewport = "desktop" | "tablet" | "mobile";
const designWidths: Record<PreviewViewport, number> = { desktop: 1280, tablet: 768, mobile: 390 };

export default function ResponsivePreviewFrame({ page, viewport, pathLabel }: { page: SitePage; viewport: PreviewViewport; pathLabel: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [visibleHeight, setVisibleHeight] = useState(618);
  const width = designWidths[viewport];

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      setScale(Math.min(1, Math.max(0.2, (wrapper.clientWidth - 2) / width)));
      setVisibleHeight(Math.max(520, wrapper.clientHeight - 32));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [width]);

  const prepareFrame = () => {
    const documentNode = iframeRef.current?.contentDocument;
    if (!documentNode) return;
    documentNode.head.innerHTML = "";
    const meta = documentNode.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1";
    documentNode.head.appendChild(meta);
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => documentNode.head.appendChild(node.cloneNode(true)));
    documentNode.body.innerHTML = "";
    documentNode.body.style.margin = "0";
    documentNode.body.style.background = "#f7f9ff";
    const root = documentNode.createElement("div");
    root.id = "site-builder-preview-root";
    documentNode.body.appendChild(root);
    setMountNode(root);
  };

  const frameHeight = Math.max(720, visibleHeight / scale);

  return (
    <div ref={wrapperRef} className="relative h-[calc(100vh-190px)] min-h-[560px] w-full overflow-hidden rounded-xl border border-[#cfd8ec] bg-[#dce3f0] shadow-[0_18px_50px_rgba(12,37,104,0.14)]">
      <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-1.5 border-b border-[#dfe6ff] bg-white px-3">
        <span className="h-2 w-2 rounded-full bg-[#ff6b6b]" /><span className="h-2 w-2 rounded-full bg-[#ffd93d]" /><span className="h-2 w-2 rounded-full bg-[#6bcb77]" />
        <span className="ml-3 truncate text-[9px] font-semibold text-[#9aa0b4]">sas.hhdevs.space/{pathLabel}</span>
        <span className="ml-auto text-[9px] font-bold text-[#9aa0b4]">{width}px · {Math.round(scale * 100)}%</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-8 overflow-auto">
        <iframe
          ref={iframeRef}
          title={`${viewport} live site preview`}
          onLoad={prepareFrame}
          className="origin-top-left border-0 bg-[#f7f9ff]"
          style={{ width, height: frameHeight, transform: `scale(${scale})` }}
        />
      </div>
      {mountNode && createPortal(<SitePageRenderer page={page} preview />, mountNode)}
    </div>
  );
}
