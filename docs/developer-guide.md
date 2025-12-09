# YASGUI Developer Guide

This comprehensive guide covers everything developers need to know to integrate, customize, and extend YASGUI (Yet Another SPARQL GUI).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation](#installation)
3. [Usage Examples](#usage-examples)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Events](#events)
7. [Plugin Development](#plugin-development)
8. [Contributing](#contributing)

---

## Architecture Overview

YASGUI is built as a monorepo with four main packages, each serving a specific purpose in the SPARQL querying workflow.

### Package Structure

```
@matdata/yasgui (root)
├── @matdata/yasgui-utils     - Shared utilities
├── @matdata/yasqe            - SPARQL Query Editor
├── @matdata/yasr             - SPARQL Results Viewer
└── @matdata/yasgui           - Main integration package
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          YASGUI                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Tab Management Layer                    │  │
│  │  - Multiple query tabs                               │  │
│  │  - Tab persistence                                   │  │
│  │  - Theme management                                  │  │
│  │  - Settings & configuration                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────────┐         ┌─────────────────────┐  │
│  │      YASQE          │         │       YASR          │  │
│  │  (Query Editor)     │         │  (Results Viewer)   │  │
│  │                     │         │                     │  │
│  │  ┌──────────────┐  │         │  ┌──────────────┐  │  │
│  │  │ CodeMirror   │  │         │  │  Plugins     │  │  │
│  │  │ - Syntax     │  │         │  │  - Table     │  │  │
│  │  │ - Validation │  │         │  │  - Graph     │  │  │
│  │  │ - Autocomplete│ │         │  │  - Geo       │  │  │
│  │  └──────────────┘  │         │  │  - Boolean   │  │  │
│  │                     │         │  │  - Response  │  │  │
│  │  ┌──────────────┐  │         │  │  - Error     │  │  │
│  │  │ SPARQL       │  │         │  └──────────────┘  │  │
│  │  │ Execution    │  ├────────▶│                     │  │
│  │  └──────────────┘  │         │  ┌──────────────┐  │  │
│  │                     │         │  │ Parser       │  │  │
│  │  ┌──────────────┐  │         │  │ - JSON       │  │  │
│  │  │ Prefixes     │  │         │  │ - XML        │  │  │
│  │  │ Management   │  │         │  │ - CSV        │  │  │
│  │  └──────────────┘  │         │  │ - Turtle     │  │  │
│  └────────────────────┘         │  └──────────────┘  │  │
│                                   └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Uses
                              ▼
                    ┌──────────────────┐
                    │  YASGUI-UTILS    │
                    │  - DOM helpers   │
                    │  - Storage       │
                    │  - Utilities     │
                    └──────────────────┘
```

### Package Details

#### @matdata/yasgui-utils

**Purpose**: Shared utility functions and helpers used across all packages.

**Key Features:**
- DOM manipulation utilities
- Local storage abstraction
- Common helper functions
- SVG icon rendering
- DOMPurify integration for XSS protection

**Exports:**
- `Storage`: localStorage abstraction with namespacing
- `addClass`, `removeClass`, `hasClass`: DOM class utilities
- `drawSvgStringAsElement`: SVG helper
- `drawFontAwesomeIconAsSvg`: Icon rendering

#### @matdata/yasqe (SPARQL Query Editor)

**Purpose**: Rich SPARQL query editor built on CodeMirror.

**Key Features:**
- SPARQL syntax highlighting
- Auto-completion (keywords, prefixes, properties, classes)
- Query validation with error highlighting
- Prefix management and auto-completion
- Query execution
- Query formatting (sparql-formatter integration)
- Persistent storage
- Keyboard shortcuts

**Core Components:**
- CodeMirror editor with SPARQL mode
- SPARQL tokenizer/grammar
- Autocomplete system (extensible)
- HTTP request handler
- Prefix utilities

#### @matdata/yasr (SPARQL Results Viewer)

**Purpose**: Flexible results visualization with plugin system.

**Key Features:**
- Plugin-based architecture
- Multiple built-in visualization plugins
- Result parsing (JSON, XML, CSV, Turtle)
- Export functionality
- Persistent plugin selection
- Theme support

**Core Components:**
- Plugin manager
- Result parsers
- Plugin API
- Header controls
- Download manager

#### @matdata/yasgui (Main Package)

**Purpose**: Integrates YASQE and YASR into a complete SPARQL IDE.

**Key Features:**
- Tab management (multiple queries)
- Endpoint management and quick-switch buttons
- Theme system (light/dark)
- Layout orientation (vertical/horizontal)
- Settings modal
- Tab persistence
- Event system
- URL-based query sharing

**Core Components:**
- Tab manager
- Theme manager
- Persistent configuration
- Settings modal
- Endpoint selector
- Tab context menu

---

## Installation

### npm

Install the main package (includes all components):

```bash
npm install @matdata/yasgui
```

Install individual packages:

```bash
npm install @matdata/yasqe    # Query editor only
npm install @matdata/yasr     # Results viewer only
npm install @matdata/yasgui-utils  # Utilities only
```

### Yarn

```bash
yarn add @matdata/yasgui
```

### CDN

Include YASGUI directly from a CDN (replace `VERSION` with the desired version):

```html
<!-- CSS -->
<link rel="stylesheet" href="https://unpkg.com/@matdata/yasgui@VERSION/build/yasgui.min.css" />

<!-- JavaScript -->
<script src="https://unpkg.com/@matdata/yasgui@VERSION/build/yasgui.min.js"></script>
```

**Latest version:**
```html
<link rel="stylesheet" href="https://unpkg.com/@matdata/yasgui/build/yasgui.min.css" />
<script src="https://unpkg.com/@matdata/yasgui/build/yasgui.min.js"></script>
```

### Source

Clone and build from source:

```bash
git clone https://github.com/Matdata-eu/Yasgui.git
cd Yasgui
npm install
npm run build
```

Build output is in the `build/` directory.

---

## Usage Examples

### Plain HTML

Basic integration in a static HTML page:

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

### Node.js / ES Modules

Using YASGUI in a Node.js application or with module bundlers:

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

### CommonJS

```javascript
const Yasgui = require('@matdata/yasgui');
require('@matdata/yasgui/build/yasgui.min.css');

const yasgui = new Yasgui(document.getElementById('yasgui'));
```

### React

Integration with React:

```jsx
import React, { useEffect, useRef } from 'react';
import Yasgui from '@matdata/yasgui';
import '@matdata/yasgui/build/yasgui.min.css';

function YasguiComponent() {
  const containerRef = useRef(null);
  const yasguiRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !yasguiRef.current) {
      yasguiRef.current = new Yasgui(containerRef.current, {
        requestConfig: {
          endpoint: 'https://dbpedia.org/sparql'
        }
      });

      // Listen to events
      yasguiRef.current.on('query', (instance, tab) => {
        console.log('Query executed on tab:', tab.getName());
      });
    }

    // Cleanup
    return () => {
      // Yasgui doesn't require explicit cleanup
      // but you can add custom cleanup logic here
    };
  }, []);

  return <div ref={containerRef} style={{ height: '100vh' }} />;
}

export default YasguiComponent;
```

### Vue

Integration with Vue 3:

```vue
<template>
  <div ref="yasguiContainer" class="yasgui-container"></div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import Yasgui from '@matdata/yasgui';
import '@matdata/yasgui/build/yasgui.min.css';

export default {
  name: 'YasguiComponent',
  setup() {
    const yasguiContainer = ref(null);
    let yasgui = null;

    onMounted(() => {
      yasgui = new Yasgui(yasguiContainer.value, {
        requestConfig: {
          endpoint: 'https://dbpedia.org/sparql'
        },
        theme: 'dark'
      });

      yasgui.on('queryResponse', (instance, tab) => {
        console.log('Query completed:', tab.getName());
      });
    });

    onUnmounted(() => {
      // Cleanup if needed
      yasgui = null;
    });

    return {
      yasguiContainer
    };
  }
};
</script>

<style scoped>
.yasgui-container {
  height: 100vh;
  width: 100%;
}
</style>
```

### Angular

Integration with Angular:

```typescript
// yasgui.component.ts
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import Yasgui from '@matdata/yasgui';
import '@matdata/yasgui/build/yasgui.min.css';

@Component({
  selector: 'app-yasgui',
  template: '<div #yasguiContainer style="height: 100vh"></div>',
  styleUrls: ['./yasgui.component.css']
})
export class YasguiComponent implements OnInit {
  @ViewChild('yasguiContainer', { static: true }) 
  yasguiContainer!: ElementRef;
  
  private yasgui: any;

  ngOnInit(): void {
    this.yasgui = new Yasgui(this.yasguiContainer.nativeElement, {
      requestConfig: {
        endpoint: 'https://dbpedia.org/sparql'
      }
    });

    this.yasgui.on('query', (instance: any, tab: any) => {
      console.log('Query executed:', tab.getName());
    });
  }

  ngOnDestroy(): void {
    // Cleanup
    this.yasgui = null;
  }
}
```

### Using YASQE and YASR Separately

You can use the query editor and results viewer independently:

```javascript
import Yasqe from '@matdata/yasqe';
import Yasr from '@matdata/yasr';
import '@matdata/yasqe/build/yasqe.min.css';
import '@matdata/yasr/build/yasr.min.css';

// Create query editor
const yasqe = new Yasqe(document.getElementById('yasqe'), {
  value: 'SELECT * WHERE { ?s ?p ?o } LIMIT 10',
  requestConfig: {
    endpoint: 'https://dbpedia.org/sparql'
  }
});

// Create results viewer
const yasr = new Yasr(document.getElementById('yasr'), {
  prefixes: yasqe.getPrefixes()
});

// Connect them
yasqe.on('queryResponse', (yasqe, response, duration) => {
  yasr.setResponse(response, duration);
});

// Execute query
yasqe.query();
```

---

## Configuration

YASGUI offers extensive configuration options to customize behavior and appearance.

### YASGUI Configuration

Complete configuration object with all available options:

```typescript
interface Config {
  // Auto-focus editor on load or tab switch
  autofocus: boolean;  // default: true

  // Custom endpoint info renderer
  endpointInfo?: (tab?: Tab) => Element;

  // Copy endpoint to new tabs
  copyEndpointOnNewTab: boolean;  // default: true

  // Default tab name
  tabName: string;  // default: "Query"

  // CORS proxy URL
  corsProxy?: string;

  // Endpoint catalogue configuration
  endpointCatalogueOptions: EndpointSelectConfig;

  // Quick-switch endpoint buttons
  endpointButtons?: EndpointButton[];

  // Populate config from URL parameters
  populateFromUrl: boolean | ((config: TabJson) => TabJson);  // default: true

  // Auto-create first tab on init
  autoAddOnInit: boolean;  // default: true

  // Persistence ID for localStorage
  persistenceId: string | ((yasgui: Yasgui) => string) | null;

  // Persistence labels
  persistenceLabelConfig: string;  // default: "config"
  persistenceLabelResponse: string;  // default: "response"

  // Persistence expiry (seconds)
  persistencyExpire: number;  // default: 2592000 (30 days)

  // YASQE configuration
  yasqe: Partial<YasqeConfig>;

  // YASR configuration
  yasr: YasrConfig;

  // Request configuration
  requestConfig: RequestConfig;

  // Context menu container element
  contextMenuContainer?: HTMLElement;

  // Non-SSL domain for mixed content
  nonSslDomain?: string;

  // Theme: 'light' or 'dark'
  theme?: 'light' | 'dark';

  // Show theme toggle button
  showThemeToggle?: boolean;  // default: true

  // Layout orientation: 'vertical' or 'horizontal'
  orientation?: 'vertical' | 'horizontal';  // default: 'vertical'
}
```

#### Example Configuration

```javascript
const yasgui = new Yasgui(document.getElementById('yasgui'), {
  // Basic settings
  autofocus: true,
  tabName: 'My Query',
  theme: 'dark',
  orientation: 'horizontal',
  
  // Endpoint configuration
  requestConfig: {
    endpoint: 'https://dbpedia.org/sparql',
    method: 'POST'
  },
  
  // Quick-switch buttons
  endpointButtons: [
    { endpoint: 'https://dbpedia.org/sparql', label: 'DBpedia' },
    { endpoint: 'https://query.wikidata.org/sparql', label: 'Wikidata' }
  ],
  
  // Persistence
  persistenceId: 'my-yasgui-instance',
  persistencyExpire: 60 * 60 * 24 * 7,  // 7 days
  
  // YASQE config
  yasqe: {
    value: 'SELECT * WHERE { ?s ?p ?o } LIMIT 10',
    lineNumbers: true,
    showQueryButton: true
  },
  
  // YASR config
  yasr: {
    defaultPlugin: 'table',
    maxPersistentResponseSize: 500000
  }
});
```

### YASQE Configuration

YASQE (editor) specific configuration options:

```typescript
interface YasqeConfig {
  // Initial query value
  value?: string;

  // CodeMirror mode
  mode: string;  // default: 'sparql11'

  // Theme
  theme: string;  // default: 'default'

  // Line numbers
  lineNumbers: boolean;  // default: true

  // Line wrapping
  lineWrapping: boolean;  // default: false

  // Tab size
  tabSize: number;  // default: 2

  // Indent unit
  indentUnit: number;  // default: 2

  // Auto close brackets
  autoCloseBrackets: boolean;  // default: true

  // Match brackets
  matchBrackets: boolean;  // default: true

  // Fold gutter (code folding)
  foldGutter: boolean;  // default: true

  // Show query button
  showQueryButton: boolean;  // default: true

  // Show share button
  showShareButton: boolean;  // default: false

  // Persistent storage ID
  persistenceId?: string | ((yasqe: Yasqe) => string);

  // Request configuration
  requestConfig: RequestConfig;

  // Autocomplete configuration
  autocomplete: {
    enabled: boolean;
    completerConfigs: CompleterConfig[];
  };

  // Editor height
  editorHeight: string;  // default: '300px'

  // Resizable editor
  resizeable: boolean;  // default: true
}
```

#### YASQE Example

```javascript
import Yasqe from '@matdata/yasqe';

const yasqe = new Yasqe(document.getElementById('yasqe'), {
  value: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?label WHERE {
  ?s rdfs:label ?label
} LIMIT 10`,
  
  theme: 'material-palenight',
  lineNumbers: true,
  lineWrapping: false,
  showQueryButton: true,
  editorHeight: '400px',
  
  requestConfig: {
    endpoint: 'https://dbpedia.org/sparql',
    method: 'POST',
    headers: {
      'Accept': 'application/sparql-results+json'
    }
  },
  
  autocomplete: {
    enabled: true,
    completerConfigs: [
      { name: 'prefixes', enabled: true },
      { name: 'properties', enabled: true },
      { name: 'classes', enabled: true }
    ]
  }
});
```

### YASR Configuration

YASR (results viewer) specific configuration options:

```typescript
interface YasrConfig {
  // Default plugin to use
  defaultPlugin?: string;

  // Plugin configurations
  plugins: {
    [pluginName: string]: {
      // Plugin-specific options
      // Priority for plugin selection (higher = preferred)
      priority?: number;
    };
  };

  // Prefixes for result display
  prefixes?: Prefixes;

  // Max response size to persist (bytes)
  maxPersistentResponseSize: number;  // default: 500000

  // Persistent storage ID
  persistenceId?: string | ((yasr: Yasr) => string);

  // Persistence labels
  persistenceLabelConfig: string;
  persistenceLabelResponse: string;

  // Download filename
  downloadFilename?: string | ((yasr: Yasr) => string);

  // Error renderers
  errorRenderers?: ErrorRenderer[];
}
```

#### YASR Example

```javascript
import Yasr from '@matdata/yasr';

const yasr = new Yasr(document.getElementById('yasr'), {
  defaultPlugin: 'table',
  
  plugins: {
    table: {
      priority: 10,
      pageSize: 50
    },
    graph: {
      priority: 5
    },
    response: {
      priority: 1
    }
  },
  
  prefixes: {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    foaf: 'http://xmlns.com/foaf/0.1/'
  },
  
  maxPersistentResponseSize: 1000000,  // 1MB
  
  downloadFilename: (yasr) => {
    return `results-${new Date().toISOString()}.csv`;
  }
});
```

### Request Configuration

HTTP request configuration for SPARQL queries:

```typescript
interface RequestConfig {
  // SPARQL endpoint URL
  endpoint: string;

  // HTTP method
  method: 'GET' | 'POST';  // default: 'POST'

  // Accept header
  acceptHeaderGraph?: string;
  acceptHeaderSelect?: string;
  acceptHeaderUpdate?: string;

  // Named graphs
  namedGraphs?: string[];

  // Default graphs
  defaultGraphs?: string[];

  // Custom headers
  headers?: { [key: string]: string };

  // Custom arguments (URL parameters)
  args?: Array<{ name: string; value: string }>;

  // Adjust query before request
  adjustQueryBeforeRequest?: (query: string) => string;

  // CORS proxy
  corsProxy?: string;
}
```

#### Request Configuration Example

```javascript
const config = {
  requestConfig: {
    endpoint: 'https://dbpedia.org/sparql',
    method: 'POST',
    
    acceptHeaderSelect: 'application/sparql-results+json',
    acceptHeaderGraph: 'text/turtle',
    
    namedGraphs: ['http://dbpedia.org'],
    
    headers: {
      'User-Agent': 'MyApp/1.0'
    },
    
    args: [
      { name: 'timeout', value: '30000' },
      { name: 'debug', value: 'on' }
    ],
    
    adjustQueryBeforeRequest: (query) => {
      // Add timestamp comment
      return `# Query executed at ${new Date().toISOString()}\n${query}`;
    }
  }
};
```

### Endpoint Buttons Configuration

The endpoint quick switch buttons feature allows you to configure a list of predefined SPARQL endpoints that users can quickly switch between with a single click.

**Interface:**

```typescript
interface EndpointButton {
  endpoint: string;  // SPARQL endpoint URL (required)
  label: string;     // Button text displayed to user (required)
}
```

**Configuration:**

```javascript
const yasgui = new Yasgui(document.getElementById("yasgui"), {
  endpointButtons: [
    { endpoint: "https://dbpedia.org/sparql", label: "DBpedia" },
    { endpoint: "https://query.wikidata.org/sparql", label: "Wikidata" },
    { endpoint: "https://example.com/sparql", label: "Custom" }
  ]
});
```

**Complete Example:**

```javascript
const yasgui = new Yasgui(document.getElementById("yasgui"), {
  requestConfig: {
    endpoint: "https://dbpedia.org/sparql"
  },
  endpointButtons: [
    { endpoint: "https://dbpedia.org/sparql", label: "DBpedia" },
    { endpoint: "https://query.wikidata.org/bigdata/namespace/wdq/sparql", label: "Wikidata" },
    { endpoint: "https://data-interop.era.europa.eu/api/sparql", label: "ERA" }
  ]
});
```

**Features:**

- **Predefined Buttons**: Configure endpoint buttons during YASGUI initialization
- **User-Defined Buttons**: Users can add their own custom buttons through the Settings modal
- **One-Click Switching**: Instantly switch to a different SPARQL endpoint with a single click
- **Persistent Storage**: User-defined buttons are saved in local storage
- **Fully Themed**: Buttons automatically adapt to light and dark themes
- **Accessible**: Buttons include ARIA labels for accessibility

**Behavior:**

- Buttons are displayed next to the endpoint textbox in the controlbar
- Clicking a button immediately updates the endpoint textbox with the configured endpoint
- The endpoint change triggers the same behavior as manually entering an endpoint
- Buttons are fully accessible with ARIA labels

**User-Defined Custom Buttons:**

Users can add their own custom endpoint buttons through the Settings menu:
1. Click the Settings button (⚙) in the controlbar
2. Navigate to the "Endpoint Buttons" tab
3. Enter a button label and endpoint URL
4. Click "+ Add Button"
5. Click "Save" to apply changes

Custom buttons are persisted in local storage and will appear alongside the configured buttons.

**CSS Customization:**

You can customize button appearance using CSS variables:

```css
:root {
  --yasgui-endpoint-button-bg: #f0f0f0;
  --yasgui-endpoint-button-border: #ccc;
  --yasgui-endpoint-button-text: #333;
  --yasgui-endpoint-button-hover-bg: #e0e0e0;
  --yasgui-endpoint-button-hover-border: #999;
  --yasgui-endpoint-button-focus: #0066cc;
}
```

### Theme Configuration

YASGUI supports both light and dark themes with comprehensive customization options.

**Configuration Options:**

```javascript
// Set initial theme
const yasgui = new Yasgui(element, {
  theme: 'dark',           // 'light' or 'dark'
  showThemeToggle: true    // Show/hide theme toggle button (default: true)
});
```

**Programmatic Theme Control:**

```javascript
// Get current theme
const currentTheme = yasgui.getTheme(); // Returns 'light' or 'dark'

// Set theme
yasgui.setTheme('dark');  // Switch to dark theme
yasgui.setTheme('light'); // Switch to light theme

// Toggle theme
const newTheme = yasgui.toggleTheme(); // Switch and return new theme
```

**TypeScript Support:**

```typescript
import Yasgui, { Theme } from '@matdata/yasgui';

const theme: Theme = 'dark'; // Type-safe: only 'light' or 'dark' allowed
yasgui.setTheme(theme);
```

**Theme Persistence:**

The selected theme is automatically saved to localStorage under the key `yasgui_theme`:
- Theme preference persists across page reloads
- Each user's preference is independent
- No server-side configuration needed

**System Theme Detection:**

If no theme is explicitly set and no saved preference exists, YASGUI will:
1. Check the system's color scheme preference (`prefers-color-scheme` media query)
2. Apply dark theme if system prefers dark mode
3. Apply light theme otherwise
4. Automatically update if the user changes their system preference

**CSS Customization:**

You can customize theme colors by overriding CSS custom properties:

```css
/* Custom dark theme colors */
[data-theme="dark"] {
  --yasgui-bg-primary: #0d1117;
  --yasgui-accent-color: #58a6ff;
  /* Override other variables as needed */
}
```

**Available CSS Custom Properties:**

```css
--yasgui-bg-primary       /* Primary background color */
--yasgui-bg-secondary     /* Secondary background (hover states, etc.) */
--yasgui-bg-tertiary      /* Tertiary background */
--yasgui-text-primary     /* Primary text color */
--yasgui-text-secondary   /* Secondary text color */
--yasgui-text-muted       /* Muted text color */
--yasgui-border-color     /* Primary border color */
--yasgui-link-color       /* Link color */
--yasgui-accent-color     /* Accent color for highlights */
--yasgui-error-color      /* Error message color */
/* ... and more */
```

**Browser Compatibility:**

Themes work in all modern browsers that support:
- CSS Custom Properties
- localStorage
- Media Queries (for system theme detection)

This includes all recent versions of Chrome, Firefox, Safari, and Edge.

---

## API Reference

### Yasgui Class

Main YASGUI instance.

#### Constructor

```typescript
new Yasgui(parent: HTMLElement, config?: PartialConfig)
```

**Parameters:**
- `parent`: DOM element to attach YASGUI to
- `config`: Optional configuration object

**Example:**
```javascript
const yasgui = new Yasgui(document.getElementById('yasgui'), {
  requestConfig: { endpoint: 'https://dbpedia.org/sparql' }
});
```

#### Methods

##### `getTab(tabId?: string): Tab | undefined`

Get a tab instance by ID. If no ID provided, returns current tab.

```javascript
const currentTab = yasgui.getTab();
const specificTab = yasgui.getTab('tab-123');
```

##### `addTab(select?: boolean, config?: PartialTabConfig): Tab`

Add a new query tab.

**Parameters:**
- `select`: Whether to select the new tab (default: false)
- `config`: Optional tab configuration

```javascript
const newTab = yasgui.addTab(true, {
  name: 'My Query',
  yasqe: {
    value: 'SELECT * WHERE { ?s ?p ?o } LIMIT 10'
  }
});
```

##### `selectTabId(tabId: string): void`

Select a tab by ID.

```javascript
yasgui.selectTabId('tab-123');
```

##### `closeTab(tab: Tab): void`

Close a tab.

```javascript
const tab = yasgui.getTab();
yasgui.closeTab(tab);
```

##### `getTabs(): { [tabId: string]: Tab }`

Get all tabs.

```javascript
const allTabs = yasgui.getTabs();
Object.keys(allTabs).forEach(id => {
  console.log('Tab:', allTabs[id].getName());
});
```

##### `setTheme(theme: 'light' | 'dark'): void`

Set the theme.

```javascript
yasgui.setTheme('dark');
```

##### `getTheme(): 'light' | 'dark'`

Get the current theme.

```javascript
const theme = yasgui.getTheme();
console.log('Current theme:', theme);
```

##### `toggleTheme(): 'light' | 'dark'`

Toggle between themes and return the new theme.

```javascript
const newTheme = yasgui.toggleTheme();
console.log('Switched to:', newTheme);
```

### Tab Class

Represents a query tab.

#### Methods

##### `getName(): string`

Get tab name.

```javascript
const name = tab.getName();
```

##### `setName(name: string): void`

Set tab name.

```javascript
tab.setName('My Query Tab');
```

##### `getId(): string`

Get tab ID.

```javascript
const id = tab.getId();
```

##### `getYasqe(): Yasqe`

Get YASQE instance for this tab.

```javascript
const yasqe = tab.getYasqe();
yasqe.setValue('SELECT * WHERE { ?s ?p ?o }');
```

##### `getYasr(): Yasr`

Get YASR instance for this tab.

```javascript
const yasr = tab.getYasr();
yasr.draw();
```

##### `query(): Promise<void>`

Execute the query in this tab.

```javascript
tab.query()
  .then(() => console.log('Query completed'))
  .catch(err => console.error('Query failed:', err));
```

##### `setQuery(query: string): void`

Set the query value.

```javascript
tab.setQuery('SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10');
```

##### `getQuery(): string`

Get the current query.

```javascript
const query = tab.getQuery();
console.log('Current query:', query);
```

### Yasqe Class

SPARQL query editor.

#### Methods

##### `getValue(): string`

Get the query text.

```javascript
const query = yasqe.getValue();
```

##### `setValue(value: string): void`

Set the query text.

```javascript
yasqe.setValue('SELECT * WHERE { ?s ?p ?o } LIMIT 10');
```

##### `query(): Promise<any>`

Execute the query.

```javascript
yasqe.query()
  .then(response => console.log('Results:', response))
  .catch(err => console.error('Error:', err));
```

##### `abortQuery(): void`

Abort the current query.

```javascript
yasqe.abortQuery();
```

##### `format(): void`

Format the query using the selected formatter.

```javascript
yasqe.format();
```

##### `getPrefixes(): Prefixes`

Get defined prefixes in the query.

```javascript
const prefixes = yasqe.getPrefixes();
console.log('Prefixes:', prefixes);
```

##### `addPrefixes(prefixes: Prefixes): void`

Add prefixes to the query.

```javascript
yasqe.addPrefixes({
  foaf: 'http://xmlns.com/foaf/0.1/',
  dc: 'http://purl.org/dc/elements/1.1/'
});
```

##### `removePrefixes(): void`

Remove all PREFIX declarations from the query.

```javascript
yasqe.removePrefixes();
```

### Yasr Class

SPARQL results viewer.

#### Methods

##### `setResponse(response: any, duration?: number): void`

Set the query response to display.

```javascript
yasr.setResponse(response, 1234);  // duration in ms
```

##### `draw(): void`

Redraw the current plugin.

```javascript
yasr.draw();
```

##### `selectPlugin(pluginName: string): void`

Select a specific plugin.

```javascript
yasr.selectPlugin('table');
```

##### `getPlugins(): { [name: string]: Plugin }`

Get all registered plugins.

```javascript
const plugins = yasr.getPlugins();
console.log('Available plugins:', Object.keys(plugins));
```

##### `download(filename?: string): void`

Download results using current plugin's download method.

```javascript
yasr.download('my-results.csv');
```

---

## Events

YASGUI uses an event-driven architecture. All components extend EventEmitter and emit events for various actions.

### YASGUI Events

Listen to events on the main YASGUI instance:

```javascript
const yasgui = new Yasgui(element);

// Tab events
yasgui.on('tabSelect', (instance, tabId) => {
  console.log('Tab selected:', tabId);
});

yasgui.on('tabAdd', (instance, tabId) => {
  console.log('Tab added:', tabId);
});

yasgui.on('tabClose', (instance, tab) => {
  console.log('Tab closed:', tab.getName());
});

yasgui.on('tabChange', (instance, tab) => {
  console.log('Tab changed:', tab.getName());
});

yasgui.on('tabOrderChanged', (instance, tabList) => {
  console.log('Tab order changed:', tabList);
});

// Query events
yasgui.on('query', (instance, tab) => {
  console.log('Query started on tab:', tab.getName());
});

yasgui.on('queryBefore', (instance, tab) => {
  console.log('Query about to start on tab:', tab.getName());
});

yasgui.on('queryResponse', (instance, tab) => {
  console.log('Query completed on tab:', tab.getName());
});

yasgui.on('queryAbort', (instance, tab) => {
  console.log('Query aborted on tab:', tab.getName());
});

// Fullscreen events
yasgui.on('fullscreen-enter', (instance) => {
  console.log('Entered fullscreen');
});

yasgui.on('fullscreen-leave', (instance) => {
  console.log('Exited fullscreen');
});

// Autocomplete events
yasgui.on('autocompletionShown', (instance, tab, widget) => {
  console.log('Autocomplete shown on tab:', tab.getName());
});

yasgui.on('autocompletionClose', (instance, tab) => {
  console.log('Autocomplete closed on tab:', tab.getName());
});

// Endpoint events
yasgui.on('endpointHistoryChange', (instance, history) => {
  console.log('Endpoint history updated:', history);
});
```

### YASQE Events

Listen to events on YASQE instances:

```javascript
const yasqe = new Yasqe(element);

yasqe.on('query', (instance, request, abortController) => {
  console.log('Query started with endpoint:', request.url);
});

yasqe.on('queryBefore', (instance, config) => {
  console.log('Query about to start with config:', config);
  // Modify config here if needed
});

yasqe.on('queryResponse', (instance, response, duration) => {
  console.log('Query completed in', duration, 'ms');
});

yasqe.on('queryResults', (instance, results, duration) => {
  console.log('Results received:', results);
});

yasqe.on('queryAbort', (instance, request) => {
  console.log('Query aborted');
});

yasqe.on('error', (instance) => {
  console.log('Error occurred');
});

yasqe.on('blur', (instance) => {
  console.log('Editor lost focus');
});

yasqe.on('autocompletionShown', (instance, widget) => {
  console.log('Autocomplete widget shown');
});

yasqe.on('autocompletionClose', (instance) => {
  console.log('Autocomplete closed');
});

yasqe.on('resize', (instance, newSize) => {
  console.log('Editor resized to:', newSize);
});

// CodeMirror events (yasqe extends CodeMirror)
yasqe.on('change', (instance, changeObj) => {
  console.log('Editor content changed');
});

yasqe.on('cursorActivity', (instance) => {
  console.log('Cursor moved');
});
```

### YASR Events

Listen to events on YASR instances:

```javascript
const yasr = new Yasr(element);

yasr.on('change', (instance) => {
  console.log('YASR state changed');
});

yasr.on('draw', (instance, plugin) => {
  console.log('Started drawing with plugin:', plugin.label);
});

yasr.on('drawn', (instance, plugin) => {
  console.log('Finished drawing with plugin:', plugin.label);
});

yasr.on('toggle-help', (instance) => {
  console.log('Help toggled');
});
```

### Event Example: Query Tracking

Track query execution time and results:

```javascript
const yasgui = new Yasgui(element);

yasgui.on('queryBefore', (instance, tab) => {
  tab.queryStartTime = Date.now();
  console.log('Query started:', tab.getQuery());
});

yasgui.on('queryResponse', (instance, tab) => {
  const duration = Date.now() - tab.queryStartTime;
  console.log('Query completed in', duration, 'ms');
  
  const yasr = tab.getYasr();
  if (yasr.results) {
    console.log('Result type:', yasr.results.getType());
    if (yasr.results.getType() === 'json') {
      const bindings = yasr.results.getBindings();
      console.log('Result count:', bindings?.length || 0);
    }
  }
});

yasgui.on('queryAbort', (instance, tab) => {
  console.log('Query aborted after', Date.now() - tab.queryStartTime, 'ms');
});
```

### Event Example: Custom Query Logging

Log all queries to a backend service:

```javascript
yasgui.on('query', async (instance, tab) => {
  const logData = {
    query: tab.getQuery(),
    endpoint: tab.getYasqe().config.requestConfig.endpoint,
    timestamp: new Date().toISOString(),
    tabName: tab.getName()
  };
  
  try {
    await fetch('/api/log-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });
  } catch (err) {
    console.error('Failed to log query:', err);
  }
});
```

---

## Plugin Development

YASR uses a plugin system for result visualization. You can create custom plugins to visualize results in new ways.

### Plugin Interface

A YASR plugin must implement the `Plugin` interface:

```typescript
interface Plugin<Options = any> {
  // Priority for automatic plugin selection (higher = preferred)
  priority: number;

  // Label shown in plugin selector
  label?: string;

  // Plugin-specific options
  options?: Options;

  // Hide plugin from manual selection
  hideFromSelection?: boolean;

  // Help/documentation URL
  helpReference?: string;

  // Determine if this plugin can handle current results
  canHandleResults(): boolean;

  // Initialize plugin (async setup)
  initialize?(): Promise<void>;

  // Cleanup when plugin destroyed
  destroy?(): void;

  // Draw visualization
  draw(persistentConfig: any, runtimeConfig?: any): Promise<void> | void;

  // Return plugin icon for selector
  getIcon(): Element | undefined;

  // Provide download functionality
  download?(filename?: string): DownloadInfo | undefined;
}

interface DownloadInfo {
  contentType: string;
  getData: () => string;
  filename: string;
  title: string;
}
```

### Step-by-Step Plugin Development Guide

#### Step 1: Create Plugin Class

Create a class implementing the Plugin interface:

```typescript
import { Plugin } from '@matdata/yasr';

export default class MyCustomPlugin implements Plugin {
  private yasr: Yasr;
  private container: HTMLElement;
  
  // Priority for auto-selection (higher = more likely to be auto-selected)
  public priority = 5;
  
  // Label shown in UI
  public label = 'My Visualization';
  
  // Help URL
  public helpReference = 'https://example.com/help';

  constructor(yasr: Yasr) {
    this.yasr = yasr;
    this.container = document.createElement('div');
    this.container.className = 'my-custom-plugin';
    yasr.resultsEl.appendChild(this.container);
  }

  // Determine if this plugin can visualize current results
  canHandleResults(): boolean {
    // Check if results exist and are of the right type
    if (!this.yasr.results) return false;
    
    // Example: only handle SELECT query results
    const results = this.yasr.results;
    if (results.getType() === 'json') {
      return true;
    }
    
    return false;
  }

  // Return icon for plugin selector
  getIcon(): Element | undefined {
    const icon = document.createElement('span');
    icon.textContent = '📊';  // Or use SVG
    return icon;
  }

  // Draw the visualization
  async draw(persistentConfig: any, runtimeConfig?: any): Promise<void> {
    if (!this.yasr.results) return;
    
    // Clear container
    this.container.innerHTML = '';
    
    // Get results
    const bindings = this.yasr.results.getBindings();
    if (!bindings) return;
    
    // Create your visualization
    const table = document.createElement('table');
    table.className = 'my-custom-table';
    
    // Add headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const vars = this.yasr.results.getVariables();
    vars?.forEach(varName => {
      const th = document.createElement('th');
      th.textContent = varName;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add data rows
    const tbody = document.createElement('tbody');
    bindings.forEach(binding => {
      const row = document.createElement('tr');
      vars?.forEach(varName => {
        const td = document.createElement('td');
        const value = binding[varName];
        td.textContent = value?.value || '';
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    this.container.appendChild(table);
  }

  // Optional: Provide download functionality
  download(filename?: string): DownloadInfo | undefined {
    if (!this.yasr.results) return undefined;
    
    // Generate CSV
    const bindings = this.yasr.results.getBindings();
    const vars = this.yasr.results.getVariables();
    
    let csv = vars?.join(',') + '\n';
    bindings?.forEach(binding => {
      const row = vars?.map(v => {
        const val = binding[v]?.value || '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
      csv += row + '\n';
    });
    
    return {
      contentType: 'text/csv',
      getData: () => csv,
      filename: filename || 'results.csv',
      title: 'Download as CSV'
    };
  }

  // Optional: Cleanup
  destroy(): void {
    this.container.remove();
  }
}
```

#### Step 2: Register Plugin

Register your plugin with YASR:

```javascript
import Yasr from '@matdata/yasr';
import MyCustomPlugin from './MyCustomPlugin';

// Register globally
Yasr.registerPlugin('MyCustomPlugin', MyCustomPlugin);

// Now use YASR as normal
const yasr = new Yasr(element);
```

Or register for a specific YASR instance:

```javascript
const yasr = new Yasr(element);
yasr.registerPlugin('MyCustomPlugin', MyCustomPlugin);
```

#### Step 3: Configure Plugin

Configure plugin-specific options:

```javascript
const yasr = new Yasr(element, {
  plugins: {
    MyCustomPlugin: {
      priority: 10,
      // Custom plugin options
      customOption: 'value'
    }
  }
});
```

#### Step 4: Add Styling

Create a CSS file for your plugin:

```css
.my-custom-plugin {
  padding: 20px;
  background: var(--yasgui-bg-primary);
  color: var(--yasgui-text-primary);
}

.my-custom-table {
  width: 100%;
  border-collapse: collapse;
}

.my-custom-table th,
.my-custom-table td {
  padding: 8px;
  border: 1px solid var(--yasgui-border-color);
  text-align: left;
}

.my-custom-table th {
  background: var(--yasgui-bg-secondary);
  font-weight: bold;
}

/* Dark theme support */
[data-theme="dark"] .my-custom-plugin {
  background: var(--yasgui-bg-primary);
}
```

### Plugin Example: Chart Plugin

Complete example of a chart visualization plugin:

```typescript
import { Plugin } from '@matdata/yasr';
import Chart from 'chart.js/auto';

export default class ChartPlugin implements Plugin {
  private yasr: Yasr;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private chart: Chart | null = null;
  
  public priority = 7;
  public label = 'Chart';
  public helpReference = 'https://example.com/chart-help';

  constructor(yasr: Yasr) {
    this.yasr = yasr;
    this.container = document.createElement('div');
    this.container.className = 'yasr-chart-plugin';
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    yasr.resultsEl.appendChild(this.container);
  }

  canHandleResults(): boolean {
    if (!this.yasr.results) return false;
    
    // Only handle SELECT results with numeric values
    const results = this.yasr.results;
    if (results.getType() !== 'json') return false;
    
    const vars = results.getVariables();
    const bindings = results.getBindings();
    
    // Need at least 2 variables (label and value)
    if (!vars || vars.length < 2 || !bindings || bindings.length === 0) {
      return false;
    }
    
    // Check if second variable contains numbers
    const firstBinding = bindings[0];
    const valueVar = vars[1];
    const value = firstBinding[valueVar]?.value;
    
    return !isNaN(parseFloat(value));
  }

  getIcon(): Element | undefined {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('width', '24');
    icon.setAttribute('height', '24');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M3 13h2v8H3zm4-4h2v12H7zm4-4h2v16h-2zm4 2h2v14h-2zm4 4h2v10h-2z');
    path.setAttribute('fill', 'currentColor');
    
    icon.appendChild(path);
    return icon;
  }

  async draw(persistentConfig: any, runtimeConfig?: any): Promise<void> {
    if (!this.yasr.results) return;
    
    const results = this.yasr.results;
    const vars = results.getVariables();
    const bindings = results.getBindings();
    
    if (!vars || !bindings) return;
    
    // Extract data
    const labels: string[] = [];
    const data: number[] = [];
    
    bindings.forEach(binding => {
      const label = binding[vars[0]]?.value || '';
      const value = parseFloat(binding[vars[1]]?.value || '0');
      labels.push(label);
      data.push(value);
    });
    
    // Destroy previous chart
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Create chart
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: vars[1],
          data: data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.remove();
  }
}
```

### Plugin Best Practices

1. **Theme Support**: Use CSS custom properties for colors
2. **Responsive**: Make visualizations responsive to container size
3. **Error Handling**: Gracefully handle invalid or missing data
4. **Performance**: Optimize for large result sets
5. **Accessibility**: Include ARIA labels and keyboard navigation
6. **Documentation**: Provide clear documentation and examples
7. **TypeScript**: Use TypeScript for better type safety
8. **Testing**: Write unit tests for your plugin

### Theme Support for Plugins

YASGUI uses a centralized theme system that plugins should integrate with to provide a consistent user experience across light and dark modes.

#### Implementation Steps

**1. Detect the Current Theme**

Read the `data-theme` attribute on `document.documentElement`:

```javascript
const currentTheme = document.documentElement.getAttribute('data-theme');
// Returns: "light" or "dark"
```

**2. Use CSS Custom Properties**

Use YASGUI's CSS custom properties for consistent theming:

```css
/* Light mode (default) */
.my-plugin-container {
  background-color: var(--yasgui-bg-primary);
  color: var(--yasgui-text-primary);
  border: 1px solid var(--yasgui-border-color);
}

.my-plugin-element {
  fill: var(--yasgui-accent-color);
  stroke: var(--yasgui-border-color);
}

/* Dark mode overrides */
[data-theme="dark"] .my-plugin-tooltip {
  background-color: var(--yasgui-bg-secondary);
  color: var(--yasgui-text-primary);
  border-color: var(--yasgui-border-color);
}
```

**Available CSS Custom Properties:**

- **Background Colors**: `--yasgui-bg-primary`, `--yasgui-bg-secondary`, `--yasgui-bg-tertiary`
- **Text Colors**: `--yasgui-text-primary`, `--yasgui-text-secondary`
- **Accent Colors**: `--yasgui-accent-color`, `--yasgui-link-hover`
- **Border Colors**: `--yasgui-border-color`, `--yasgui-input-border`, `--yasgui-input-focus`
- **Button Colors**: `--yasgui-button-text`, `--yasgui-button-hover`
- **Other Colors**: `--yasgui-notification-bg`, `--yasgui-notification-text`

**3. Watch for Theme Changes**

Use a `MutationObserver` to detect theme changes:

```javascript
class MyPlugin {
  constructor(yasr) {
    this.yasr = yasr;
    this.initializeTheme();
    this.watchThemeChanges();
  }

  initializeTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    this.applyTheme(theme);
  }

  watchThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const theme = document.documentElement.getAttribute('data-theme');
          this.applyTheme(theme);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  }

  applyTheme(theme) {
    const styles = getComputedStyle(document.documentElement);
    
    // Extract colors from CSS custom properties
    this.config.colors = {
      background: styles.getPropertyValue('--yasgui-bg-primary').trim(),
      text: styles.getPropertyValue('--yasgui-text-primary').trim(),
      accent: styles.getPropertyValue('--yasgui-accent-color').trim(),
      border: styles.getPropertyValue('--yasgui-border-color').trim()
    };

    // Update your visualization
    this.redraw();
  }
}
```

**4. Add Smooth Transitions**

Include CSS transitions for smooth theme switching:

```css
.my-plugin-container,
.my-plugin-node,
.my-plugin-link,
.my-plugin-text {
  transition: fill 0.3s ease, stroke 0.3s ease, 
              background-color 0.3s ease, color 0.3s ease;
}
```

**Elements to Theme:**

Ensure you apply theme colors to all visual elements:
- Graph/Visualization backgrounds
- Nodes/Points and their borders
- Edges/Links between nodes
- Text labels and annotations
- Tooltips (background, text, and borders)
- Control buttons (zoom, pan, etc.)
- Legends and explanatory text
- Loading indicators and error messages
- Selection highlights

**Testing:**

Test your plugin in both themes:
1. **Light Mode**: Verify proper contrast and readability
2. **Dark Mode**: Ensure colors work well on dark backgrounds
3. **Theme Switching**: Verify smooth transitions without visual glitches
4. **Theme Persistence**: Check that the theme persists across page reloads

### Distributing Your Plugin

Package and distribute your plugin:

```json
{
  "name": "yasr-my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@matdata/yasr": "^4.0.0"
  }
}
```

Users can install and use it:

```bash
npm install yasr-my-plugin
```

```javascript
import Yasr from '@matdata/yasr';
import MyPlugin from 'yasr-my-plugin';

Yasr.registerPlugin('MyPlugin', MyPlugin);
```

---

## Contributing

We welcome contributions to YASGUI! Here's how to get involved.

### Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/Matdata-eu/Yasgui.git
   cd Yasgui
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Visit `http://localhost:5173/demo` to see YASGUI in action.

4. **Make Changes**
   - Create a feature branch: `git checkout -b feature/my-feature`
   - Make your changes
   - Test locally

5. **Build**
   ```bash
   npm run build
   ```

6. **Run Tests**
   ```bash
   npm test
   ```

7. **Run Linter**
   ```bash
   npm run util:lint
   ```

### Project Structure

```
Yasgui/
├── packages/
│   ├── utils/           # Shared utilities
│   ├── yasqe/           # Query editor
│   ├── yasr/            # Results viewer
│   └── yasgui/          # Main package
├── dev/                 # Development pages
├── build/               # Build output
├── docs/                # Documentation
├── .github/             # GitHub workflows
└── test/                # Tests
```

### Development Workflow

#### Making Changes

1. **Code Style**: Follow the existing code style
   - Use TypeScript
   - Follow ESLint rules (`npm run util:lint`)
   - Use Prettier for formatting (`npm run util:prettify`)

2. **Commit Messages**: Use conventional commit format
   ```
   feat: add new plugin system
   fix: resolve query execution bug
   docs: update API documentation
   style: format code
   refactor: restructure plugin loading
   test: add unit tests for parser
   chore: update dependencies
   ```

3. **Testing**: Add tests for new features
   ```bash
   npm run unit-test        # Unit tests
   npm run puppeteer-test   # E2E tests
   ```

#### Building

```bash
npm run build    # Production build
npm run dev      # Development server
```

#### Pull Requests

1. **Create PR** with clear description
2. **Link Issues**: Reference related issues
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update docs if needed
5. **Changelog**: Add entry if applicable

### Code Guidelines

#### TypeScript

- Use strict TypeScript settings
- Define interfaces for all public APIs
- Avoid `any` types when possible
- Export types for library consumers

```typescript
// Good
interface PluginConfig {
  priority: number;
  enabled: boolean;
}

function configurePlugin(config: PluginConfig): void {
  // Implementation
}

// Avoid
function configurePlugin(config: any) {
  // Implementation
}
```

#### CSS

- Use CSS custom properties for theming
- Follow BEM naming convention
- Support both light and dark themes

```css
/* Good */
.yasgui__header {
  background: var(--yasgui-bg-primary);
  color: var(--yasgui-text-primary);
}

.yasgui__header--collapsed {
  height: 0;
}

/* Avoid inline styles or theme-specific colors */
```

#### Documentation

- Document all public APIs
- Include code examples
- Keep README up to date
- Add JSDoc comments

```typescript
/**
 * Execute a SPARQL query against the configured endpoint.
 * 
 * @param query - The SPARQL query string
 * @param options - Optional request configuration
 * @returns Promise resolving to query results
 * @throws {Error} If query is invalid or network request fails
 * 
 * @example
 * ```typescript
 * const results = await yasqe.query(
 *   'SELECT * WHERE { ?s ?p ?o } LIMIT 10',
 *   { endpoint: 'https://dbpedia.org/sparql' }
 * );
 * ```
 */
async query(query: string, options?: RequestConfig): Promise<any> {
  // Implementation
}
```

### Reporting Issues

When reporting bugs:

1. **Search Existing Issues**: Check if already reported
2. **Provide Details**:
   - YASGUI version
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages
   - Example query (if applicable)

3. **Use Issue Template**: Follow the provided template

### Feature Requests

When requesting features:

1. **Describe Use Case**: Explain the problem
2. **Propose Solution**: Suggest implementation
3. **Consider Alternatives**: Mention other approaches
4. **Provide Examples**: Show how it would work

### Release Process

Releases are managed using Changesets:

1. **Create Changeset**
   ```bash
   npx changeset
   ```

2. **Select Packages**: Choose affected packages
3. **Describe Changes**: Write changelog entry
4. **Commit**: Commit changeset file

5. **Release** (maintainers only)
   ```bash
   npm run release
   ```

### Community

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Pull Requests**: Contribute code

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow GitHub's Community Guidelines

---

## Additional Resources

- **GitHub Repository**: [https://github.com/Matdata-eu/Yasgui](https://github.com/Matdata-eu/Yasgui)
- **Issue Tracker**: [https://github.com/Matdata-eu/Yasgui/issues](https://github.com/Matdata-eu/Yasgui/issues)
- **User Guide**: See `docs/user-guide.md`
- **SPARQL Specification**: [https://www.w3.org/TR/sparql11-query/](https://www.w3.org/TR/sparql11-query/)
- **CodeMirror Documentation**: [https://codemirror.net/5/](https://codemirror.net/5/)
- **Graph Plugin**: [https://github.com/Matdata-eu/yasgui-graph-plugin](https://github.com/Matdata-eu/yasgui-graph-plugin)
- **Geo Plugin**: [https://github.com/Thib-G/yasgui-geo-tg](https://github.com/Thib-G/yasgui-geo-tg)

---

*This developer guide is maintained as part of the YASGUI project. For user-facing documentation, see the User Guide.*
