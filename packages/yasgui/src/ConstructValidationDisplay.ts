import { addClass, removeClass } from "@matdata/yasgui-utils";
import { ValidationResult } from "./constructValidator";
import { ValidationPattern } from "./Tab";
import "./constructValidation.scss";

/**
 * Display component for CONSTRUCT query validation results
 * Shows which expected patterns were found or missing in the results
 */
export default class ConstructValidationDisplay {
  private container: HTMLElement;
  private validationEl?: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Display validation results
   * @param results Array of validation results to display
   */
  public show(results: ValidationResult[]) {
    this.clear();

    if (!results || results.length === 0) {
      return;
    }

    this.validationEl = document.createElement("div");
    addClass(this.validationEl, "construct-validation");

    const missingPatterns = results.filter((r) => !r.found);
    const foundPatterns = results.filter((r) => r.found);

    // Show summary
    const summary = document.createElement("div");
    addClass(summary, "validation-summary");

    if (missingPatterns.length > 0) {
      addClass(summary, "has-missing");
      const icon = document.createElement("span");
      addClass(icon, "validation-icon", "warning");
      icon.textContent = "⚠";
      summary.appendChild(icon);

      const text = document.createElement("span");
      text.textContent = `${missingPatterns.length} expected pattern${missingPatterns.length === 1 ? "" : "s"} missing`;
      summary.appendChild(text);
    } else if (foundPatterns.length > 0) {
      addClass(summary, "has-found");
      const icon = document.createElement("span");
      addClass(icon, "validation-icon", "success");
      icon.textContent = "✓";
      summary.appendChild(icon);

      const text = document.createElement("span");
      text.textContent = `All ${foundPatterns.length} expected pattern${foundPatterns.length === 1 ? "" : "s"} found`;
      summary.appendChild(text);
    }

    // Add expand/collapse button
    const toggleBtn = document.createElement("button");
    addClass(toggleBtn, "validation-toggle");
    toggleBtn.textContent = "▼";
    toggleBtn.setAttribute("aria-label", "Toggle validation details");
    summary.appendChild(toggleBtn);

    this.validationEl.appendChild(summary);

    // Details section (initially collapsed)
    const details = document.createElement("div");
    addClass(details, "validation-details", "collapsed");

    // Show missing patterns
    if (missingPatterns.length > 0) {
      const missingSection = document.createElement("div");
      addClass(missingSection, "validation-section", "missing");

      const missingTitle = document.createElement("h4");
      missingTitle.textContent = "Missing Patterns:";
      missingSection.appendChild(missingTitle);

      const missingList = document.createElement("ul");
      missingPatterns.forEach((result) => {
        const item = document.createElement("li");
        const code = document.createElement("code");
        const patternText = this.formatPattern(result.pattern);
        code.textContent = patternText;
        item.appendChild(code);
        if (result.pattern.description) {
          const desc = document.createElement("span");
          addClass(desc, "pattern-description");
          desc.textContent = ` - ${result.pattern.description}`;
          item.appendChild(desc);
        }
        missingList.appendChild(item);
      });
      missingSection.appendChild(missingList);
      details.appendChild(missingSection);
    }

    // Show found patterns
    if (foundPatterns.length > 0) {
      const foundSection = document.createElement("div");
      addClass(foundSection, "validation-section", "found");

      const foundTitle = document.createElement("h4");
      foundTitle.textContent = "Found Patterns:";
      foundSection.appendChild(foundTitle);

      const foundList = document.createElement("ul");
      foundPatterns.forEach((result) => {
        const item = document.createElement("li");
        const code = document.createElement("code");
        const patternText = this.formatPattern(result.pattern);
        code.textContent = patternText;
        item.appendChild(code);
        if (result.pattern.description) {
          const desc = document.createElement("span");
          addClass(desc, "pattern-description");
          desc.textContent = ` - ${result.pattern.description}`;
          item.appendChild(desc);
        }
        const count = document.createElement("span");
        addClass(count, "match-count");
        count.textContent = ` (${result.matchingTriples?.length || 0} match${result.matchingTriples?.length === 1 ? "" : "es"})`;
        item.appendChild(count);
        foundList.appendChild(item);
      });
      foundSection.appendChild(foundList);
      details.appendChild(foundSection);
    }

    this.validationEl.appendChild(details);

    // Toggle details on click
    toggleBtn.onclick = () => {
      if (details.classList.contains("collapsed")) {
        removeClass(details, "collapsed");
        toggleBtn.textContent = "▲";
      } else {
        addClass(details, "collapsed");
        toggleBtn.textContent = "▼";
      }
    };

    this.container.appendChild(this.validationEl);
  }

  /**
   * Format a validation pattern for display
   */
  private formatPattern(pattern: ValidationPattern): string {
    const s = pattern.subject || "*";
    const p = pattern.predicate || "*";
    const o = pattern.object || "*";
    return `${s} ${p} ${o}`;
  }

  /**
   * Clear the validation display
   */
  public clear() {
    if (this.validationEl) {
      this.validationEl.remove();
      this.validationEl = undefined;
    }
  }
}
