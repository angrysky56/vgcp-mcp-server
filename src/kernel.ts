/**
 * Graph Kernel - The Constraint Boundary (∂)
 * 
 * This is the middleware that enforces topological and semantic constraints
 * on the reasoning graph. It acts as the "physics engine" of valid thought.
 * 
 * Implements: Orphan Prevention, Tool Causality, Acyclicity, Grounding
 */

import {
  NodeType,
  EdgeType,
  ThoughtNode,
  CausalEdge,
  ValidationResult,
  NodeProposal,
  GraphState,
  ContextResult,
  ReasoningChain
} from './types.js';

export class GraphKernel {
  private nodes: Map<string, ThoughtNode> = new Map();
  private edges: CausalEdge[] = [];
  private adjacencyList: Map<string, string[]> = new Map(); // parent -> children
  private reverseAdjacency: Map<string, string[]> = new Map(); // child -> parents
  private nodeCounter = 0;
  private created: string;

  constructor() {
    this.created = new Date().toISOString();
  }

  // --- Inspector Functions (Constraint Verification) ---

  /**
   * Inspector: Orphan Prevention (Contextual Grounding)
   * No node (except roots) can exist without causal parent.
   */
  private checkOrphanPrevention(proposal: NodeProposal): ValidationResult {
    // First node is always valid (root axiom)
    if (this.nodes.size === 0) {
      return { valid: true, reason: "Root axiom accepted", inspector: "orphan" };
    }

    // Premises and Constraints can be self-evident roots
    if (proposal.type === NodeType.PREMISE || proposal.type === NodeType.CONSTRAINT) {
      return { valid: true, reason: "Self-evident root type", inspector: "orphan" };
    }

    // Others must have existing parents
    if (proposal.parentIds.length === 0) {
      return { 
        valid: false, 
        reason: "Orphan node: No causal parent (Grounding failure)", 
        inspector: "orphan" 
      };
    }

    // Verify parents exist
    for (const parentId of proposal.parentIds) {
      if (!this.nodes.has(parentId)) {
        return { 
          valid: false, 
          reason: `Parent node ${parentId} does not exist`, 
          inspector: "orphan" 
        };
      }
    }

    return { valid: true, reason: "Causally grounded", inspector: "orphan" };
  }

  /**
   * Inspector: Tool Causality
   * A TOOL_RESULT cannot exist without a TOOL_CALL parent.
   * Prevents hallucinated tool outputs.
   */
  private checkToolCausality(proposal: NodeProposal): ValidationResult {
    if (proposal.type !== NodeType.TOOL_RESULT) {
      return { valid: true, reason: "Not a tool result", inspector: "tool_causality" };
    }

    // Must have at least one TOOL_CALL parent
    const hasToolCallParent = proposal.parentIds.some(pid => {
      const parent = this.nodes.get(pid);
      return parent?.type === NodeType.TOOL_CALL;
    });

    if (!hasToolCallParent) {
      return { 
        valid: false, 
        reason: "Hallucination: Tool Result without Tool Call parent", 
        inspector: "tool_causality" 
      };
    }

    return { valid: true, reason: "Valid tool observation", inspector: "tool_causality" };
  }

  /**
   * Inspector: Acyclicity Check
   * The graph must remain a DAG. Cycles represent circular reasoning.
   * Uses DFS to detect if adding edges would create a cycle.
   */
  private checkAcyclicity(proposal: NodeProposal): ValidationResult {
    // New node can't create cycle by itself
    // Cycles only happen if we create edges TO existing nodes
    // For now, we only add edges FROM parents TO new node, so always safe
    // Future: if we allow arbitrary edge creation, implement full cycle detection
    return { valid: true, reason: "DAG topology preserved", inspector: "acyclicity" };
  }

  /**
   * Inspector: Type Consistency
   * Certain node type transitions are invalid.
   */
  private checkTypeConsistency(proposal: NodeProposal): ValidationResult {
    // CLAIM should derive from WARRANT or PREMISE, not directly from TOOL_RESULT
    if (proposal.type === NodeType.CLAIM) {
      const parentTypes = proposal.parentIds.map(pid => this.nodes.get(pid)?.type);
      const hasReasoningParent = parentTypes.some(t => 
        t === NodeType.WARRANT || t === NodeType.PREMISE || t === NodeType.CLAIM
      );
      if (!hasReasoningParent && proposal.parentIds.length > 0) {
        return {
          valid: false,
          reason: "Claim must derive from reasoning (WARRANT/PREMISE), not raw data",
          inspector: "type_consistency"
        };
      }
    }
    return { valid: true, reason: "Type consistency maintained", inspector: "type_consistency" };
  }

  // --- Master Validation ---

  /**
   * Run all inspector functions on a proposal.
   * Returns the first failure, or success if all pass.
   */
  public validate(proposal: NodeProposal): ValidationResult {
    const inspectors = [
      () => this.checkOrphanPrevention(proposal),
      () => this.checkToolCausality(proposal),
      () => this.checkAcyclicity(proposal),
      () => this.checkTypeConsistency(proposal),
    ];

    for (const inspector of inspectors) {
      const result = inspector();
      if (!result.valid) return result;
    }

    return { valid: true, reason: "All constraints satisfied" };
  }

  // --- Graph Mutation ---

  /**
   * Propose and potentially commit a new node to the graph.
   * Implements the "propose-verify-commit" lifecycle.
   */
  public proposeThought(proposal: NodeProposal): { node: ThoughtNode | null; result: ValidationResult } {
    const validation = this.validate(proposal);

    if (!validation.valid) {
      // Reflexion: Create an ERROR node to preserve the failure
      const errorNode: ThoughtNode = {
        id: `error_${++this.nodeCounter}`,
        type: NodeType.ERROR,
        content: `REJECTED: ${proposal.content} | Reason: ${validation.reason}`,
        timestamp: new Date().toISOString(),
        valid: false,
        metadata: { 
          originalType: proposal.type,
          rejectionReason: validation.reason,
          inspector: validation.inspector
        }
      };
      this.nodes.set(errorNode.id, errorNode);
      return { node: errorNode, result: validation };
    }

    // Commit the node
    const node: ThoughtNode = {
      id: `n${++this.nodeCounter}`,
      type: proposal.type,
      content: proposal.content,
      timestamp: new Date().toISOString(),
      valid: true,
      metadata: proposal.metadata
    };

    this.nodes.set(node.id, node);
    this.adjacencyList.set(node.id, []);
    this.reverseAdjacency.set(node.id, []);

    // Create edges
    const edgeTypes = proposal.edgeTypes || proposal.parentIds.map(() => EdgeType.DERIVED_FROM);
    proposal.parentIds.forEach((parentId, i) => {
      const edge: CausalEdge = {
        source: parentId,
        target: node.id,
        type: edgeTypes[i] || EdgeType.DERIVED_FROM
      };
      this.edges.push(edge);
      this.adjacencyList.get(parentId)?.push(node.id);
      this.reverseAdjacency.get(node.id)?.push(parentId);
    });

    return { node, result: validation };
  }

  // --- Context Retrieval ---

  /**
   * Get causal ancestors of a node (the "causal light cone").
   * This is what gets loaded into context for reasoning.
   */
  public getContext(nodeId: string, maxDepth: number = 10): ContextResult | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const visited = new Set<string>();
    const resultNodes: ThoughtNode[] = [];
    const resultEdges: CausalEdge[] = [];

    const dfs = (id: string, depth: number) => {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);

      const n = this.nodes.get(id);
      if (n && n.valid) resultNodes.push(n);

      // Traverse to parents
      const parents = this.reverseAdjacency.get(id) || [];
      for (const parentId of parents) {
        const edge = this.edges.find(e => e.source === parentId && e.target === id);
        if (edge) resultEdges.push(edge);
        dfs(parentId, depth + 1);
      }
    };

    dfs(nodeId, 0);

    return {
      nodes: resultNodes,
      edges: resultEdges,
      rootId: nodeId,
      depth: maxDepth
    };
  }

  /**
   * Get the full reasoning chain from root to a specific claim.
   * Provides complete provenance for a conclusion.
   */
  public getReasoningChain(claimId: string): ReasoningChain | null {
    const claim = this.nodes.get(claimId);
    if (!claim) return null;

    const path: ThoughtNode[] = [];
    const chainEdges: CausalEdge[] = [];

    const buildPath = (id: string): boolean => {
      const node = this.nodes.get(id);
      if (!node) return false;

      path.unshift(node); // Add to front (building path backwards)

      const parents = this.reverseAdjacency.get(id) || [];
      if (parents.length === 0) return true; // Reached root

      // Follow primary parent (first one)
      const parentId = parents[0];
      const edge = this.edges.find(e => e.source === parentId && e.target === id);
      if (edge) chainEdges.unshift(edge);

      return buildPath(parentId);
    };

    buildPath(claimId);

    return {
      claimId,
      path,
      edges: chainEdges,
      depth: path.length
    };
  }

  /**
   * Query nodes by content (simple keyword search).
   * Future: Replace with semantic embedding search.
   */
  public queryGraph(query: string, nodeType?: NodeType): ThoughtNode[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.nodes.values()).filter(node => {
      if (!node.valid) return false;
      if (nodeType && node.type !== nodeType) return false;
      return node.content.toLowerCase().includes(queryLower);
    });
  }

  // --- State Management ---

  public getGraphState(): GraphState {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      metadata: {
        created: this.created,
        lastModified: new Date().toISOString(),
        nodeCount: this.nodes.size,
        edgeCount: this.edges.length
      }
    };
  }

  public getNode(id: string): ThoughtNode | undefined {
    return this.nodes.get(id);
  }

  public clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.adjacencyList.clear();
    this.reverseAdjacency.clear();
    this.nodeCounter = 0;
  }
}

// Singleton instance for the MCP server
export const kernel = new GraphKernel();
