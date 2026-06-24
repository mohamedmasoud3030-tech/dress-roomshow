# Graphify

Use Graphify before broad codebase exploration.

When answering architecture questions, debugging unfamiliar behavior, or planning to search across files, first check whether `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` exist.

If the graph exists:

- Prefer targeted Graphify queries such as `graphify query "<question>"` before broad `rg`, `find`, or file-by-file inspection.
- Read `graphify-out/GRAPH_REPORT.md` for god nodes, communities, surprising connections, and suggested questions when you need broad orientation.
- Use `graphify path "<source>" "<target>"` or `graphify explain "<node>"` for relationship-heavy questions.
- After meaningful code or documentation changes, run `graphify . --update` when the CLI is available so the graph stays current.

If the graph does not exist or the Graphify CLI is unavailable, continue with normal repository inspection and mention the limitation when relevant.
