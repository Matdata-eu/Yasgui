// Footer toggle functionality for small screens
(function () {
  const footer = document.getElementById("footer");
  const footerToggle = document.getElementById("footer-toggle");

  if (!footer || !footerToggle) return;

  // Toggle footer visibility
  footerToggle.addEventListener("click", function () {
    footer.classList.toggle("expanded");
    footerToggle.classList.toggle("hidden");
  });

  // Close footer when clicking outside
  document.addEventListener("click", function (event) {
    const isClickInsideFooter = footer.contains(event.target);
    const isClickOnToggle = footerToggle.contains(event.target);

    // Only close if footer is expanded, click is outside, and not on toggle button
    if (footer.classList.contains("expanded") && !isClickInsideFooter && !isClickOnToggle) {
      footer.classList.remove("expanded");
      footerToggle.classList.remove("hidden");
    }
  });
})();

// Function to sync theme with body
function syncThemeWithBody() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  document.body.setAttribute("data-theme", theme);
}

// YASGUI is loaded via CDN in index.html and available as a global variable
if (typeof Yasgui !== "undefined") {
  const yasgui = new Yasgui(document.getElementById("yasgui"), {
    // Set the SPARQL endpoint
    requestConfig: {
      endpoint: "https://change.to.default.endpoint/sparql",
    },

    // Allow resizing of the Yasqe editor
    resizeable: true,

    // Whether to autofocus on Yasqe on page load
    autofocus: true,

    // Use the default endpoint when a new tab is opened
    copyEndpointOnNewTab: true,

    // Configuring which endpoints appear in the endpoint catalogue list
    endpointCatalogueOptions: {
      getData: () => {
        return [
          //List of objects should contain the endpoint field
          //Feel free to include any other fields (e.g. a description or icon
          //that you'd like to use when rendering)
          {
            endpoint: "https://data-interop.era.europa.eu/api/sparql",
          },
          {
            endpoint: "https://dbpedia.org/sparql",
          },
          {
            endpoint: "https://query.wikidata.org",
          },
          // ...
        ];
      },
      //Data object keys that are used for filtering. The 'endpoint' key already used by default
      keys: [],
      //Data argument contains a `value` property for the matched data object
      //Source argument is the suggestion DOM element to append your rendered item to
      renderItem: (data, source) => {
        const contentDiv = document.createElement("div");
        contentDiv.innerText = data.value.endpoint;
        source.appendChild(contentDiv);
      },
    },
  });

  // Sync theme immediately after initialization
  syncThemeWithBody();

  // Watch for theme changes on document.documentElement
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
        syncThemeWithBody();
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}
