# Endpoint Quick Switch Buttons

The endpoint quick switch buttons feature allows you to configure a list of predefined SPARQL endpoints that users can quickly switch between with a single click. Users can also add their own custom endpoint buttons through the settings interface, which are persisted in local storage.

## Configuration

Add the `endpointButtons` option to your Yasgui configuration:

```javascript
new Yasgui(document.getElementById("yasgui"), {
  endpointButtons: [
    { endpoint: "https://dbpedia.org/sparql", label: "DBpedia" },
    { endpoint: "https://query.wikidata.org/sparql", label: "Wikidata" },
    { endpoint: "https://example.com/sparql", label: "Custom" }
  ]
});
```

## User-Defined Custom Buttons

Users can add their own custom endpoint buttons through the Settings menu:

1. Click the Settings button (⚙) in the controlbar
2. Navigate to the "Endpoint Buttons" tab
3. Enter a button label and endpoint URL
4. Click "+ Add Button"
5. Click "Save" to apply changes

Custom buttons are persisted in local storage and will appear alongside the configured buttons. Users can also remove custom buttons by clicking the × button next to each entry.

## Interface

Each button configuration object has the following properties:

- `endpoint` (string, required): The SPARQL endpoint URL
- `label` (string, required): The text displayed on the button

## Behavior

- Buttons are displayed next to the endpoint textbox in the controlbar
- Clicking a button immediately updates the endpoint textbox with the configured endpoint
- The endpoint change triggers the same behavior as manually entering an endpoint
- Buttons are fully accessible with ARIA labels

## Styling

The buttons support both light and dark themes automatically. You can customize the button appearance using CSS variables:

- `--yasgui-endpoint-button-bg`: Background color
- `--yasgui-endpoint-button-border`: Border color
- `--yasgui-endpoint-button-text`: Text color
- `--yasgui-endpoint-button-hover-bg`: Background color on hover
- `--yasgui-endpoint-button-hover-border`: Border color on hover
- `--yasgui-endpoint-button-focus`: Focus outline color

## Example

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

This configuration will display three buttons labeled "DBpedia", "Wikidata", and "ERA" that users can click to quickly switch between these endpoints.
