import { memo, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router";

type ToolNode = {
  name: string;
  category: string;
  logo?: string;
  mark?: string;
  color: string;
  slug: string;
  angle: number;
  size: number;
  mobile?: boolean;
  tablet?: boolean;
};

type BeamState = {
  angle: number;
  length: number;
};

const TOOL_NODES: ToolNode[] = [
  { name: "ChatGPT", category: "AI Assistant", logo: "/brand/logos/openai.svg", color: "#10A37F", slug: "chatgpt", angle: 180, size: 66, tablet: true, mobile: true },
  { name: "Claude", category: "AI Assistant", logo: "/brand/logos/claude.svg", color: "#D97745", slug: "claude", angle: 231.43, size: 60, tablet: true, mobile: true },
  { name: "Cursor", category: "Development", logo: "/brand/logos/cursor.svg", color: "#050816", slug: "cursor", angle: 282.86, size: 62, tablet: true, mobile: true },
  { name: "Gemini", category: "AI Assistant", logo: "/brand/logos/gemini.svg", color: "#4285F4", slug: "gemini", angle: 334.29, size: 60, tablet: true, mobile: true },
  { name: "Grok", category: "AI Assistant", logo: "/brand/logos/x.svg", color: "#050816", slug: "supergrok-plan", angle: 25.71, size: 62, tablet: true, mobile: true },
  { name: "Figma", category: "Design", logo: "/brand/logos/figma.svg", color: "#2B2B2B", slug: "figma", angle: 77.14, size: 58, tablet: true, mobile: true },
  { name: "CapCut", category: "Video", logo: "/brand/logos/capcut.svg", color: "#050816", slug: "capcut", angle: 128.57, size: 58, tablet: true, mobile: true },
];

function EcosystemBackground() {
  return (
    <>
      <div className="hero-ecosystem-glow hero-ecosystem-glow-a" />
      <div className="hero-ecosystem-glow hero-ecosystem-glow-b" />
      <div className="hero-ecosystem-particles" aria-hidden>
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            style={{
              "--particle-x": `${(index * 43) % 100}%`,
              "--particle-y": `${(index * 31) % 100}%`,
              "--particle-delay": `${index * -0.42}s`,
            } as CSSProperties}
          />
        ))}
      </div>
    </>
  );
}

function SasifyCore() {
  return (
    <div className="hero-ecosystem-core">
      <span className="hero-ecosystem-core-shine" />
      <img src="/brand/sasify-logo.jpg" alt="" width="78" height="78" decoding="async" />
    </div>
  );
}

function FiberBeam({ beam }: { beam: BeamState | null }) {
  if (!beam) return null;
  return (
    <span
      className="hero-ecosystem-beam"
      style={{
        "--beam-angle": `${beam.angle}deg`,
        "--beam-length": `${beam.length}px`,
      } as CSSProperties}
    >
      <span />
    </span>
  );
}

function ToolNodeView({
  node,
  activeName,
  onActivate,
  onDeactivate,
}: {
  node: ToolNode;
  activeName: string | null;
  onActivate: (node: ToolNode, element: HTMLElement) => void;
  onDeactivate: () => void;
}) {
  const isActive = activeName === node.name;
  const isDimmed = Boolean(activeName) && !isActive;

  return (
    <Link
      to={`/tools?search=${encodeURIComponent(node.name)}`}
      className={`hero-ecosystem-node hero-ecosystem-node-${node.slug} ${isActive ? "is-active" : ""} ${isDimmed ? "is-dimmed" : ""} ${node.tablet ? "show-tablet" : ""} ${node.mobile ? "show-mobile" : ""}`}
      style={{
        "--node-size": `${node.size}px`,
        "--node-color": node.color,
        "--node-angle": `${node.angle}deg`,
      } as CSSProperties}
      onMouseEnter={(event) => onActivate(node, event.currentTarget)}
      onMouseLeave={onDeactivate}
      onFocus={(event) => onActivate(node, event.currentTarget)}
      onBlur={onDeactivate}
      aria-label={`${node.name}, ${node.category}`}
    >
      <span className="hero-ecosystem-node-inner">
        <span className="hero-ecosystem-planet">
          <span className="hero-ecosystem-planet-shine" />
          <span className="hero-ecosystem-logo">
            {node.logo ? (
              <img src={node.logo} alt="" loading="eager" decoding="async" />
            ) : (
              <span>{node.mark}</span>
            )}
          </span>
        </span>
        <span className="hero-ecosystem-node-name">{node.name}</span>
        <span className="hero-ecosystem-mini-tooltip">
          <strong>{node.name}</strong>
          <small>{node.category}</small>
        </span>
      </span>
    </Link>
  );
}

function HeroSolarSystem() {
  const [activeNode, setActiveNode] = useState<ToolNode | null>(null);
  const [beam, setBeam] = useState<BeamState | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeName = activeNode?.name ?? null;
  const nodes = useMemo(() => TOOL_NODES, []);

  const activateNode = (node: ToolNode, element: HTMLElement) => {
    const stage = stageRef.current;
    if (!stage) {
      setActiveNode(node);
      setBeam(null);
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const nodeRect = element.getBoundingClientRect();
    const stageCenterX = stageRect.left + stageRect.width / 2;
    const stageCenterY = stageRect.top + stageRect.height / 2;
    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;
    const deltaX = nodeCenterX - stageCenterX;
    const deltaY = nodeCenterY - stageCenterY;

    setActiveNode(node);
    setBeam({
      angle: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
      length: Math.max(Math.sqrt(deltaX * deltaX + deltaY * deltaY) - node.size / 2, 0),
    });
  };

  const deactivateNode = () => {
    setActiveNode(null);
    setBeam(null);
  };

  return (
    <div className="hero-ecosystem" aria-label="SASIFY intelligent AI tool ecosystem">
      <EcosystemBackground />
      <div className="hero-ecosystem-stage" ref={stageRef}>
        <span className="hero-ecosystem-orbit" aria-hidden />
        <FiberBeam beam={beam} />
        <SasifyCore />
        <div className="hero-ecosystem-orbit-group">
          {nodes.map((node) => (
            <ToolNodeView
              key={node.name}
              node={node}
              activeName={activeName}
              onActivate={activateNode}
              onDeactivate={deactivateNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(HeroSolarSystem);
