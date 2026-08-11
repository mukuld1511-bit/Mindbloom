import networkx as nx


class KnowledgeGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_entity(self, name: str, entity_type: str = "CONCEPT", importance: float = 1.0, context: str = ""):
        """Adds or updates an entity node in the graph."""
        clean_name = name.strip()
        if not clean_name:
            return
        
        if self.graph.has_node(clean_name):
            # Update existing node attributes
            node = self.graph.nodes[clean_name]
            node["importance"] = max(node.get("importance", 1.0), importance)
            if context and not node.get("context"):
                node["context"] = context
        else:
            self.graph.add_node(
                clean_name,
                type=entity_type,
                importance=importance,
                context=context or f"Key concept in {entity_type.lower()} domain."
            )

    def add_relationship(self, source: str, target: str, rel_type: str = "relates_to", confidence: float = 0.8):
        """Adds a directed relationship edge between entities."""
        src, tgt = source.strip(), target.strip()
        if not src or not tgt or src == tgt:
            return

        # Ensure nodes exist
        if not self.graph.has_node(src):
            self.add_entity(src, "CONCEPT", 1.0)
        if not self.graph.has_node(tgt):
            self.add_entity(tgt, "CONCEPT", 1.0)

        if self.graph.has_edge(src, tgt):
            self.graph[src][tgt]["confidence"] = max(self.graph[src][tgt].get("confidence", 0.5), confidence)
        else:
            self.graph.add_edge(src, tgt, relation=rel_type, confidence=confidence)

    def get_entity_context(self, entity_name: str) -> dict:
        """Returns entity metadata and immediate outgoing/incoming relationships."""
        if not self.graph.has_node(entity_name):
            return {"entity": entity_name, "found": False}

        node_data = self.graph.nodes[entity_name]
        outgoing = [
            {"target": tgt, "relation": data.get("relation", "relates_to"), "confidence": data.get("confidence", 0.8)}
            for tgt, data in self.graph[entity_name].items()
        ]
        incoming = [
            {"source": src, "relation": data.get("relation", "relates_to"), "confidence": data.get("confidence", 0.8)}
            for src, _, data in self.graph.in_edges(entity_name, data=True)
        ]

        return {
            "entity": entity_name,
            "found": True,
            "type": node_data.get("type", "CONCEPT"),
            "importance": node_data.get("importance", 1.0),
            "context": node_data.get("context", ""),
            "outgoing": outgoing,
            "incoming": incoming
        }

    def get_path(self, source: str, target: str) -> list[str]:
        """Calculates shortest path between two entities using NetworkX."""
        if not self.graph.has_node(source) or not self.graph.has_node(target):
            return []
        try:
            return nx.shortest_path(self.graph, source=source, target=target)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []

    def get_graph_stats(self) -> dict:
        """Returns topological statistics (nodes, edges, density via nx.density())."""
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()
        density = nx.density(self.graph) if num_nodes > 1 else 0.0

        return {
            "nodes_count": num_nodes,
            "edges_count": num_edges,
            "density": round(float(density), 4)
        }

    def to_json(self) -> dict:
        """
        Exports to exact {nodes: [...], edges: [...]} JSON shape expected by MindBloom frontend.
        Node shape: { id, label, type, importance, context }
        Edge shape: { id, source, target, relation, confidence }
        """
        nodes = []
        for node_id, data in self.graph.nodes(data=True):
            nodes.append({
                "id": node_id,
                "label": node_id,
                "type": data.get("type", "CONCEPT"),
                "importance": data.get("importance", 1.0),
                "context": data.get("context", "")
            })

        edges = []
        edge_idx = 1
        for src, tgt, data in self.graph.edges(data=True):
            edges.append({
                "id": f"e{edge_idx}",
                "source": src,
                "target": tgt,
                "relation": data.get("relation", "relates_to"),
                "confidence": data.get("confidence", 0.8)
            })
            edge_idx += 1

        return {
            "nodes": nodes,
            "edges": edges
        }
