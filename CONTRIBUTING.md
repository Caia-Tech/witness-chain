# Contributing to WitnessChain

Thank you for your interest in contributing to WitnessChain! This project welcomes contributions from developers of all skill levels.

## Current Status

WitnessChain is a **proof-of-concept** project demonstrating real-time code monitoring architecture. While functional, many components use pattern matching rather than proper AST parsing, and several production features are missing.

## Ways to Contribute

### 🔥 High-Impact Areas

**Real AST Parsing**
- Replace regex-based analysis with proper AST parsing
- Languages: TypeScript, JavaScript, Rust, Svelte
- Libraries: `@typescript/compiler-api`, `@babel/parser`, `tree-sitter`

**Search Performance Optimization**
- Current semantic search: 31ms per query (too slow)
- Implement proper indexing strategies
- Add result caching and relevance ranking

**Production Features**
- Authentication and authorization
- Database persistence (PostgreSQL/SQLite)
- Configuration management
- Error handling and logging

### 🛠️ Medium-Impact Areas

**Additional Language Support**
- Python, Go, Java, C++, etc.
- Follow existing patterns in `FileAnalyzer.ts`

**UI/UX Improvements**
- Mobile responsiveness
- Accessibility features
- Dark/light theme toggle
- Performance optimizations

**Testing & Documentation**
- Increase test coverage
- Add integration tests
- Document architecture decisions
- Create deployment guides

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
git clone https://github.com/Caia-Tech/witness-chain.git
cd witness-chain
npm install
npm run dev
```

### Testing
```bash
npm run test:unit          # Unit tests
npm run test:e2e           # E2E tests
node live-benchmark.js     # Performance benchmarks
```

## Code Style

- **TypeScript** for all new code
- **Prettier** for formatting (`npm run format`)
- **ESLint** for linting (`npm run lint`)
- **Conventional commits** preferred

## Submitting Changes

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add/update tests** if applicable
5. **Run the test suite**: `npm run test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to your fork**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

## Pull Request Guidelines

### Good PR Titles
- ✅ "Add TypeScript AST parsing for better analysis"
- ✅ "Optimize search performance with caching layer"
- ✅ "Fix WebSocket connection handling edge cases"

### PR Description Should Include
- **What**: Brief description of changes
- **Why**: Problem being solved or feature being added
- **How**: Approach taken (especially for complex changes)
- **Testing**: How the changes were tested

### Review Process
- All PRs require review before merging
- CI checks must pass (linting, tests)
- Maintainers will provide constructive feedback
- Be patient - this is a learning-focused project!

## Issues and Feature Requests

### Before Opening an Issue
- Check existing issues to avoid duplicates
- For bugs: include steps to reproduce
- For features: explain the use case and benefit

### Issue Labels
- `good first issue` - Great for new contributors
- `help wanted` - Community input needed
- `enhancement` - New feature requests
- `bug` - Something isn't working
- `documentation` - Documentation improvements

## Architecture Notes

### Key Components
- `src/lib/monitoring/` - File system monitoring
- `src/lib/analytics/` - Code analysis and metrics
- `src/lib/search/` - Search engine and indexing
- `src/lib/components/` - Svelte UI components

### Current Limitations
- Pattern matching vs. proper parsing
- No persistence layer
- Memory-only data storage
- Mock implementations in several areas

## Questions?

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and ideas
- **Email** - For sensitive topics or private questions

## Recognition

Contributors will be acknowledged in:
- README.md contributor section
- Release notes for significant contributions
- GitHub contributor statistics

---

**Remember**: This is a learning-focused project. Don't worry about perfect code - we're all here to learn and improve together! 🚀