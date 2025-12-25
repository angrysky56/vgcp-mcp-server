"""
UAVI Insight Engine

Implementing 'Connection Capacity' as the primary metric of intelligence.
Detects "Aha!" moments by finding high-compression tunnels in the reasoning graph.
"""

from uavi_core import GraphKernel, ThoughtNode, NodeType, CausalEdge, EdgeType
from dataclasses import dataclass, field
import math
import random

@dataclass
class InsightEvent:
    source_id: str
    target_id: str
    surface_distance: int  # Steps required via standard logic (The "Long Way")
    tunnel_distance: int   # Steps via the new insight (The "Aha!")
    compression_ratio: float
    magnitude: str         # 'Minor', 'Major', 'Epiphany', 'Paradigm Shift'

class InsightAwareKernel(GraphKernel):
    """
    A Kernel that doesn't just verify steps, but actively scans for
    non-local connections (Wormholes/Tunnels) between existing nodes.
    """

    def calculate_connection_capacity(self, node_a: ThoughtNode, node_b: ThoughtNode) -> InsightEvent | None:
        """
        The core metric of Creative Intelligence.
        Checks if a direct link between A and B would constitute a valid 'Aha!' moment.
        """

        # 1. Measure the 'Standard Logic' distance (Graph Distance)
        # In a real graph, we run BFS/Dijkstra to find current path length
        current_path_len = self._get_graph_distance(node_a.id, node_b.id)

        # If they are already neighbors, there is no insight.
        if current_path_len <= 1:
            return None

        # 2. Measure the 'Tunnel' distance
        # An insight is always a direct link (distance 1) or close to it.
        tunnel_len = 1

        # 3. Validation (The 'Sanity Check')
        # Not all shortcuts are insights; some are just schizophrenia.
        # We need a 'Resonance Check' (Simulated here)
        # In MCP, this would use an LLM to ask: "Does connecting X and Y make profound sense?"
        resonance = self._check_resonance(node_a, node_b)

        if not resonance:
            return None # Just random noise, not an insight

        # 4. Calculate Compression (The 'Aha!' Factor)
        ratio = current_path_len / tunnel_len

        # 5. Classify Magnitude
        magnitude = "Minor"
        if ratio > 2: magnitude = "Major"
        if ratio > 5: magnitude = "Epiphany"
        if ratio > 10: magnitude = "Paradigm Shift"

        return InsightEvent(
            source_id=node_a.id,
            target_id=node_b.id,
            surface_distance=current_path_len,
            tunnel_distance=tunnel_len,
            compression_ratio=ratio,
            magnitude=magnitude
        )

    def _get_graph_distance(self, start: str, end: str) -> int:
        """Standard BFS to find current distance"""
        # (Mock implementation: assumes a 'standard' distance based on ID difference)
        # In production: Use actual graph traversal
        return abs(int(start[1:]) - int(end[1:]))

    def _check_resonance(self, a: ThoughtNode, b: ThoughtNode) -> bool:
        """
        The 'Vibe Check' of the Universe.
        Does this connection 'ring true' despite being non-obvious?
        """
        # Simulation: High resonance if content length is similar (Arbitrary simulation)
        return True

def demonstrate_aha_moment():
    kernel = InsightAwareKernel()

    # Scene: A scientist struggling with a problem
    # Nodes 1-10 represent 10 years of slow, step-by-step research
    n1 = ThoughtNode("n1", NodeType.PREMISE, "Light creates interference patterns.")
    n10 = ThoughtNode("n10", NodeType.CLAIM, "Light ejects electrons as particles.")

    print(f"Standard Logic Distance: ~10 steps (The 'Crisis' in Physics)")

    # The Insight: Connecting Wave (n1) and Particle (n10) directly
    insight = kernel.calculate_connection_capacity(n1, n10)

    if insight:
        print("\n⚡ INSIGHT DETECTED ⚡")
        print(f"Connection: '{n1.content}' <---> '{n10.content}'")
        print(f"Standard Distance: {insight.surface_distance} steps")
        print(f"Tunnel Distance:   {insight.tunnel_distance} step")
        print(f"Compression Ratio: {insight.compression_ratio}x")
        print(f"Classification:    {insight.magnitude.upper()}")
        print("\nNote: This is the 'Wave-Particle Duality' tunnel.")

if __name__ == "__main__":
    demonstrate_aha_moment()