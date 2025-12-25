#!/usr/bin/env node
/**
 * VGCP MCP Server - Verifiable Graph Context Protocol
 * 
 * A Model Context Protocol server that provides DAG-structured reasoning
 * with constraint verification. Implements the Constraint Crystallization
 * Principle: ⧬∞ ⦿ ⫰ ∂ → ⧈
 * 
 * Tools:
 *   - propose_thought: Add a verified node to the reasoning graph
 *   - get_context: Retrieve causal ancestors for a node
 *   - get_reasoning_chain: Get full provenance path to a claim
 *   - query_graph: Search nodes by content
 *   - get_graph_state: Get complete graph structure
 *   - clear_graph: Reset the reasoning graph
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

import { kernel } from './kernel.js';
import { NodeType, EdgeType } from './types.js';

// Create the MCP server
const server = new Server(
  {
    name: "vgcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// --- Tool Definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "propose_thought",
        description: `Propose a new thought node to the reasoning graph. The Graph Kernel (∂) will validate constraints before committing.
        
Node Types:
- PREMISE: Axiom, fact, or retrieved data (can be root)
- WARRANT: Intermediate reasoning step
- CLAIM: Conclusion or assertion
- TOOL_CALL: Request to execute external function
- TOOL_RESULT: Output from tool (requires TOOL_CALL parent)
- CONSTRAINT: System rule
- REBUTTAL: Counter-argument

Constraints enforced:
- Orphan Prevention: Non-root nodes must have parents
- Tool Causality: TOOL_RESULT requires TOOL_CALL parent
- Acyclicity: Graph must remain a DAG`,
        inputSchema: {
          type: "object",
          required: ["type", "content"],
          properties: {
            type: {
              type: "string",
              enum: Object.values(NodeType),
              description: "The type of thought node"
            },
            content: {
              type: "string",
              description: "The content/text of the thought"
            },
            parentIds: {
              type: "array",
              items: { type: "string" },
              description: "IDs of parent nodes this thought derives from"
            },
            edgeTypes: {
              type: "array",
              items: { 
                type: "string",
                enum: Object.values(EdgeType)
              },
              description: "Edge types for each parent (optional, defaults to DERIVED_FROM)"
            }
          }
        }
      },
      {
        name: "get_context",
        description: "Retrieve the causal ancestors of a node - the 'causal light cone' that should be loaded for reasoning about this node.",
        inputSchema: {
          type: "object",
          required: ["nodeId"],
          properties: {
            nodeId: {
              type: "string",
              description: "ID of the node to get context for"
            },
            maxDepth: {
              type: "number",
              description: "Maximum depth to traverse (default: 10)"
            }
          }
        }
      },
      {
        name: "get_reasoning_chain",
        description: "Get the full provenance path from root to a specific claim. Shows exactly which premises and reasoning led to this conclusion.",
        inputSchema: {
          type: "object",
          required: ["claimId"],
          properties: {
            claimId: {
              type: "string",
              description: "ID of the claim node to trace"
            }
          }
        }
      },
      {
        name: "query_graph",
        description: "Search for nodes by content. Returns matching valid nodes.",
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: {
              type: "string",
              description: "Text to search for in node content"
            },
            nodeType: {
              type: "string",
              enum: Object.values(NodeType),
              description: "Filter by node type (optional)"
            }
          }
        }
      },
      {
        name: "get_graph_state",
        description: "Get the complete current state of the reasoning graph, including all nodes, edges, and metadata.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_node",
        description: "Get a specific node by ID.",
        inputSchema: {
          type: "object",
          required: ["nodeId"],
          properties: {
            nodeId: {
              type: "string",
              description: "ID of the node to retrieve"
            }
          }
        }
      },
      {
        name: "clear_graph",
        description: "Reset the reasoning graph. Use with caution - all nodes and edges will be deleted.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});


// --- Tool Handlers ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "propose_thought": {
      const { type, content, parentIds = [], edgeTypes } = args as {
        type: string;
        content: string;
        parentIds?: string[];
        edgeTypes?: string[];
      };

      const nodeType = type as NodeType;
      const edgeTypesParsed = edgeTypes?.map(e => e as EdgeType);

      const { node, result } = kernel.proposeThought({
        type: nodeType,
        content,
        parentIds,
        edgeTypes: edgeTypesParsed
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: result.valid,
              node: node,
              validation: result,
              symbol: result.valid ? "⧈ Crystallized" : "∅ Rejected"
            }, null, 2)
          }
        ]
      };
    }

    case "get_context": {
      const { nodeId, maxDepth = 10 } = args as { nodeId: string; maxDepth?: number };
      const context = kernel.getContext(nodeId, maxDepth);

      if (!context) {
        throw new McpError(ErrorCode.InvalidParams, `Node ${nodeId} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              causalLightCone: context,
              nodeCount: context.nodes.length,
              edgeCount: context.edges.length
            }, null, 2)
          }
        ]
      };
    }

    case "get_reasoning_chain": {
      const { claimId } = args as { claimId: string };
      const chain = kernel.getReasoningChain(claimId);

      if (!chain) {
        throw new McpError(ErrorCode.InvalidParams, `Claim ${claimId} not found`);
      }

      // Format as readable provenance
      const provenance = chain.path.map((node, i) => {
        const edge = chain.edges[i];
        const arrow = edge ? ` --[${edge.type}]--> ` : "";
        return `${node.type}: "${node.content}"${arrow}`;
      }).join("\n");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              chain,
              provenance,
              depth: chain.depth
            }, null, 2)
          }
        ]
      };
    }

    case "query_graph": {
      const { query, nodeType } = args as { query: string; nodeType?: string };
      const results = kernel.queryGraph(query, nodeType as NodeType | undefined);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query,
              results,
              count: results.length
            }, null, 2)
          }
        ]
      };
    }

    case "get_graph_state": {
      const state = kernel.getGraphState();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(state, null, 2)
          }
        ]
      };
    }

    case "get_node": {
      const { nodeId } = args as { nodeId: string };
      const node = kernel.getNode(nodeId);

      if (!node) {
        throw new McpError(ErrorCode.InvalidParams, `Node ${nodeId} not found`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(node, null, 2)
          }
        ]
      };
    }

    case "clear_graph": {
      kernel.clear();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              message: "Graph cleared. Ready for new reasoning chain."
            }, null, 2)
          }
        ]
      };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// --- Server Startup ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("VGCP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
