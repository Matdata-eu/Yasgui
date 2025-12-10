# Import/Export Configuration Feature

## Overview

The Import/Export Configuration feature allows YASGUI users to backup, share, and migrate their complete configuration using the RDF Turtle format. This feature provides a standardized, semantic way to preserve and transfer all YASGUI settings, queries, and preferences.

## Features

### Export Capabilities

1. **Download as File**: Export configuration as a `.ttl` (Turtle) file
2. **Copy to Clipboard**: Copy the Turtle-formatted configuration to clipboard for easy sharing

### Import Capabilities

1. **File Upload**: Browse and select a `.ttl` file to import
2. **Drag & Drop**: Drag a configuration file directly onto the import area
3. **Paste from Clipboard**: Import configuration directly from clipboard

### What Gets Exported/Imported

The configuration includes:

- **Query Tabs**: All tab names, IDs, and their queries
- **Endpoint Settings**: SPARQL endpoint URLs and configurations
- **Request Settings**: HTTP method, accept headers
- **Saved Prefixes**: User-defined PREFIX declarations
- **Custom Endpoint Buttons**: User-added quick-access endpoint buttons
- **Auto-Capture Settings**: Prefix auto-capture preferences
- **Active Tab**: Currently selected tab

## Technical Implementation

### RDF Ontology

The feature defines a custom RDF vocabulary at `https://yasgui.matdata.eu/ontology#`:

#### Classes

- `yasgui:Configuration` - Root configuration node

#### Properties

- `yasgui:tab` - Links to tab configurations
- `yasgui:tabId` - Unique identifier for a tab
- `yasgui:tabName` - Display name of a tab
- `yasgui:activeTab` - Currently active tab ID
- `yasgui:query` - SPARQL query content
- `yasgui:endpoint` - SPARQL endpoint URL
- `yasgui:requestMethod` - HTTP method (GET/POST)
- `yasgui:acceptHeaderSelect` - Accept header for SELECT queries
- `yasgui:acceptHeaderGraph` - Accept header for CONSTRUCT queries
- `yasgui:prefixes` - Saved PREFIX declarations
- `yasgui:customEndpointButton` - Custom endpoint button
- `yasgui:label` - Button label
- `yasgui:endpointHistory` - List of previously used endpoints
- `yasgui:autoCaptureEnabled` - Boolean for auto-capture setting
- `yasgui:selectedPlugin` - Active result viewer plugin

### File Format Example

```turtle
@prefix yasgui: <https://yasgui.matdata.eu/ontology#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

[] a yasgui:Configuration ;
  yasgui:activeTab "tab1" ;
  yasgui:prefixes """PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>""" ;
  yasgui:autoCaptureEnabled "true"^^xsd:boolean ;
  yasgui:customEndpointButton [
    yasgui:label "DBpedia" ;
    yasgui:endpoint "https://dbpedia.org/sparql"
  ] ;
  yasgui:tab [
    yasgui:tabId "tab1" ;
    yasgui:tabName "My Query" ;
    yasgui:query """SELECT * WHERE { ?s ?p ?o } LIMIT 10""" ;
    yasgui:endpoint "https://dbpedia.org/sparql" ;
    yasgui:requestMethod "POST" ;
    yasgui:acceptHeaderSelect "application/sparql-results+json" ;
    yasgui:acceptHeaderGraph "text/turtle"
  ] .
```

## Architecture

### Module Structure

#### ConfigExportImport.ts

Main module containing:

- `serializeToTurtle(config)` - Converts configuration to Turtle format
- `parseFromTurtle(turtle)` - Parses Turtle back to configuration object
- `downloadConfigAsFile(config, filename)` - Downloads configuration as file
- `copyConfigToClipboard(config)` - Copies configuration to clipboard
- `readConfigFromFile(file)` - Reads configuration from uploaded file
- `readConfigFromClipboard()` - Reads configuration from clipboard

#### PersistentConfig.ts (Extended)

Added public methods:

- `getPersistedConfig()` - Safely retrieves current configuration
- `updatePersistedConfig(config)` - Updates configuration and saves to storage

#### TabSettingsModal.ts (Extended)

New UI components:

- Import/Export tab in settings modal
- Export section with Copy and Download buttons
- Import section with drag-drop area
- Notification system for user feedback

#### TabSettingsModal.scss (Extended)

Styles for:

- Export/Import buttons
- Drag and drop zone
- Notification toasts
- Responsive layouts

## User Interface

### Settings Modal

The Import/Export feature is accessible through the Settings modal:

1. Click the Settings icon (⚙) in the control bar
2. Navigate to the "Import/Export" tab
3. Use export or import functionality as needed

### Export Section

- **Label**: "Export Configuration"
- **Description**: Explains the export functionality
- **Buttons**:
  - 📋 Copy to Clipboard
  - 💾 Download as File

### Import Section

- **Label**: "Import Configuration"
- **Description**: Explains the import functionality
- **Drag & Drop Area**: Large drop zone with file icon
- **Buttons**:
  - 📂 Browse Files
  - 📋 Paste from Clipboard

### Notifications

Visual feedback notifications appear after actions:

- **Success** (green): "Configuration copied to clipboard!" / "Configuration downloaded!"
- **Error** (red): Error messages with details
- **Info**: "Configuration imported successfully! Reload the page to see changes."

## Use Cases

### Backup

Users can export their configuration before:
- Clearing browser data
- Testing experimental queries
- Major configuration changes
- Browser migrations

### Sharing

Teams can share standardized configurations:
- Common query templates
- Predefined endpoint collections
- Standard prefix sets
- Project-specific setups

### Migration

Move configurations between:
- Different browsers
- Different devices
- Development and production environments
- Team members

### Version Control

Track configuration changes:
- Store configuration files in Git
- Compare different versions
- Roll back to previous configurations
- Document configuration evolution

## Implementation Notes

### Parser Limitations

The Turtle parser is optimized for YASGUI-generated Turtle format. It uses regex-based parsing for simplicity and speed. For production use with arbitrary Turtle input, consider using a robust RDF library like N3.js.

### Browser Compatibility

- **Clipboard API**: Modern browsers (Chrome 63+, Firefox 53+, Edge 79+)
- **File API**: All modern browsers
- **Drag & Drop**: All modern browsers
- **LocalStorage**: Required for persistence

### Security Considerations

- Configuration data remains local (stored in browser's LocalStorage)
- No server-side processing or storage
- Export files contain plain text (users should be aware of sensitive data)
- Import confirms before overwriting existing configuration

### Performance

- Export: Near-instant for typical configurations
- Import: Fast parsing with regex patterns
- File size: Typically 1-10 KB for average configurations
- No impact on query execution performance

## Future Enhancements

Potential improvements:

1. **Full RDF Parser**: Integrate N3.js or similar for robust Turtle parsing
2. **JSON Format**: Additional export format for simpler parsing
3. **Selective Export**: Choose specific tabs or settings to export
4. **Configuration Merge**: Merge imported configuration with existing
5. **Cloud Sync**: Optional cloud storage for cross-device synchronization
6. **Configuration Templates**: Pre-built configurations for common use cases
7. **Validation**: Validate configuration before import
8. **Migration Utilities**: Tools to migrate from older YASGUI versions

## Testing

### Manual Testing Checklist

- [ ] Export to file downloads `.ttl` file
- [ ] Export to clipboard copies valid Turtle
- [ ] Import from file loads configuration
- [ ] Import from clipboard parses correctly
- [ ] Drag & drop works with `.ttl` files
- [ ] Notifications appear for all actions
- [ ] Configuration persists after reload
- [ ] Round-trip (export then import) preserves data
- [ ] Error handling for invalid Turtle
- [ ] Confirmation dialog appears before import

### Edge Cases

- Empty configuration
- Configuration with special characters in queries
- Large configurations (many tabs)
- Invalid Turtle format
- Missing required properties
- Browser with clipboard disabled

## Documentation

User documentation is available in:

- `docs/user-guide.md` - Comprehensive user guide with examples
- In-app help text in the Import/Export tab
- Tooltips on buttons

## Credits

Implemented as part of the YASGUI project to enhance user experience and facilitate configuration management across environments and teams.
