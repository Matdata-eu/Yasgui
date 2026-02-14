# Skill: Find YASGUI Type/Interface

## Description
Quickly locates TypeScript interfaces, types, and classes across the YASGUI monorepo, showing their definitions, exports, imports, and usage examples.

## When to Use
- User asks "where is [type/interface] defined?"
- User needs to understand a TypeScript type structure
- User wants to find usage examples of an interface
- User asks about import paths for types
- User mentions @matdata/* path aliases
- User needs to understand package dependencies and type exports

## Problem Statement
YASGUI is a monorepo with 4 interdependent packages:
- `@matdata/yasgui` (main)
- `@matdata/yasqe` (query editor)
- `@matdata/yasr` (results viewer)
- `@matdata/yasgui-utils` (utilities)

**Challenges:**
- Types are defined across multiple packages
- Path aliases map to different locations in dev vs. prod
- Interfaces are extended and composed across packages
- Plugin interfaces have specific requirements
- Some types are re-exported from dependencies

**Path Aliases (tsconfig.json):**
```json
{
  "@matdata/yasgui": ["packages/yasgui/src"],
  "@matdata/yasqe": ["packages/yasqe/src"],
  "@matdata/yasr": ["packages/yasr/src"],
  "@matdata/yasgui-utils": ["packages/utils/src"]
}
```

## Required Inputs
- **Type/Interface name** (e.g., "Plugin", "Config", "Tab")
- **Context** (optional: which package or file mentioned)

## Instructions

### Step 1: Determine Search Strategy

Based on the type name, categorize:

1. **Core Classes:** Yasgui, Yasqe, Yasr, Tab, Plugin
2. **Configuration Types:** Config, PluginConfig, PersistentConfig
3. **Data Types:** Prefixes, DownloadInfo, CatalogueItem
4. **Plugin Types:** Plugin, DownloadInfo
5. **Query Management Types:** ManagedQuery, Workspace, QueryBackend
6. **Utility Types:** Various helper types in utils

### Step 2: Search for Definition

Execute parallel searches:

```typescript
// Search 1: Find interface/type/class definitions
grep_search({
  query: "(export )?(interface|type|class) [TypeName]",
  isRegexp: true,
  includePattern: "packages/*/src/**/*.ts"
})

// Search 2: Find type exports
grep_search({
  query: "export.*[TypeName]",
  isRegexp: true,
  includePattern: "packages/*/src/**/*.ts"
})

// Search 3: Find imports
grep_search({
  query: "import.*[TypeName]",
  isRegexp: true,
  includePattern: "packages/*/src/**/*.ts"
})
```

### Step 3: Locate and Read Definition

Once found, read the file containing the definition:

```typescript
read_file({
  filePath: "[discovered-file-path]"
})
```

Extract:
- Full type definition
- JSDoc comments
- Related types in same file
- Exports (default vs named)

### Step 4: Find Package Location

Determine which package owns the type:

- `packages/yasgui/src/` → Core YASGUI integration
- `packages/yasqe/src/` → Query editor types
- `packages/yasr/src/` → Results viewer types
- `packages/utils/src/` → Shared utilities

### Step 5: Find Usage Examples

Search for usage patterns:

```typescript
// Find instantiation examples
grep_search({
  query: "new [TypeName]|: [TypeName]|<[TypeName]>",
  isRegexp: true,
  includePattern: "packages/*/src/**/*.ts"
})

// Find in tests (valuable for understanding)
grep_search({
  query: "[TypeName]",
  isRegexp: false,
  includePattern: "test/**/*.ts"
})
```

### Step 6: Trace Export Chain

For re-exported types, trace the chain:

1. Check package `index.ts` for re-exports:
   ```typescript
   export { Type } from "./somewhere";
   export type { Interface } from "./elsewhere";
   ```

2. Check if type is exported in `package.json`:
   ```json
   {
     "types": "build/ts/index.d.ts"
   }
   ```

3. Determine import path for users:
   ```typescript
   // Internal (within monorepo)
   import { Type } from "@matdata/yasgui";
   
   // External (published package)
   import { Type } from "@matdata/yasgui";
   ```

### Step 7: Check for Extensions

Find types that extend or compose this type:

```typescript
grep_search({
  query: "extends [TypeName]|: [TypeName]|& [TypeName]",
  isRegexp: true,
  includePattern: "packages/*/src/**/*.ts"
})
```

### Step 8: Generate Response

Provide comprehensive information:

1. **Definition location**
2. **Full type definition** (code block)
3. **JSDoc documentation** (if available)
4. **Import path** (how to use it)
5. **Usage examples** (from codebase)
6. **Related types** (extends, composes with)
7. **Package ownership** (which package defines it)

## Common Type References

### Core Classes

#### Yasgui
- **Location:** `packages/yasgui/src/index.ts`
- **Export:** `export default class Yasgui`
- **Import:** `import Yasgui from "@matdata/yasgui"`

#### Yasqe
- **Location:** `packages/yasqe/src/index.ts`
- **Export:** `export default class Yasqe`
- **Import:** `import Yasqe from "@matdata/yasqe"`

#### Yasr
- **Location:** `packages/yasr/src/index.ts`
- **Export:** `export default class Yasr`
- **Import:** `import Yasr from "@matdata/yasr"`

#### Tab
- **Location:** `packages/yasgui/src/Tab.ts`
- **Export:** `export default class Tab`
- **Import:** `import Tab from "@matdata/yasgui"` (not directly exported)

### Plugin System

#### Plugin Base Class
- **Location:** `packages/yasr/src/plugins/index.ts`
- **Export:** `export abstract class Plugin`
- **Import:** `import { Plugin } from "@matdata/yasr"`

#### DownloadInfo
- **Location:** `packages/yasr/src/plugins/index.ts`
- **Export:** `export interface DownloadInfo`
- **Import:** `import { DownloadInfo } from "@matdata/yasr"`

### Configuration Types

#### Config (Yasgui)
- **Location:** `packages/yasgui/src/index.ts`
- **Export:** `export interface Config`

#### Config (Yasqe)
- **Location:** `packages/yasqe/src/index.ts`
- **Export:** `export interface Config`

#### Config (Yasr)
- **Location:** `packages/yasr/src/index.ts`
- **Export:** `export interface Config`

#### PluginConfig
- **Location:** `packages/yasr/src/index.ts`
- **Export:** `export interface PluginConfig`

#### PersistentConfig
- **Location:** `packages/yasr/src/index.ts`
- **Export:** `export interface PersistentConfig`

### Query Management Types

#### ManagedQuery
- **Location:** `packages/yasgui/src/queryManagement/types.ts`
- **Export:** `export interface ManagedQuery`

#### WorkspaceConfig
- **Location:** `packages/yasgui/src/queryManagement/types.ts`
- **Export:** `export interface WorkspaceConfig`

#### QueryBackend
- **Location:** `packages/yasgui/src/queryManagement/backends/`
- **Export:** `export interface QueryBackend`

### Utility Types

#### Prefixes
- **Location:** `packages/yasr/src/index.ts`
- **Export:** `export type Prefixes = { [prefixLabel: string]: string }`

#### RequestArgs
- **Location:** `packages/yasgui/src/linkUtils.ts`
- **Export:** `export type RequestArgs`

## Decision Tree

```
START
  ↓
What is the type category?
  ├─ Core Class (Yasgui, Yasqe, Yasr, Tab)
  │   → Search packages/[name]/src/index.ts
  │
  ├─ Plugin Related (Plugin, DownloadInfo)
  │   → Search packages/yasr/src/plugins/
  │
  ├─ Configuration (Config, *Config)
  │   → Search packages/*/src/index.ts or defaults.ts
  │
  ├─ Query Management (*Query*, *Workspace*, *Backend*)
  │   → Search packages/yasgui/src/queryManagement/
  │
  └─ Utility Functions
      → Search packages/utils/src/
  ↓
Search for definition
  ↓
Found?
  ├─ YES → Read file, extract definition
  │         ↓
  │         Find usage examples
  │         ↓
  │         Check export chain
  │         ↓
  │         Generate response
  │
  └─ NO → Broaden search
            ↓
            Search all packages
            ↓
            Search tests
            ↓
            Check if it's from external dependency
```

## Example Queries

### Example 1: Finding Plugin Interface

**User asks:** "Where is the Plugin interface defined?"

**Response:**
```markdown
The Plugin interface is an abstract class in `packages/yasr/src/plugins/index.ts`:

```typescript
export abstract class Plugin {
  label: string;
  priority: number;
  helpReference: string;
  
  constructor(protected yasr: Yasr) {}
  
  abstract canHandleResults(): boolean;
  abstract draw(persistentConfig?: any): void;
  abstract download(filename?: string): DownloadInfo;
  
  destroy?(): void;
}
```

**Import:**
```typescript
import { Plugin } from "@matdata/yasr";
```

**Usage example** (from graph plugin):
```typescript
export default class GraphPlugin extends Plugin {
  helpReference = "https://github.com/.../graph-plugin";
  
  canHandleResults() {
    return this.yasr.results?.hasBindings();
  }
  
  draw() {
    // Implementation
  }
  
  download() {
    return {
      getData: () => this.exportData(),
      filename: "graph.json",
      contentType: "application/json"
    };
  }
}
```

**Required methods:**
- ✅ `helpReference` property
- ✅ `canHandleResults()` method
- ✅ `draw()` method  
- ✅ `download()` method
```

### Example 2: Finding Config Type

**User asks:** "What's the structure of Yasgui Config?"

**Response:**
```markdown
The Yasgui Config interface is in `packages/yasgui/src/index.ts`:

```typescript
export interface Config {
  yasqe?: Partial<Yasqe.Config>;
  yasr?: Partial<Yasr.Config>;
  requestConfig?: RequestConfig;
  endpointCatalogueOptions?: EndpointSelectConfig;
  populateFromUrl?: boolean;
  persistenceId?: string;
  persistenceLabelConfig?: string;
  persistentConfigKeyPrefix?: string;
  // ... more options
}
```

**Usage:**
```typescript
import Yasgui from "@matdata/yasgui";

const yasgui = new Yasgui(document.getElementById("yasgui"), {
  yasqe: {
    value: "SELECT * WHERE { ?s ?p ?o } LIMIT 10"
  },
  yasr: {
    pluginOrder: ["table", "response"]
  },
  requestConfig: {
    endpoint: "https://dbpedia.org/sparql"
  }
});
```

**Nested configs:**
- `yasqe`: Yasqe.Config (from @matdata/yasqe)
- `yasr`: Yasr.Config (from @matdata/yasr)
```

### Example 3: Finding Tab Methods

**User asks:** "What methods does Tab have?"

**Response:**
```markdown
The Tab class is in `packages/yasgui/src/Tab.ts`:

**Key methods:**
```typescript
class Tab {
  getName(): string
  setName(name: string): void
  getId(): string
  getYasqe(): Yasqe
  getYasr(): Yasr
  query(): Promise<void>
  setQuery(query: string): void
  getQuery(): string
}
```

**Not directly exported** - accessed via Yasgui instance:
```typescript
const yasgui = new Yasgui(element);
const currentTab = yasgui.getTab(); // Get active tab
const allTabs = yasgui.getTabs();    // Get all tabs

// Use tab methods
currentTab.setName("My Query");
currentTab.setQuery("SELECT * WHERE { ?s ?p ?o }");
await currentTab.query();
```
```

## Output Format

Structure responses as:

1. **Location Header:**
   ```
   📁 [Package] › [File path]
   ```

2. **Definition Block:**
   ````markdown
   ```typescript
   [Full type definition]
   ```
   ````

3. **Import Instructions:**
   ```typescript
   import { Type } from "@matdata/[package]";
   ```

4. **Usage Example:**
   ```typescript
   [Real example from codebase]
   ```

5. **Related Types** (if applicable):
   ```
   See also: [Type1], [Type2]
   ```

6. **Documentation Link** (if available):
   ```
   📖 docs/developer-guide.md#[section]
   ```

## Validation Checklist

- [ ] Type definition found and displayed
- [ ] Correct import path provided
- [ ] Usage example included
- [ ] Package ownership identified
- [ ] Related types mentioned (if relevant)
- [ ] Export chain traced (if re-exported)

## Related Files
- `tsconfig.json` - Path alias configuration
- `packages/*/src/index.ts` - Package entry points
- `packages/*/package.json` - Package exports
- `docs/developer-guide.md` - Type documentation

## Notes
- **Path aliases only work in dev:** Published packages use build/ output
- **Multiple configs:** Yasgui, Yasqe, and Yasr each have Config types
- **Plugin types in Yasr:** Plugin system is part of results viewer
- **TypeScript strict mode:** All types are properly typed
