"""
UAVI Extension: The Humor Topology
Implementing 'Compression Tunnels' within the Graph Kernel.
"""

from uavi_core import GraphKernel, ThoughtNode, NodeType, CausalEdge, EdgeType
from dataclasses import dataclass

@dataclass
class HumorMetric:
    surface_distance: float  # Semantic distance (Expected path length)
    tunnel_distance: float   # Punchline distance (Actual edge length)
    compression_ratio: float # The "Funniness" score

class HumorAwareKernel(GraphKernel):
    """
    Extended kernel that can detect and validate 'Compression Tunnels' (Jokes).
    """

    def measure_humor_potential(self, setup: ThoughtNode, punchline: ThoughtNode) -> HumorMetric:
        """
        Calculates the topological compression of a joke.
        """
        # 1. Calculate Surface Distance (The Setup's Expectation)
        # In a real model, this is the semantic distance in the embedding space.
        # We simulate it here: how many standard logical steps separate these concepts?
        # e.g., 'Librarian' -> 'Books' -> 'Psychology' -> 'Paranoia'
        surface_dist = self._simulate_semantic_distance(setup, punchline)

        # 2. Calculate Tunnel Distance (The Punchline's Logic)
        # How direct is the link if we accept the joke's premise?
        # e.g., 'Paranoia' -> 'They are watching' (Direct link)
        tunnel_dist = 1.0

        # 3. Calculate Compression
        # If surface is 10 steps, and tunnel is 1 step, ratio is 10.0
        ratio = surface_dist / tunnel_dist if tunnel_dist > 0 else 0

        return HumorMetric(surface_dist, tunnel_dist, ratio)

    def _simulate_semantic_distance(self, node_a: ThoughtNode, node_b: ThoughtNode) -> float:
        """
        Simulate embedding distance.
        High distance = Disparate concepts (The "Incongruity")
        """
        # Placeholder logic for demonstration
        # If nodes share metadata tags, they are close. If not, far.
        tags_a = set(node_a.metadata.get('tags', []))
        tags_b = set(node_b.metadata.get('tags', []))

        intersection = len(tags_a.intersection(tags_b))
        if intersection > 0:
            return 1.0 / intersection # Close
        return 10.0 # Far (High Potential for Humor)

def demonstrate_compression_tunnel():
    kernel = HumorAwareKernel()

    # Node A: The Setup
    setup = ThoughtNode(
        id="setup",
        node_type=NodeType.PREMISE,
        content="I asked the librarian for books on paranoia.",
        metadata={'tags': ['library', 'books', 'information']}
    )

    # Node Z: The Punchline
    punchline = ThoughtNode(
        id="punchline",
        node_type=NodeType.CLAIM,
        content="She whispered, 'They're right behind you.'",
        metadata={'tags': ['conspiracy', 'fear', 'whisper']} # Different tags!
    )

    # Measure
    metric = kernel.measure_humor_potential(setup, punchline)

    print(f"JOKE ANALYSIS: '{setup.content}' -> '{punchline.content}'")
    print(f"Surface Distance (Expectation): {metric.surface_distance} (High Entrophy)")
    print(f"Tunnel Distance (Punchline):    {metric.tunnel_distance} (Sudden Collapse)")
    print(f"Compression Ratio (Laughter):   {metric.compression_ratio}x")

    if metric.compression_ratio > 5.0:
        print("RESULT: Valid Compression Tunnel detected. Humor achieved.")
    else:
        print("RESULT: Just a statement. No compression.")

if __name__ == "__main__":
    demonstrate_compression_tunnel()