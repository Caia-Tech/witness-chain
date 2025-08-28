# WitnessChain

> 🚧 **Proof of Concept** - Real-time code monitoring and analytics dashboard

A SvelteKit-based application that demonstrates real-time file monitoring, code analysis, and search capabilities across multiple programming languages.

## Status

**Current:** Functional prototype with working real-time features  
**Production Ready:** No - see limitations below  
**Best Use:** Learning, experimentation, architectural reference

## What Works

- ✅ Real-time file monitoring via WebSockets (13ms average latency)
- ✅ Multi-language parsing (TypeScript, JavaScript, Rust, Svelte)
- ✅ Interactive dashboard with live updates
- ✅ Multiple search modes (full-text, semantic, regex, fuzzy)
- ✅ Analytics visualization with D3.js
- ✅ Comprehensive performance benchmarking suite

## Current Limitations

- ⚠️ Search performance needs optimization (semantic: 31ms/query)
- ⚠️ Many analysis features use pattern matching vs. proper AST parsing
- ⚠️ No persistence layer (memory-only)
- ⚠️ Missing authentication and security features
- ⚠️ Build system has some rough edges

## Architecture

```
├── src/lib/
│   ├── analytics/     # Code analysis and metrics
│   ├── components/    # Svelte UI components
│   ├── monitoring/    # File system monitoring
│   ├── search/        # Search engine and indexing
│   └── testing/       # Benchmark and testing utilities
├── benchmark-results/ # Performance analysis reports
└── test-data/        # Generated test files
```

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 to see the dashboard.

For real-time monitoring:
```bash
node real-monitor.js
```

To run performance benchmarks:
```bash
node live-benchmark.js
```

## Tech Stack

- **Frontend:** SvelteKit, TypeScript, D3.js
- **Real-time:** WebSockets
- **Monitoring:** Node.js filesystem watchers
- **Testing:** Vitest, comprehensive benchmarking suite

## Performance Results

Based on comprehensive benchmarking:
- **File Analysis:** 21ms average per file
- **Memory Usage:** <10MB for most operations  
- **Concurrent Operations:** 50+ parallel operations supported
- **WebSocket Latency:** Sub-15ms updates

See `benchmark-results/` for detailed performance analysis.

## Contributing

This is a learning-focused project. Contributions welcome, especially:
- Real AST parsing implementations
- Search algorithm optimizations
- Production-ready features (auth, persistence)
- Additional language support

## License

MIT - see [LICENSE](LICENSE) file.

---

*Built as an exploration of modern web architecture and real-time development tools.*