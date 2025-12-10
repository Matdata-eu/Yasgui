/**
 * Export/Import Configuration Module
 * Handles serialization and deserialization of YASGUI configuration to/from RDF Turtle format
 */

import { PersistedJson } from "./PersistentConfig";

// YASGUI Configuration Ontology
export const YASGUI_NS = "http://yasgui.org/ontology#";
export const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
export const RDFS_NS = "http://www.w3.org/2000/01/rdf-schema#";
export const XSD_NS = "http://www.w3.org/2001/XMLSchema#";

/**
 * Serialize configuration to Turtle format
 */
export function serializeToTurtle(config: PersistedJson): string {
  const lines: string[] = [];

  // Prefixes
  lines.push(`@prefix yasgui: <${YASGUI_NS}> .`);
  lines.push(`@prefix rdf: <${RDF_NS}> .`);
  lines.push(`@prefix rdfs: <${RDFS_NS}> .`);
  lines.push(`@prefix xsd: <${XSD_NS}> .`);
  lines.push("");

  // Main configuration node
  lines.push(`[] a yasgui:Configuration ;`);

  // Endpoint history
  if (config.endpointHistory && config.endpointHistory.length > 0) {
    lines.push(`  yasgui:endpointHistory (`);
    config.endpointHistory.forEach((endpoint) => {
      lines.push(`    "${escapeTurtleString(endpoint)}"`);
    });
    lines.push(`  ) ;`);
  }

  // Active tab
  if (config.active) {
    lines.push(`  yasgui:activeTab "${escapeTurtleString(config.active)}" ;`);
  }

  // Prefixes
  if (config.prefixes) {
    lines.push(`  yasgui:prefixes """${escapeTurtleString(config.prefixes)}""" ;`);
  }

  // Auto capture enabled
  if (config.autoCaptureEnabled !== undefined) {
    lines.push(`  yasgui:autoCaptureEnabled "${config.autoCaptureEnabled}"^^xsd:boolean ;`);
  }

  // Custom endpoint buttons
  if (config.customEndpointButtons && config.customEndpointButtons.length > 0) {
    lines.push(`  yasgui:customEndpointButton [`);
    config.customEndpointButtons.forEach((button, index) => {
      const isLast = index === config.customEndpointButtons!.length - 1;
      lines.push(`    yasgui:label "${escapeTurtleString(button.label)}" ;`);
      lines.push(`    yasgui:endpoint "${escapeTurtleString(button.endpoint)}"${isLast ? "" : " ;"}`);
      if (!isLast) {
        lines.push(`  ] , [`);
      }
    });
    lines.push(`  ] ;`);
  }

  // Tabs
  if (config.tabs && config.tabs.length > 0) {
    lines.push(`  yasgui:tab [`);
    config.tabs.forEach((tabId, tabIndex) => {
      const tabConfig = config.tabConfig[tabId];
      const isLastTab = tabIndex === config.tabs.length - 1;

      lines.push(`    yasgui:tabId "${escapeTurtleString(tabId)}" ;`);
      lines.push(`    yasgui:tabName "${escapeTurtleString(tabConfig.name)}" ;`);

      // Query
      if (tabConfig.yasqe?.value) {
        lines.push(`    yasgui:query """${escapeTurtleString(tabConfig.yasqe.value)}""" ;`);
      }

      // Editor height
      if (tabConfig.yasqe?.editorHeight) {
        lines.push(`    yasgui:editorHeight "${escapeTurtleString(tabConfig.yasqe.editorHeight)}" ;`);
      }

      // Request config
      if (tabConfig.requestConfig) {
        const reqConfig = tabConfig.requestConfig;
        if (reqConfig.endpoint && typeof reqConfig.endpoint === "string") {
          lines.push(`    yasgui:endpoint "${escapeTurtleString(reqConfig.endpoint)}" ;`);
        }
        if (reqConfig.method && typeof reqConfig.method === "string") {
          lines.push(`    yasgui:requestMethod "${escapeTurtleString(reqConfig.method)}" ;`);
        }
        if (reqConfig.acceptHeaderSelect && typeof reqConfig.acceptHeaderSelect === "string") {
          lines.push(`    yasgui:acceptHeaderSelect "${escapeTurtleString(reqConfig.acceptHeaderSelect)}" ;`);
        }
        if (reqConfig.acceptHeaderGraph && typeof reqConfig.acceptHeaderGraph === "string") {
          lines.push(`    yasgui:acceptHeaderGraph "${escapeTurtleString(reqConfig.acceptHeaderGraph)}" ;`);
        }
      }

      // YASR settings
      if (tabConfig.yasr?.settings) {
        const yasrSettings = tabConfig.yasr.settings;
        if (yasrSettings.selectedPlugin) {
          lines.push(`    yasgui:selectedPlugin "${escapeTurtleString(yasrSettings.selectedPlugin)}" ;`);
        }
      }

      // Remove trailing semicolon from last property
      const lastLine = lines[lines.length - 1];
      if (lastLine.endsWith(" ;")) {
        lines[lines.length - 1] = lastLine.slice(0, -2);
      }

      if (!isLastTab) {
        lines.push(`  ] , [`);
      }
    });
    lines.push(`  ] .`);
  } else {
    // Remove trailing semicolon if no tabs
    const lastLine = lines[lines.length - 1];
    if (lastLine.endsWith(" ;")) {
      lines[lines.length - 1] = lastLine.slice(0, -2) + " .";
    }
  }

  return lines.join("\n");
}

/**
 * Escape special characters in Turtle strings
 */
function escapeTurtleString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Unescape Turtle string
 */
function unescapeTurtleString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Parse Turtle format back to configuration
 * This is a simplified parser focused on the structure we generate
 */
export function parseFromTurtle(turtle: string): Partial<PersistedJson> {
  const config: Partial<PersistedJson> = {
    endpointHistory: [],
    tabs: [],
    tabConfig: {},
    customEndpointButtons: [],
  };

  try {
    // Extract endpoint history
    const endpointHistoryMatch = turtle.match(/yasgui:endpointHistory\s*\(([\s\S]*?)\)/);
    if (endpointHistoryMatch) {
      const endpoints = endpointHistoryMatch[1].match(/"([^"]*)"/g);
      if (endpoints) {
        config.endpointHistory = endpoints.map((e) => unescapeTurtleString(e.slice(1, -1)));
      }
    }

    // Extract active tab
    const activeTabMatch = turtle.match(/yasgui:activeTab\s+"([^"]*)"/);
    if (activeTabMatch) {
      config.active = unescapeTurtleString(activeTabMatch[1]);
    }

    // Extract prefixes
    const prefixesMatch = turtle.match(/yasgui:prefixes\s+"""([\s\S]*?)"""/);
    if (prefixesMatch) {
      config.prefixes = unescapeTurtleString(prefixesMatch[1]);
    }

    // Extract auto capture enabled
    const autoCaptureMatch = turtle.match(/yasgui:autoCaptureEnabled\s+"([^"]*)"/);
    if (autoCaptureMatch) {
      config.autoCaptureEnabled = autoCaptureMatch[1] === "true";
    }

    // Extract custom endpoint buttons
    const buttonPattern =
      /yasgui:customEndpointButton\s+\[([\s\S]*?)yasgui:label\s+"([^"]*)"\s*;\s*yasgui:endpoint\s+"([^"]*)"/g;
    let buttonMatch;
    while ((buttonMatch = buttonPattern.exec(turtle)) !== null) {
      config.customEndpointButtons!.push({
        label: unescapeTurtleString(buttonMatch[2]),
        endpoint: unescapeTurtleString(buttonMatch[3]),
      });
    }

    // Extract tabs - simplified parsing
    const tabPattern =
      /yasgui:tabId\s+"([^"]*)"\s*;\s*yasgui:tabName\s+"([^"]*)"\s*;[\s\S]*?(?=yasgui:tabId|yasgui:customEndpointButton|\]\.|\]\s*,\s*\[)/g;
    const tabBlocks = turtle.match(/yasgui:tab\s+\[([\s\S]*)\]\s*\./);

    if (tabBlocks) {
      const tabsContent = tabBlocks[1];
      const tabIdMatches = [...tabsContent.matchAll(/yasgui:tabId\s+"([^"]*)"/g)];
      const tabNameMatches = [...tabsContent.matchAll(/yasgui:tabName\s+"([^"]*)"/g)];
      const queryMatches = [...tabsContent.matchAll(/yasgui:query\s+"""([\s\S]*?)"""/g)];
      const endpointMatches = [...tabsContent.matchAll(/yasgui:endpoint\s+"([^"]*)"/g)];
      const methodMatches = [...tabsContent.matchAll(/yasgui:requestMethod\s+"([^"]*)"/g)];

      tabIdMatches.forEach((match, index) => {
        const tabId = unescapeTurtleString(match[1]);
        const tabName = tabNameMatches[index] ? unescapeTurtleString(tabNameMatches[index][1]) : "Query";
        const query = queryMatches[index] ? unescapeTurtleString(queryMatches[index][1]) : "";
        const endpoint = endpointMatches[index] ? unescapeTurtleString(endpointMatches[index][1]) : "";
        const method = methodMatches[index] ? unescapeTurtleString(methodMatches[index][1]) : "POST";

        config.tabs!.push(tabId);
        config.tabConfig![tabId] = {
          id: tabId,
          name: tabName,
          yasqe: {
            value: query,
          },
          requestConfig: {
            queryArgument: undefined,
            endpoint: endpoint,
            method: method as "GET" | "POST",
            acceptHeaderGraph: "text/turtle",
            acceptHeaderSelect: "application/sparql-results+json",
            acceptHeaderUpdate: "application/sparql-results+json",
            namedGraphs: [],
            defaultGraphs: [],
            args: [],
            headers: {},
            withCredentials: false,
            adjustQueryBeforeRequest: false,
          },
          yasr: {
            settings: {},
            response: undefined,
          },
        };
      });
    }
  } catch (error) {
    console.error("Error parsing Turtle configuration:", error);
    throw new Error("Failed to parse configuration. Please check the format.");
  }

  return config;
}

/**
 * Download configuration as a file
 */
export function downloadConfigAsFile(config: PersistedJson, filename: string = "yasgui-config.ttl") {
  const turtle = serializeToTurtle(config);
  const blob = new Blob([turtle], { type: "text/turtle;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy configuration to clipboard
 */
export async function copyConfigToClipboard(config: PersistedJson): Promise<void> {
  const turtle = serializeToTurtle(config);
  try {
    await navigator.clipboard.writeText(turtle);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = turtle;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Read configuration from file
 */
export function readConfigFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Read configuration from clipboard
 */
export async function readConfigFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (error) {
    throw new Error("Failed to read from clipboard. Please paste the content manually.");
  }
}
