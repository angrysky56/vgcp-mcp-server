/**
 * VGCP Types - Verifiable Graph Context Protocol
 * 
 * Core type system implementing the Constraint Crystallization Principle:
 * ⧬∞ ⦿ ⫰ ∂ → ⧈
 * 
 * Infinite potential (⧬∞) crystallizes into finite actuality (⦿)
 * through constraint boundary (∂), producing structured reality (⧈).
 */

// Node Types - The Taxonomy of Thought
export enum NodeType {
  PREMISE = "PREMISE",           // Axiom, user-provided fact, or retrieved data
  WARRANT = "WARRANT",           // Intermediate reasoning step
  CLAIM = "CLAIM",               // Tentative conclusion or assertion
  TOOL_CALL = "TOOL_CALL",       // Request to execute external function
  TOOL_RESULT = "TOOL_RESULT",   // Output from tool execution
  CONSTRAINT = "CONSTRAINT",     // System instruction or rule
  REBUTTAL = "REBUTTAL",         // Counter-argument or flaw identification
  ERROR = "ERROR"                // Rejected/invalid node (Reflexion)
}

// Edge Types - The Grammar of Causality  
export enum EdgeType {
  DERIVED_FROM = "DERIVED_FROM",       // Strong implication (A → B)
  SUPPORTED_BY = "SUPPORTED_BY",       // Evidential support
  CONSTRAINED_BY = "CONSTRAINED_BY",   // Adherence to rules
  ATTACKS = "ATTACKS",                 // Explicit contradiction
  REFINES = "REFINES",                 // Correction/improvement
  PRECEDES = "PRECEDES"                // Temporal sequencing only
}

// A node in the reasoning graph
export interface ThoughtNode {
  id: string;
  type: NodeType;
  content: string;
  timestamp: string;
  valid: boolean;
  metadata?: Record<string, unknown>;
}

// An edge connecting two nodes
export interface CausalEdge {
  source: string;  // Parent node ID
  target: string;  // Child node ID
  type: EdgeType;
}

// Validation result from inspector functions
export interface ValidationResult {
  valid: boolean;
  reason: string;
  inspector?: string;
}

// The complete graph state
export interface GraphState {
  nodes: ThoughtNode[];
  edges: CausalEdge[];
  metadata: {
    created: string;
    lastModified: string;
    nodeCount: number;
    edgeCount: number;
  };
}

// Proposal for a new node
export interface NodeProposal {
  type: NodeType;
  content: string;
  parentIds: string[];
  edgeTypes?: EdgeType[];
  metadata?: Record<string, unknown>;
}

// Context retrieval result
export interface ContextResult {
  nodes: ThoughtNode[];
  edges: CausalEdge[];
  rootId: string;
  depth: number;
}

// Reasoning chain (provenance path)
export interface ReasoningChain {
  claimId: string;
  path: ThoughtNode[];
  edges: CausalEdge[];
  depth: number;
}
