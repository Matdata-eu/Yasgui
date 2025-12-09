# YASGUI

**Yet Another SPARQL GUI (YASGUI)** is a powerful, user-friendly web-based interface for querying and exploring RDF data using SPARQL. It combines a feature-rich query editor (YASQE) with a versatile results viewer (YASR) to provide a comprehensive SPARQL IDE.

🌐 **Try it now**: [https://yasgui.matdata.eu/](https://yasgui.matdata.eu/)

[![npm version](https://img.shields.io/npm/v/@matdata/yasgui)](https://www.npmjs.com/package/@matdata/yasgui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Links

- 📖 **[User Guide](./docs/user-guide.md)** - Complete guide for end users
- 🛠️ **[Developer Guide](./docs/developer-guide.md)** - API reference and integration guide
- 🚀 **[Production Environment](https://yasgui.matdata.eu/)** - Live instance
- 📦 **[npm Package](https://www.npmjs.com/package/@matdata/yasgui)**
- 🐳 **[Docker Hub](https://hub.docker.com/r/mathiasvda/yasgui)**
- 📝 **[Releases & Changelog](https://github.com/Matdata-eu/Yasgui/releases)**
- 💻 **[GitHub Repository](https://github.com/Matdata-eu/Yasgui)**

---

## Documentation

The **documentation for YASGUI is now hosted on GitHub Pages**:

- **Documentation Website**: [https://matdata-eu.github.io/Yasgui/](https://matdata-eu.github.io/Yasgui/) (coming soon with Docusaurus)
- **Development Environment**: [https://matdata-eu.github.io/Yasgui/dev/main/](https://matdata-eu.github.io/Yasgui/dev/main/) - Live build from the main branch

The documentation is version-tagged with the repository, ensuring consistency between code and docs.

## Features

YASGUI provides a complete SPARQL development environment with powerful features:

### 🎨 Themes & Layouts
- **[Light & Dark Themes](./docs/user-guide.md#themes)** - Seamless theme switching with persistent preferences
- **[Flexible Layouts](./docs/user-guide.md#layout-orientation)** - Vertical or horizontal editor/results arrangement
- **System Detection** - Automatically matches your OS theme preference

### ✏️ Advanced Query Editor
- **[SPARQL Syntax Highlighting](./docs/user-guide.md#yasqe-query-editor)** - Color-coded SPARQL with error detection
- **[Smart Autocomplete](./docs/user-guide.md#prefix-management)** - Context-aware suggestions for keywords, prefixes, and URIs
- **[Query Formatting](./docs/user-guide.md#query-formatting)** - One-click query beautification with configurable formatters
- **[Prefix Management](./docs/user-guide.md#prefix-management)** - Auto-capture and reuse PREFIX declarations
- **[URI Explorer](./docs/user-guide.md#uri-explorer)** - Ctrl+Click URIs to explore connections
- **[Keyboard Shortcuts](./docs/user-guide.md#keyboard-shortcuts)** - Efficient query development workflow

### 📊 Powerful Visualizations
- **[Table Plugin](./docs/user-guide.md#table-plugin)** - Sortable, filterable, paginated result tables
- **[Graph Plugin](./docs/user-guide.md#graph-plugin)** - Interactive RDF graph visualization
- **[Geo Plugin](./docs/user-guide.md#geo-plugin)** - Geographic data on interactive maps
- **[Response Plugin](./docs/user-guide.md#response-plugin)** - Raw response viewer with syntax highlighting
- **[Boolean Plugin](./docs/user-guide.md#boolean-plugin)** - Visual true/false indicators for ASK queries
- **[Error Plugin](./docs/user-guide.md#error-plugin)** - Detailed error diagnostics

### 🔧 Developer Features
- **[Multiple Tabs](./docs/user-guide.md#query-tabs)** - Work on multiple queries simultaneously
- **[Endpoint Management](./docs/user-guide.md#endpoint-quick-switch)** - Quick-switch between SPARQL endpoints
- **[Persistent Storage](./docs/user-guide.md#query-history-and-persistence)** - Auto-save queries and preferences
- **[URL Sharing](./docs/user-guide.md#share-queries)** - Share queries via URL parameters
- **[Fullscreen Mode](./docs/user-guide.md#fullscreen-mode)** - Maximize editor or results viewer
- **[Export Results](./docs/developer-guide.md#yasr-class)** - Download results in various formats

For detailed feature documentation, see the **[User Guide](./docs/user-guide.md)**.

## Installation

### npm

```bash
npm install @matdata/yasgui
```

### Yarn

```bash
yarn add @matdata/yasgui
```

### CDN

```html
<link rel="stylesheet" href="https://unpkg.com/@matdata/yasgui/build/yasgui.min.css" />
<script src="https://unpkg.com/@matdata/yasgui/build/yasgui.min.js"></script>
```

### Docker

```bash
docker pull mathiasvda/yasgui:latest
docker run -p 8080:8080 mathiasvda/yasgui:latest
```

**Custom endpoint:**
```bash
docker run -p 8080:8080 -e YASGUI_DEFAULT_ENDPOINT=https://your-endpoint.com/sparql mathiasvda/yasgui:latest
```

For detailed installation instructions and usage examples, see the **[Developer Guide](./docs/developer-guide.md#installation)**.

## Quick Start

### Basic HTML Usage

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/@matdata/yasgui/build/yasgui.min.css" />
</head>
<body>
  <div id="yasgui"></div>
  
  <script src="https://unpkg.com/@matdata/yasgui/build/yasgui.min.js"></script>
  <script>
    const yasgui = new Yasgui(document.getElementById("yasgui"), {
      requestConfig: {
        endpoint: "https://dbpedia.org/sparql"
      }
    });
  </script>
</body>
</html>
```

### ES Modules / React / Vue / Angular

```javascript
import Yasgui from '@matdata/yasgui';
import '@matdata/yasgui/build/yasgui.min.css';

const yasgui = new Yasgui(document.getElementById('yasgui'), {
  requestConfig: {
    endpoint: 'https://query.wikidata.org/sparql'
  },
  theme: 'dark',
  orientation: 'horizontal'
});
```

For framework-specific examples and advanced usage, see the **[Developer Guide](./docs/developer-guide.md#usage-examples)**.

---

## Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Clone and install: `npm install`
3. Run dev server: `npm run dev`
4. Make your changes
5. Run tests: `npm test`
6. Submit a pull request

For detailed contribution guidelines, see the **[Developer Guide](./docs/developer-guide.md#contributing)**.

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

This is a fork from [Zazuko](https://github.com/zazuko/Yasgui) who forked it from [Triply](https://github.com/TriplyDB/Yasgui).

---

## Release Notes & Changelog

Release notes and changelog are available in the [Releases](https://github.com/Matdata-eu/Yasgui/releases) section.

For instructions on writing release notes, see [RELEASE_NOTES_INSTRUCTIONS.md](./docs/RELEASE_NOTES_INSTRUCTIONS.md)