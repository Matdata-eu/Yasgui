# YASGUI User Guide

**Yet Another SPARQL GUI (YASGUI)** is a powerful, user-friendly interface for querying and exploring RDF data using SPARQL. This guide will help you understand and make the most of YASGUI's features.

## Table of Contents

1. [Introduction](#introduction)
2. [What is SPARQL?](#what-is-sparql)
3. [Getting Started](#getting-started)
4. [Components Overview](#components-overview)
5. [Features](#features)
6. [Plugins](#plugins)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

YASGUI is a comprehensive SPARQL query interface that combines a powerful query editor (YASQE) with a versatile results viewer (YASR). Whether you're new to SPARQL or an experienced user, YASGUI provides an intuitive interface for working with semantic data.

**Key Benefits:**
- Write and execute SPARQL queries against any endpoint
- Visualize results in multiple formats (tables, graphs, maps, etc.)
- Save and manage multiple query tabs
- Auto-complete and syntax highlighting
- Theme support (light and dark modes)
- Responsive layouts for different screen sizes

---

## What is SPARQL?

**SPARQL** (SPARQL Protocol and RDF Query Language) is the standard query language for retrieving and manipulating data stored in RDF (Resource Description Framework) format. Think of it as SQL for linked data and knowledge graphs.

### Basic Concepts

- **Triples**: RDF data is organized as subject-predicate-object statements
- **URIs**: Resources are identified using URIs (Uniform Resource Identifiers)
- **Prefixes**: Shortcuts for long URIs (e.g., `foaf:` for `http://xmlns.com/foaf/0.1/`)
- **Endpoints**: Web services that accept SPARQL queries

### Learning SPARQL

For a comprehensive, beginner-friendly guide to SPARQL, visit:
**[https://kvistgaard.github.io/sparql/](https://kvistgaard.github.io/sparql/)**

This excellent resource covers:
- SPARQL syntax and structure
- Query types (SELECT, CONSTRUCT, ASK, DESCRIBE)
- Filters and functions
- Real-world examples and exercises

### Common SPARQL Query Types

- **SELECT**: Returns a table of results (like SQL SELECT)
- **CONSTRUCT**: Creates new RDF triples from query results
- **ASK**: Returns true/false for whether a pattern exists
- **DESCRIBE**: Returns all information about a resource

---

## Getting Started

### Accessing YASGUI

YASGUI is available at: **[https://yasgui.matdata.eu/](https://yasgui.matdata.eu/)**

### Your First Query

1. **Select an Endpoint**: Enter a SPARQL endpoint URL in the endpoint field (or use the default)
2. **Write a Query**: Type your SPARQL query in the editor
3. **Execute**: Click the "Execute" button or press `Ctrl+Enter`
4. **View Results**: Results appear in the results viewer below

**Example Query:**
```sparql
SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object
}
LIMIT 10
```

### Saving Your Work

YASGUI automatically saves:
- Your queries in local storage
- Tab configurations
- User preferences (theme, layout, etc.)

Your work persists across browser sessions on the same device.

---

## Components Overview

YASGUI consists of three main components working together:

### YASQE (Query Editor)

The query editor where you write and edit SPARQL queries.

**Features:**
- Syntax highlighting for SPARQL
- Auto-completion for keywords, prefixes, and URIs
- Line numbers and code folding
- Query validation with error highlighting
- Find and replace functionality
- Multiple editor themes

### YASR (Results Viewer)

The results viewer displays query results in various formats.

**Features:**
- Multiple visualization plugins (table, graph, map, etc.)
- Export results to different formats
- Pagination for large result sets
- Sortable and filterable tables
- Raw response viewer

### YASGUI (Main Interface)

The container that brings YASQE and YASR together with additional functionality.

**Features:**
- Multiple query tabs
- Tab management (rename, duplicate, close)
- Endpoint management
- Settings configuration
- Theme switching
- Layout orientation options

---

## Features

### Themes

YASGUI supports both light and dark themes, allowing you to customize the appearance of the SPARQL IDE according to your preferences.

**Features:**
- **Light Theme**: Default bright theme suitable for well-lit environments with high contrast and blue accents
- **Dark Theme**: Easy-on-the-eyes dark theme with Material Palenight syntax highlighting and cyan accents
- **Theme Toggle**: Quick switching between themes via UI button in the tab bar
- **Persistence**: Your theme preference is automatically saved in browser storage
- **System Preference**: Automatically detects and applies your system's theme preference on first visit

**How to Change Theme:**
- Click the theme toggle button in the top-right area of the tab bar
  - **Light Mode**: Shows a sun icon (☀️) - clicking switches to dark mode
  - **Dark Mode**: Shows a moon icon (🌙) - clicking switches to light mode
- Your theme preference persists across page reloads and browser sessions

**Theme Details:**

Light Theme characteristics:
- Clean, bright interface with high contrast
- Default CodeMirror syntax highlighting
- White backgrounds with dark text
- Blue accent color (#337ab7)

Dark Theme characteristics:
- Dark backgrounds with light text
- Material Palenight CodeMirror theme for syntax highlighting
- Reduced eye strain in low-light environments
- Cyan accent color (#4fc3f7)

**System Theme Detection:**

If you haven't manually selected a theme, YASGUI will:
1. Check your system's color scheme preference
2. Apply dark theme if your system prefers dark mode
3. Apply light theme otherwise
4. Automatically update if you change your system preference

### Layout Orientation

YASGUI offers two layout options to optimize screen space:

**Vertical Layout (Default):**
- Query editor on top
- Results viewer below
- Best for standard monitors and laptops

**Horizontal Layout:**
- Query editor on left
- Results viewer on right (side-by-side)
- Ideal for wide/ultrawide monitors
- Maximizes vertical space for both components

**How to Change Layout:**
- Click the layout toggle button in the control bar (next to the endpoint selector)
- Icon shows stacked rectangles (vertical) or side-by-side rectangles (horizontal)
- Layout preference is saved automatically

### Query Formatting

Keep your SPARQL queries clean and readable with automatic formatting.

**Features:**
- Format button in the editor toolbar
- Keyboard shortcut: `Shift+Ctrl+F`
- Choice of formatting engines:
  - **sparql-formatter** (default): Standards-compliant, modern formatter
  - **Legacy formatter**: Original YASGUI formatter
- Auto-format on query execution (configurable in Settings)

**How to Format:**
1. Write or paste your query
2. Click the format button or press `Shift+Ctrl+F`
3. Query is automatically reformatted with proper indentation and spacing

**Configuration:**
- Open Settings (⚙ icon) to:
  - Select your preferred formatter
  - Enable/disable auto-format on query execution
  - Both settings are saved persistently

### Fullscreen Mode

Maximize screen space for editing or viewing results.

**Available Modes:**
- **YASQE Fullscreen**: Editor takes up the entire screen
- **YASR Fullscreen**: Results viewer takes up the entire screen

**How to Use:**
- Press `F11` to toggle YASQE fullscreen
- Press `F10` to toggle YASR fullscreen
- Press `F9` to switch between YASQE and YASR fullscreen
- Press `Esc` or click the close button to exit fullscreen

### Prefix Management

Simplify query writing with reusable prefix declarations.

**Features:**
- **Saved Prefixes**: Define commonly-used prefixes once, reuse everywhere
- **Auto-capture**: YASGUI automatically captures new prefixes from your queries
- **PREFIX Button**: Insert saved prefixes into your query with one click
- **Prefix Autocomplete**: Type a prefix (e.g., `PREFIX foaf:`) and YASGUI suggests the full URI from prefix.cc

**Default Prefixes:**
YASGUI includes standard prefixes like:
- `rdf:` - RDF vocabulary
- `rdfs:` - RDF Schema

**How to Use:**
1. Click the "PREFIX" button to insert all saved prefixes
2. Open Settings (⚙) to manage your prefix collection
3. Enable/disable auto-capture in Settings

**Auto-completion:**
When typing a prefix declaration, YASGUI queries [prefix.cc](https://prefix.cc) to suggest standard URIs:
```sparql
PREFIX foaf: <  # Auto-suggests http://xmlns.com/foaf/0.1/
```

### Endpoint Quick Switch

The endpoint quick switch buttons feature allows you to quickly switch between different SPARQL endpoints with a single click. You can use predefined endpoints or add your own custom buttons.

**Features:**
- **One-click switching**: Instantly switch to a different SPARQL endpoint
- **Predefined buttons**: Administrators can configure endpoint buttons during initialization
- **User-defined buttons**: Add your own custom endpoint buttons through the Settings interface
- **Persistent storage**: Custom buttons are saved in local storage and persist across sessions
- **Fully themed**: Buttons automatically adapt to light and dark themes
- **Accessible**: Buttons are fully accessible with ARIA labels

**How to Add Custom Endpoints:**
1. Click the Settings button (⚙) in the control bar
2. Navigate to the "Endpoint Buttons" tab
3. Enter a button label and endpoint URL
4. Click "+ Add Button"
5. Click "Save" to apply changes

Custom buttons appear alongside predefined buttons and persist across browser sessions. You can remove custom buttons by clicking the × button next to each entry.

**How to Switch Endpoints:**
- Buttons are displayed next to the endpoint textbox in the control bar
- Click any endpoint button to immediately update the endpoint field
- The endpoint change triggers the same behavior as manually entering an endpoint
- The new endpoint is used for all subsequent queries

**Behavior:**
- Clicking a button updates the endpoint textbox with the configured endpoint
- The endpoint change is immediate and doesn't require confirmation
- Multiple buttons can be displayed for different endpoints
- Each button shows its label for easy identification

### URI Explorer

Quickly explore RDF resources by Ctrl+clicking on URIs in your query.

**How It Works:**
1. Hold `Ctrl` and click any URI in the query editor
2. YASGUI automatically generates and executes a CONSTRUCT query exploring:
   - Outgoing triples (where the URI is the subject)
   - Incoming triples (where the URI is the object)
3. Results appear without modifying your original query
4. View the resource's connections in the results viewer

**Example:**
Ctrl+clicking on `http://dbpedia.org/resource/European_Union` automatically queries for all triples related to the European Union.

### Query Tabs

Manage multiple queries simultaneously with tabs.

**Features:**
- Create unlimited query tabs
- Rename tabs by double-clicking the tab name
- Duplicate tabs to create query variations
- Reorder tabs by dragging
- Close individual tabs
- Each tab maintains its own:
  - Query content
  - Endpoint configuration
  - Results
  - Plugin selection

**Tab Operations:**
- **New Tab**: Click the "+" button in the tab bar
- **Rename**: Double-click the tab name
- **Duplicate**: Right-click and select "Duplicate"
- **Close**: Click the "×" on the tab or use the context menu
- **Reorder**: Drag and drop tabs to rearrange

### Settings Modal

Access comprehensive configuration options through the Settings modal.

**How to Open:**
- Click the settings button (⚙) in the control bar

**Settings Sections:**

**Prefixes Tab:**
- Manage saved prefix declarations
- Enable/disable auto-capture
- Add, edit, or remove prefixes

**Request Configuration Tab:**
- HTTP request method (GET/POST)
- Accept headers
- Custom request parameters
- Named/default graphs configuration
- Custom HTTP headers

**Endpoint Buttons Tab:**
- Add custom endpoint quick-switch buttons
- Remove user-defined buttons
- Manage endpoint collection

**Formatting Tab:**
- Select formatter (sparql-formatter or legacy)
- Enable/disable auto-format on query execution

All settings are saved automatically to local storage.

### Query History and Persistence

YASGUI automatically saves your work locally.

**What's Saved:**
- Query text in each tab
- Tab names and order
- Endpoint configurations
- Last query results
- User preferences (theme, layout, etc.)
- Custom endpoint buttons

**Persistence Duration:**
- Default: 30 days
- Configurable by administrators

**Note:** Data is stored in your browser's local storage. Clearing browser data will remove saved queries.

### Share Queries

Share your queries with colleagues using URL parameters.

**How to Share:**
YASGUI supports URL-based query sharing:
1. Craft your query in YASGUI
2. The URL updates to include query parameters
3. Share the URL with others
4. Recipients see your query pre-loaded when they visit the link

**URL Parameters:**
- `query`: The SPARQL query
- `endpoint`: The endpoint URL
- Other tab configurations

---

## Plugins

YASR (Results Viewer) uses plugins to visualize query results in different formats. The appropriate plugin is automatically selected based on your query type and results.

### Table Plugin

Displays SELECT query results in an interactive table.

**Features:**
- **Sortable Columns**: Click column headers to sort
- **Pagination**: Navigate large result sets efficiently
- **Column Resizing**: Drag column borders to resize
- **Filtering**: Filter rows by column values
- **Cell Formatting**: URIs are clickable links, literals shown with datatypes
- **Export**: Download results as CSV

**Best For:**
- SELECT queries
- Exploring structured data
- Comparing values across multiple rows

**Usage:**
- Execute a SELECT query
- Table plugin activates automatically
- Click column headers to sort
- Use pagination controls at the bottom
- Export via the download button

### Boolean Plugin

Displays boolean results from ASK queries.

**Features:**
- Clear true/false visual indicator
- Color-coded responses (green for true, red for false)
- Large, easy-to-read display

**Best For:**
- ASK queries
- Checking if patterns exist in the data
- Boolean validation queries

**Usage:**
- Execute an ASK query
- Boolean plugin activates automatically
- Result shown as TRUE ✓ or FALSE ✗

### Response Plugin

Shows the raw response from the SPARQL endpoint.

**Features:**
- Syntax highlighting for different formats:
  - JSON
  - XML
  - Turtle
  - Other RDF serializations
- Code folding for nested structures
- Copy to clipboard functionality
- Line numbers

**Best For:**
- Debugging queries
- Inspecting raw endpoint responses
- Understanding response structure
- Working with specific response formats

**Usage:**
- Execute any query
- Select "Response" from the plugin selector
- View raw response with syntax highlighting

### Graph Plugin

Visualizes RDF data as an interactive node-edge graph.

**Features:**
- Interactive force-directed graph layout
- Zoom and pan navigation
- Node and edge highlighting on hover
- Clickable nodes to explore connections
- Theme support (light/dark)
- Export graph visualization

**Best For:**
- CONSTRUCT queries
- DESCRIBE queries
- Exploring RDF structure and relationships
- Visualizing knowledge graphs

**Usage:**
- Execute a CONSTRUCT or DESCRIBE query
- Select "Graph" from the plugin selector
- Interact with nodes by clicking and dragging
- Zoom with mouse wheel
- Pan by dragging the background

**Configuration:**
Graph appearance is automatically themed to match YASGUI's current theme.

**More Information:**
Visit the [Graph Plugin Repository](https://github.com/Matdata-eu/yasgui-graph-plugin) for detailed documentation.

### Geo Plugin

Displays geographic data on an interactive map.

**Features:**
- Interactive map with zoom and pan
- Marker clustering for dense data
- Popup information on marker click
- Multiple map layer options
- Theme-aware styling

**Best For:**
- Queries returning coordinates (latitude/longitude)
- Geographic/spatial data
- Location-based queries
- Visualizing geographic distributions

**Usage:**
- Execute a query returning geo-coordinates
- Results should include latitude/longitude properties
- Select "Geo" from the plugin selector
- Interact with map markers

**Expected Data Format:**
The plugin looks for common coordinate properties:
- `wkt` (Well-Known Text)
- `lat`/`long` or `latitude`/`longitude`
- GeoJSON structures

**More Information:**
Visit [Yasgui Geo Plugin](https://github.com/Thib-G/yasgui-geo-tg) for detailed documentation.

### Error Plugin

Displays error messages and diagnostic information when queries fail.

**Features:**
- Detailed error messages
- HTTP status codes
- SPARQL endpoint errors
- CORS troubleshooting guidance
- Helpful suggestions for common issues

**Best For:**
- Understanding query failures
- Debugging endpoint issues
- Troubleshooting CORS problems

**When It Appears:**
- Query execution fails
- Network errors occur
- SPARQL syntax errors
- Endpoint unavailable

**Common Error Types:**
- **CORS Errors**: Cross-origin request blocked
- **Syntax Errors**: Invalid SPARQL syntax
- **Timeout**: Query took too long
- **404**: Endpoint not found
- **500**: Server error

### Plugin Selection

**Automatic Selection:**
YASGUI automatically selects the most appropriate plugin based on:
- Query type (SELECT, CONSTRUCT, ASK, DESCRIBE)
- Response content type
- Data structure

**Manual Selection:**
- Use the plugin selector buttons at the top of the results area
- Available plugins depend on the query results
- Your selection is saved per tab

---

## Keyboard Shortcuts

Master YASGUI with these keyboard shortcuts for faster querying.

### Query Editor (YASQE)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` / `Cmd+Enter` | Execute query |
| `Ctrl+Space` | Trigger autocomplete |
| `Ctrl+S` | Save query to local storage |
| `Ctrl+Shift+F` | Format query |
| `Ctrl+/` | Toggle comment on selected lines |
| `Ctrl+Shift+D` | Duplicate current line |
| `Ctrl+Shift+K` | Delete current line |
| `Esc` | Remove focus from editor |
| `Ctrl+Click` (on URI) | Explore URI connections |

### Fullscreen

| Shortcut | Action |
|----------|--------|
| `F11` | Toggle YASQE (editor) fullscreen |
| `F10` | Toggle YASR (results) fullscreen |
| `F9` | Switch between YASQE and YASR fullscreen |
| `Esc` | Exit fullscreen mode |

### General Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` / `Cmd+F` | Find in query |
| `Ctrl+H` / `Cmd+H` | Find and replace |
| `Ctrl+G` / `Cmd+G` | Go to line |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Tab` | Indent selection |
| `Shift+Tab` | Outdent selection |

### Results Viewer (YASR)

Navigation and interaction depend on the active plugin. Most plugins support:
- **Mouse wheel**: Scroll through results
- **Arrow keys**: Navigate table cells (in Table plugin)
- **Click**: Select/interact with elements

---

## Troubleshooting

### Common Issues and Solutions

#### Query Not Executing

**Symptoms:**
- Click Execute but nothing happens
- No results appear

**Solutions:**
1. **Check Query Syntax**: Look for red error indicators in the editor
2. **Verify Endpoint**: Ensure the endpoint URL is correct and accessible
3. **Check Browser Console**: Open browser developer tools (F12) for error messages
4. **Check Internet Connection**: Ensure you're online
5. **Try a Simple Query**: Execute a basic query to test the endpoint:
   ```sparql
   SELECT * WHERE { ?s ?p ?o } LIMIT 1
   ```

#### CORS Errors

**Symptoms:**
- Error message about "Cross-Origin Request Blocked"
- Query works in other tools but not in YASGUI

**Explanation:**
CORS (Cross-Origin Resource Sharing) is a browser security feature. Some SPARQL endpoints don't allow browser-based queries from different domains.

**Solutions:**
1. **Check Endpoint CORS Policy**: Contact the endpoint administrator
2. **Use CORS Proxy**: Configure a CORS proxy in YASGUI settings (if provided by administrator)
3. **Use Desktop/Server Version**: Run YASGUI locally or server-side where CORS doesn't apply
4. **Server-Side Proxy**: Query through a backend service

#### Slow Queries

**Symptoms:**
- Query takes very long to execute
- Browser becomes unresponsive

**Solutions:**
1. **Add LIMIT Clause**: Restrict result size:
   ```sparql
   SELECT * WHERE { ?s ?p ?o } LIMIT 100
   ```
2. **Optimize Query**: Make query more specific with filters
3. **Check Endpoint Status**: Endpoint might be under heavy load
4. **Break Into Smaller Queries**: Split complex queries into simpler parts
5. **Use Query Timeout**: Set a reasonable timeout in settings

#### Results Not Displaying Correctly

**Symptoms:**
- Results appear but look wrong
- Visualization doesn't show expected data

**Solutions:**
1. **Try Different Plugin**: Switch between Table, Response, and other plugins
2. **Check Response Plugin**: View raw response to verify data structure
3. **Check Data Format**: Ensure query returns expected format for the plugin
4. **Clear Cache**: Clear browser cache and reload YASGUI
5. **Check Browser Compatibility**: Use a modern browser (Chrome, Firefox, Safari, Edge)

#### Autocomplete Not Working

**Symptoms:**
- No suggestions appear when typing
- Ctrl+Space does nothing

**Solutions:**
1. **Check Internet Connection**: Prefix suggestions require network access
2. **Wait for Typing Pause**: Autocomplete appears after a brief delay
3. **Position Cursor Correctly**: Autocomplete context-dependent (prefixes, keywords, etc.)
4. **Manually Trigger**: Press `Ctrl+Space` to force autocomplete

#### Lost Queries

**Symptoms:**
- Previous queries disappeared
- Tabs missing after reload

**Solutions:**
1. **Check Browser Storage**: Ensure browser allows local storage
2. **Avoid Private/Incognito Mode**: These modes don't persist local storage
3. **Check Storage Limits**: Browser might have cleared old data
4. **Export Important Queries**: Save critical queries externally
5. **Use Bookmarks**: Bookmark queries as URLs for safekeeping
6. **Same browser**: Use the same browser and profile to access YASGUI

#### Theme/Layout Not Saving

**Symptoms:**
- Theme reverts to default on reload
- Layout orientation doesn't persist

**Solutions:**
1. **Enable Local Storage**: Check browser settings
2. **Check Private Mode**: Use normal browser mode
3. **Clear and Reset**: Clear browser data, reconfigure preferences
4. **Check Browser Compatibility**: Ensure modern browser with localStorage support

#### Formatting Issues

**Symptoms:**
- Format button doesn't work
- Query becomes malformed after formatting

**Solutions:**
1. **Check Query Syntax**: Formatter requires valid SPARQL
2. **Try Different Formatter**: Switch between sparql-formatter and legacy in Settings
3. **Manual Formatting**: Format query manually if auto-format fails
4. **Report Invalid Results**: If formatter produces incorrect output, it's a bug

### Getting Help

If you encounter issues not covered here:

1. **Check GitHub Issues**: Visit [YASGUI Issues](https://github.com/Matdata-eu/Yasgui/issues)
2. **Search Existing Issues**: Your problem might already be reported
3. **Create New Issue**: Provide:
   - YASGUI version
   - Browser and version
   - Steps to reproduce
   - Error messages
   - Example query (if applicable)
4. **Community Support**: Engage with the YASGUI community

### Best Practices

**For Reliable Querying:**
- Always use `LIMIT` when exploring new data
- Test complex queries incrementally
- Save important queries outside the browser
- Use meaningful tab names
- Keep YASGUI updated (if self-hosted)
- Monitor endpoint status pages
- Use appropriate query types (SELECT vs CONSTRUCT)

**For Better Performance:**
- Format queries for readability
- Use specific property paths instead of `?p`
- Add filters early in query patterns
- Avoid `SELECT *` on large datasets
- Close unused tabs
- Clear old results periodically

---

## Additional Resources

- **SPARQL Tutorial**: [https://kvistgaard.github.io/sparql/](https://kvistgaard.github.io/sparql/)
- **YASGUI GitHub**: [https://github.com/Matdata-eu/Yasgui](https://github.com/Matdata-eu/Yasgui)
- **Developer Documentation**: See Developer Guide for API and integration details
- **RDF Primer**: [https://www.w3.org/TR/rdf11-primer/](https://www.w3.org/TR/rdf11-primer/)
- **SPARQL Specification**: [https://www.w3.org/TR/sparql11-query/](https://www.w3.org/TR/sparql11-query/)

---

*This user guide is maintained as part of the YASGUI project. For technical implementation details, see the Developer Guide.*
