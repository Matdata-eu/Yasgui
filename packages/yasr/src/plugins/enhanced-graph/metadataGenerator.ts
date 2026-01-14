/**
 * Metadata Generator - Creates JSON-LD structured data and POSH link tags
 */

import { GraphData } from "./types";

/**
 * Generate Schema.org JSON-LD metadata for the visualization
 */
export function generateJSONLD(graphData: GraphData): object {
  return {
    "@context": "http://schema.org",
    "@type": "WebPage",
    name: "RDF Graph Visualization",
    description: `Interactive visualization of ${graphData.nodes.length} nodes and ${graphData.links.length} relationships`,
    about: {
      "@type": "VisualArtwork",
      name: "Enhanced RDF Graph",
      artform: "Digital Visualization",
      creator: {
        "@type": "SoftwareApplication",
        name: "OPAL (OpenLink AI Layer)",
        url: "https://opal.openlinksw.com",
        applicationCategory: "AI Tools",
      },
      publisher: {
        "@type": "Organization",
        name: "OpenLink Software",
        url: "https://www.openlinksw.com",
      },
      dateCreated: new Date().toISOString(),
      keywords: ["RDF", "Graph Visualization", "Semantic Web", "Knowledge Graph", "SPARQL"],
      description: `Force-directed graph visualization with ${graphData.nodes.length} nodes and ${graphData.links.length} edges`,
    },
    isPartOf: {
      "@type": "WebApplication",
      name: "Yasgui Enhanced Graph Plugin",
      applicationCategory: "Data Visualization",
      operatingSystem: "Web Browser",
    },
    potentialAction: {
      "@type": "InteractAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: window.location.href,
        actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
      },
    },
  };
}

/**
 * Generate POSH (Plain Old Semantic HTML) link tags
 */
export function generatePOSHLinks(): Array<{ rel: string; type: string; title: string }> {
  return [
    {
      rel: "alternate",
      type: "application/rss+xml",
      title: "RSS Feed",
    },
    {
      rel: "alternate",
      type: "application/atom+xml",
      title: "Atom Feed",
    },
    {
      rel: "alternate",
      type: "application/ld+json",
      title: "JSON-LD",
    },
    {
      rel: "alternate",
      type: "text/turtle",
      title: "Turtle (RDF)",
    },
  ];
}

/**
 * Inject JSON-LD script into document head
 */
export function injectJSONLD(jsonld: object): void {
  // Remove any existing Enhanced Graph metadata
  const existing = document.head.querySelector('script[data-enhanced-graph-metadata="true"]');
  if (existing) {
    existing.remove();
  }

  // Create and inject new script tag
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-enhanced-graph-metadata", "true");
  script.textContent = JSON.stringify(jsonld, null, 2);
  document.head.appendChild(script);
}

/**
 * Inject POSH link tags into document head
 */
export function injectPOSHLinks(links: Array<{ rel: string; type: string; title: string }>): void {
  // Remove any existing Enhanced Graph POSH links
  const existing = document.head.querySelectorAll('link[data-enhanced-graph-posh="true"]');
  existing.forEach((el) => el.remove());

  // Create and inject new link tags
  links.forEach((linkData) => {
    const link = document.createElement("link");
    link.rel = linkData.rel;
    link.type = linkData.type;
    link.title = linkData.title;
    link.setAttribute("data-enhanced-graph-posh", "true");
    // Note: href would typically point to actual alternate representations
    // For now, we're just adding the metadata structure
    document.head.appendChild(link);
  });
}

/**
 * Remove all injected metadata
 */
export function removeMetadata(): void {
  // Remove JSON-LD
  const jsonldScript = document.head.querySelector('script[data-enhanced-graph-metadata="true"]');
  if (jsonldScript) {
    jsonldScript.remove();
  }

  // Remove POSH links
  const poshLinks = document.head.querySelectorAll('link[data-enhanced-graph-posh="true"]');
  poshLinks.forEach((el) => el.remove());
}

/**
 * Main function to inject all metadata
 */
export function injectAllMetadata(graphData: GraphData): void {
  const jsonld = generateJSONLD(graphData);
  const poshLinks = generatePOSHLinks();

  injectJSONLD(jsonld);
  injectPOSHLinks(poshLinks);
}
