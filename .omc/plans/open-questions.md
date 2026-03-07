# Open Questions

## Claude Code Optimization - 2026-03-06
- [ ] Auto-update preference: Should auto-updates be enabled or remain disabled? — Affects whether CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC should be removed
- [ ] Browser automation frequency: How often are chrome-devtools and claude-in-chrome used? — Determines if these can be disabled to reduce MCP context
- [ ] Design tools frequency: Is the pencil MCP server actively used? — Determines if this can be disabled to reduce MCP context

## CodeRabbit Findings Fix - 2026-03-07
- [x] Finding 1 Decision: Should `analisecoderabbit_debug.md` be removed or replaced with proper documentation? — **DECISION: Remove file (default action)** - File appears to be leftover debug artifact with no meaningful content. Can be recreated from git history if needed.

## RAG Pipeline Test Coverage - 2026-03-07
- [ ] Should we add performance regression tests with specific thresholds? — Affects whether test suite includes timing assertions. **Decision: Use CI-only performance tests with 20% margin (see Phase 5.1)**
- [x] Do we need to test the deprecated model-based re-ranking path in `rerankSourcesWithModel()`? — **DECISION: DO NOT test (Phase 2.3)** - Function intentionally throws; not in production path
- [ ] Should test fixtures include real Brazilian legal document excerpts or generic content? — Affects realism of test scenarios

