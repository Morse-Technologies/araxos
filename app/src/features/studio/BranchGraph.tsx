"use client";
import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useTheme } from "@/features/shell/theme";
import type { Step } from "@/lib/api/types";
import { stepKindLabel } from "@/lib/labels";
import { reduced } from "@/lib/motion";

const ROW = 92;
const COL = 300;

/** Steps that a decision can jump over sit in a side column, so every path reads top to bottom. */
function layout(steps: Step[]) {
  const side = new Set<string>();
  steps.forEach((s, i) => {
    if (!s.branches.length) return;
    const far = Math.max(...s.branches.map((b) => steps.findIndex((x) => x.key === b.to)));
    steps.slice(i + 1, far).forEach((x) => side.add(x.key));
  });
  const nodes: Node[] = steps.map((s, i) => ({
    id: s.key, position: { x: side.has(s.key) ? COL : 0, y: i * ROW }, draggable: false,
    data: { label: <span className="flex flex-col text-left"><span className="text-small text-muted">{s.n} · {stepKindLabel[s.kind]}</span><span className="text-body">{s.title}</span></span> },
    className: s.kind === "safety" ? "ax-node ax-node-safety" : s.kind === "decision" ? "ax-node ax-node-decision" : "ax-node",
  }));
  const edges: Edge[] = [];
  steps.forEach((s, i) => {
    if (s.branches.length) s.branches.forEach((b) => edges.push({ id: `${s.key}-${b.to}`, source: s.key, target: b.to, label: b.label, markerEnd: { type: MarkerType.ArrowClosed } }));
    else if (steps[i + 1]) edges.push({ id: `${s.key}-${steps[i + 1].key}`, source: s.key, target: steps[i + 1].key, markerEnd: { type: MarkerType.ArrowClosed } });
  });
  return { nodes, edges };
}

/** E1 branches: the procedure as a graph. Read-only here; branches are edited on the decision step. */
export function BranchGraph({ steps, highlight }: { steps: Step[]; highlight?: string[] }) {
  const { theme } = useTheme();
  const { nodes, edges } = useMemo(() => {
    const g = layout(steps);
    if (!highlight) return g;
    const on = new Set(highlight);
    return {
      nodes: g.nodes.map((n) => ({ ...n, className: `${n.className} ${on.has(n.id) ? "ax-node-on" : "ax-node-off"}` })),
      edges: g.edges.map((e) => ({ ...e, animated: !reduced() && on.has(e.source) && on.has(e.target), style: on.has(e.source) && on.has(e.target) ? { stroke: "var(--accent)", strokeWidth: 2 } : undefined })),
    };
  }, [steps, highlight]);
  return (
    <div className="h-[560px] rounded-card border border-border" aria-label="Procedure graph">
      <ReactFlow nodes={nodes} edges={edges} fitView colorMode={theme} nodesConnectable={false} proOptions={{ hideAttribution: true }}>
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
