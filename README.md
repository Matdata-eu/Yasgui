# YASGUI

YASGUI (Yet Another SPARQL GUI) is an advanced SPARQL client for querying and exploring RDF data. It provides a user-friendly interface for writing SPARQL queries, executing them against SPARQL endpoints, and visualizing the results in various formats.

Go to https://yasgui.matdata.eu/ and use it freely in production. Or fork this repo and extend it yourself. Contributions are certainly welcome!

## Table of Contents

- [Useful Links](#useful-links)
- [Features](#features)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
    - [Query Editor (Yasqe)](#query-editor-yasqe)
    - [Fullscreen Mode](#fullscreen-mode)
    - [URI Explorer](#uri-explorer)
  - [Prefix Management](#prefix-management)
  - [Result Visualization Plugins (Yasr)](#result-visualization-plugins-yasr)
- [Installation](#installation)
  - [npm](#npm)
  - [Yarn](#yarn)
- [Local Development](#local-development)
- [License](#license)

## Useful Links

- Production environment: https://yasgui.matdata.eu/
- Dev environment: https://yasgui-dev.matdata.eu/ (GitHub Pages - automatically updated with every commit to main branch)
- User documentation: https://docs.triply.cc/yasgui/
- Developer documentation: https://docs.triply.cc/yasgui-api/
- Docker Hub: https://hub.docker.com/r/mathiasvda/yasgui

## Features

### Themes

Yasgui supports both **light** and **dark** themes with instant switching:

- **Theme Toggle Button**: Quickly switch between light and dark modes using the button in the tab bar
- **Persistent Preference**: Your theme choice is automatically saved
- **System Detection**: Automatically matches your system's dark/light mode preference
- **Full Coverage**: Consistent theming across all components (editor, results, modals)

See the [Theme Guide](./docs/THEME_GUIDE.md) for detailed configuration options and usage examples.

See the [Theme Implementation Guide](./docs/THEME_IMPLEMENTATION_GUIDE.md) for detailed instructions on how to implement theme support in your own Yasgui plugins.

### Layout Orientation

Yasgui supports two layout orientations to optimize screen space usage:

- **Vertical Layout (Default)**: YASQE (query editor) positioned above YASR (results viewer)
- **Horizontal Layout**: YASQE and YASR positioned side-by-side

The horizontal layout is particularly useful for wide monitors, allowing you to dedicate the complete height to both the query editor and results viewer.

To use the horizontal layout, configure Yasgui with the `orientation` option:

```javascript
new Yasgui(document.getElementById("yasgui"), {
  orientation: "horizontal" // or "vertical" (default)
});
```

You can also customize the header height used in the horizontal layout calculation by setting the CSS custom property:

```css
.yasgui {
  --yasgui-header-height: 120px; /* Adjust based on your header height */
}
```

### Keyboard Shortcuts

#### Query Editor (Yasqe)
- **Ctrl+Enter** / **Cmd+Enter**: Execute the current query
- **Ctrl+Space**: Trigger autocomplete
- **Ctrl+S**: Save query to local storage
- **Shift+Ctrl+F**: Auto-format the query
- **Ctrl+/**: Comment/uncomment selected lines
- **Shift+Ctrl+D**: Duplicate the current line
- **Shift+Ctrl+K**: Delete the current line
- **Esc**: Remove focus from the editor

#### Fullscreen Mode
- **F11**: Toggle fullscreen mode for the query editor (Yasqe)
- **F10**: Toggle fullscreen mode for the results viewer (Yasr)
- **Ctrl+Shift+F**: Switch between Yasqe and Yasr fullscreen modes

#### URI Explorer
- **Ctrl+Click** on any URI in the query editor: Automatically executes a CONSTRUCT query to explore the clicked URI's connections (incoming and outgoing triples). The query runs in the background without modifying your current query in the editor.

### Prefix Management
- **PREFIX Button**: Insert saved prefix declarations into your query (replaces existing PREFIX lines at the beginning)
- **Settings Modal**: Access via the settings button (⚙) to manage:
  - **Saved Prefixes**: Define reusable PREFIX declarations
  - **Auto-capture**: Automatically captures new prefixes from your queries (enabled by default)
  - **Request Configuration**: Configure HTTP request method, accept headers, arguments, headers, and named/default graphs
- **Default Prefixes**: Automatically includes `rdf:` and `rdfs:` prefixes for new users
- **Prefix Autocomplete**: When typing a prefix declaration (e.g., `PREFIX foaf:`), the editor automatically queries [prefix.cc](https://prefix.cc) to suggest and auto-complete the full URI commonly associated with that prefix. This helps you quickly add standard prefixes without needing to remember their full URIs.

### Result Visualization Plugins (Yasr)

Yasgui includes several built-in plugins to visualize SPARQL query results:

- **Table**: Interactive table view with sorting, filtering, pagination, and column resizing. Ideal for SELECT query results.
- **Boolean**: Displays boolean results (true/false) with visual indicators. Automatically used for ASK queries.
- **Response**: Raw response viewer with syntax highlighting and code folding. Shows the original response from the endpoint in JSON, XML, Turtle, or other formats.
- **Geo**: Geographic visualization plugin for displaying spatial data on interactive maps. Visualizes geospatial triples with coordinates. See [Yasgui Geo TG Plugin](https://github.com/Thib-G/yasgui-geo-tg) for more details.
- **Graph**: Visual graph representation of RDF data using nodes and edges. Ideal for CONSTRUCT/DESCRIBE query results. See [Yasgui Graph Plugin](https://github.com/Matdata-eu/yasgui-graph-plugin) for more details.
- **Error**: Displays error messages and diagnostics when queries fail, including CORS troubleshooting guidance.

Plugins are automatically selected based on the query type and response format. You can manually switch between available plugins using the view selector in the results pane.

## Installation

Below are instructions on how to include Yasgui in your project.
If you only want to install Yasr or Yasqe, replace yasgui in the commands below.

### npm

```sh
npm i @matdata/yasgui
```

### Yarn

```sh
yarn add @matdata/yasgui
```

### Docker

Yasgui is also available as a Docker image on Docker Hub. Images are built and published automatically when a new release is created.

```sh
docker pull mathiasvda/yasgui:latest
docker run -p 8080:8080 mathiasvda/yasgui:latest
```

You can customize the default SPARQL endpoint by setting the `YASGUI_DEFAULT_ENDPOINT` environment variable:

```sh
docker run -p 8080:8080 -e YASGUI_DEFAULT_ENDPOINT=https://your-endpoint.com/sparql mathiasvda/yasgui:latest
```

The application will be available at `http://localhost:8080`.

## Local Development

#### Installing dependencies

Run `npm install`.

#### Running Yasgui locally

To develop locally, run `npm run dev`

Go to `http://localhost:5173/demo` in your browser to see Yasgui in action.

#### Compiling Yasgui

Run `npm run build`. It'll store the transpiled js/css files in the `build` directory.

## License

This is a fork from [Zazuko](https://github.com/zazuko/Yasgui) who forked it from [Triply](https://github.com/TriplyDB/Yasgui).

This code is released under the MIT license.

## Release notes

Release notes can be found in the release section of the GitHub repository: [Yasgui Releases](https://github.com/Matdata-eu/yasgui/releases)

Instructions on how to write release notes are found in 