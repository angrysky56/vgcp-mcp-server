import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Network,
  Shield,
  AlertCircle,
  ArrowRight,
  Brain,
  Cpu,
  Layers,
  GitCommit,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Trash2
} from 'lucide-react';

// --- PART 1: Core Type System (Ported from uavi_core.py) ---

const NodeType = {
  PREMISE: { id: 'PREMISE', color: 'bg-blue-100 border-blue-500 text-blue-800', label: 'Premise (Axiom)' },
  WARRANT: { id: 'WARRANT', color: 'bg-amber-100 border-amber-500 text-amber-800', label: 'Warrant (Reasoning)' },
  CLAIM: { id: 'CLAIM', color: 'bg-emerald-100 border-emerald-500 text-emerald-800', label: 'Claim (Conclusion)' },
  TOOL_CALL: { id: 'TOOL_CALL', color: 'bg-purple-100 border-purple-500 text-purple-800', label: 'Tool Call' },
  TOOL_RESULT: { id: 'TOOL_RESULT', color: 'bg-pink-100 border-pink-500 text-pink-800', label: 'Tool Result' },
  CONSTRAINT: { id: 'CONSTRAINT', color: 'bg-red-100 border-red-500 text-red-800', label: 'Constraint' },
};

const EdgeType = {
  DERIVED_FROM: { id: 'DERIVED_FROM', label: 'Derived From' },
  SUPPORTED_BY: { id: 'SUPPORTED_BY', label: 'Supported By' },
  CONSTRAINED_BY: { id: 'CONSTRAINED_BY', label: 'Constrained By' },
};

// --- PART 2: The Graph Kernel Logic (The Constraint Boundary ∂) ---

class GraphKernel {
  constructor(nodes, edges) {
    this.nodes = nodes; // Array of node objects
    this.edges = edges; // Array of edge objects {source, target, type}
  }

  // Inspector: Check for cycles (Acyclicity)
  checkAcyclicity(proposal, potentialEdges) {
    // Simple DFS cycle check
    // We only need to check if adding the new edges creates a path back to the proposal
    // But since proposal is NEW, it can't be part of an existing cycle unless we add outgoing edges to existing nodes
    // For this UI, we primarily add nodes then link them.
    // Let's check if the graph structure ITSELF is valid.

    // Simplified for the "Add Node" phase: A new node with only incoming edges cannot create a cycle.
    return { valid: true, reason: "New node preserves topology" };
  }

  // Inspector: Orphan Prevention (Contextual Grounding)
  checkOrphanPrevention(proposal, parentIds) {
    // 1. First node is always valid (User Axiom)
    if (this.nodes.length === 0) {
      return { valid: true, reason: "Root axiom accepted" };
    }

    // 2. Premises and Constraints can be roots (sometimes), but let's be strict per your doc
    if (proposal.type === 'PREMISE' || proposal.type === 'CONSTRAINT') {
       return { valid: true, reason: "Self-evident root type" };
    }

    // 3. Others must have parents
    if (parentIds.length === 0) {
      return { valid: false, reason: "Orphan node: No causal parent (Grounding failure)" };
    }

    return { valid: true, reason: "Causally grounded" };
  }

  // Inspector: Tool Causality
  checkToolCausality(proposal, parentIds) {
    if (proposal.type !== 'TOOL_RESULT') return { valid: true, reason: "Not a tool result" };

    const parents = this.nodes.filter(n => parentIds.includes(n.id));
    const hasToolCallParent = parents.some(p => p.type === 'TOOL_CALL');

    if (!hasToolCallParent) {
      return { valid: false, reason: "Hallucination: Tool Result without Tool Call" };
    }

    return { valid: true, reason: "Valid tool observation" };
  }

  // Master Validate Function
  validate(proposal, parentIds) {
    const inspectors = [
      (p, parents) => this.checkOrphanPrevention(p, parents),
      (p, parents) => this.checkToolCausality(p, parents),
      // Grounding score is simulated in UI
    ];

    for (const insp of inspectors) {
      const result = insp(proposal, parentIds);
      if (!result.valid) return result;
    }

    return { valid: true, reason: "Constraints Satisfied" };
  }
}

// --- PART 3: React Components ---

const InspectorLog = ({ logs }) => (
  <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs h-48 overflow-y-auto border border-slate-700 shadow-inner">
    <div className="text-slate-500 mb-2 uppercase tracking-wider font-bold text-[10px]">Kernel Logs (∂)</div>
    {logs.length === 0 && <div className="text-slate-600 italic">System ready. Waiting for input...</div>}
    {logs.map((log, i) => (
      <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
        <span className="opacity-50 mr-2">[{log.timestamp}]</span>
        {log.message}
      </div>
    ))}
  </div>
);

const NodeCard = ({ node, isSelected, onSelect, onDelete }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
    className={`
      absolute p-3 rounded-lg shadow-md w-64 cursor-pointer transition-all duration-300 border-2
      ${NodeType[node.type].color}
      ${isSelected ? 'ring-4 ring-blue-400/50 scale-105 z-10' : 'hover:scale-105 z-0'}
    `}
    style={{ left: node.x, top: node.y }}
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 border border-current px-1 rounded">
        {NodeType[node.type].label}
      </span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="opacity-40 hover:opacity-100">
        <Trash2 size={14} />
      </button>
    </div>
    <div className="text-sm font-medium leading-snug">{node.content}</div>
    <div className="mt-2 pt-2 border-t border-current/20 flex justify-between items-center text-[10px] opacity-70">
      <span>ID: {node.id}</span>
      <span className="flex items-center gap-1">
        <Shield size={10} /> Valid
      </span>
    </div>
  </div>
);

export default function UAVICrystallizer() {
  // State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Input State
  const [content, setContent] = useState("");
  const [type, setType] = useState("PREMISE");
  const [isCrystallizing, setIsCrystallizing] = useState(false);

  // Kernel Reference
  const kernel = useMemo(() => new GraphKernel(nodes, edges), [nodes, edges]);

  const addLog = (message, type = 'info') => {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    setLogs(prev => [{ message, type, timestamp: now }, ...prev]);
  };

  const handleCrystallize = async () => {
    if (!content.trim()) return;

    setIsCrystallizing(true);
    addLog(`Initiating collapse for: "${content.substring(0, 20)}..."`, 'info');

    // Simulate "Processing" time
    await new Promise(r => setTimeout(r, 600));

    // 1. Identify Parents (User explicitly selects them for this demo by clicking)
    // In this UI, if a node is selected, we assume the new node attaches to it.
    // If multiple were selected (feature not built), we'd attach to multiple.
    const parentIds = selectedNodeId ? [selectedNodeId] : [];

    const proposal = {
      id: `n${nodes.length + 1}`,
      type,
      content,
      x: Math.random() * 400 + 50, // Initial random placement, improved below
      y: Math.random() * 300 + 50
    };

    // 2. Run Inspectors
    const validation = kernel.validate(proposal, parentIds);

    if (validation.valid) {
      // 3. Crystallize (Commit to Graph)

      // Calculate position based on parent
      let x = 350, y = 100; // Defaults for root
      if (parentIds.length > 0) {
        const parent = nodes.find(n => n.id === parentIds[0]);
        if (parent) {
          x = parent.x + (Math.random() * 200 - 100);
          y = parent.y + 150;
        }
      } else if (nodes.length > 0) {
          // If it's a new root (Premise), put it beside others
          x = Math.max(...nodes.map(n => n.x)) + 300;
          y = 100;
      }

      const newNode = { ...proposal, x, y };

      setNodes([...nodes, newNode]);

      if (parentIds.length > 0) {
        const newEdge = {
          source: parentIds[0],
          target: newNode.id,
          type: 'DERIVED_FROM'
        };
        setEdges([...edges, newEdge]);
      }

      addLog(`✓ CRYSTALLIZED: ${validation.reason}`, 'success');
      setContent("");
      setSelectedNodeId(newNode.id); // Auto-select new node for flow
    } else {
      // 4. Reflexion (Reject)
      addLog(`✕ REJECTED: ${validation.reason}`, 'error');
    }

    setIsCrystallizing(false);
  };

  const handleDelete = (id) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    addLog(`Node ${id} removed from reality volume.`, 'info');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-20">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <Brain className="text-indigo-600" />
            UAVI Crystallizer
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            ⧬∞ ⦿ ⫰ ∂ → ⧈ &nbsp;|&nbsp; Verifiable Graph Context Protocol
          </p>
        </div>
        <div className="flex gap-4 text-xs font-medium text-slate-500">
           <div className="flex items-center gap-1"><Layers size={14}/> Nodes: {nodes.length}</div>
           <div className="flex items-center gap-1"><GitCommit size={14}/> Edges: {edges.length}</div>
           <div className="flex items-center gap-1"><Cpu size={14}/> Kernel: Active</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar: Controls */}
        <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 z-20 shadow-lg">

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Network size={16} />
              Infinite Potential (⧬∞)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Thought Type</label>
                <select
                  className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {Object.values(NodeType).map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Content</label>
                <textarea
                  className="w-full p-3 border border-slate-300 rounded text-sm bg-slate-50 h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter thought content to crystallize..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleCrystallize()}
                />
              </div>

              <div className="p-3 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200">
                <span className="font-bold">Current Context: </span>
                {selectedNodeId ? (
                   <span className="text-indigo-600 font-medium">Linked to {selectedNodeId}</span>
                ) : (
                   <span className="text-slate-400 italic">No parent selected (Root)</span>
                )}
              </div>

              <button
                onClick={handleCrystallize}
                disabled={isCrystallizing || !content.trim()}
                className={`
                  w-full py-3 px-4 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all
                  ${isCrystallizing || !content.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform active:scale-95'}
                `}
              >
                {isCrystallizing ? (
                  <span className="animate-pulse">Collapsing...</span>
                ) : (
                  <>
                    <Shield size={16} /> Crystallize (∂)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
             <InspectorLog logs={logs} />
          </div>

        </div>

        {/* Main Canvas: The Finite Volume (⦿) */}
        <div
          className="flex-1 bg-slate-50 relative overflow-hidden cursor-crosshair"
          onClick={() => setSelectedNodeId(null)}
        >
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
               style={{
                 backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                 backgroundSize: '20px 20px'
               }}
          />

          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none">
               <div className="text-center">
                 <Brain size={64} className="mx-auto mb-4 opacity-50" />
                 <p className="text-lg font-medium">The Finite Volume is empty.</p>
                 <p className="text-sm">Propose a Premise to begin crystallization.</p>
               </div>
            </div>
          )}

          {/* Edges (SVG Layer) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              // Simple straight line for now, can be bezier
              return (
                <g key={i}>
                  <line
                    x1={source.x + 128} y1={source.y + 60} // Center-ish of card
                    x2={target.x + 128} y2={target.y} // Top of target card
                    stroke="#94a3b8"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
             <NodeCard
               key={node.id}
               node={node}
               isSelected={selectedNodeId === node.id}
               onSelect={setSelectedNodeId}
               onDelete={handleDelete}
             />
          ))}

        </div>
      </div>
    </div>
  );
}