import * as chai from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";

import { resolveEndpointUrl } from "../../packages/yasgui/src/urlUtils.js";

const expect = chai.expect;

describe("URL utilities - resolveEndpointUrl", () => {
  let originalWindow: any;

  beforeEach(() => {
    // Save the original window object if it exists
    originalWindow = (global as any).window;
  });

  afterEach(() => {
    // Restore the original window object
    if (originalWindow) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
  });

  function mockWindow(url: string) {
    const parsedUrl = new URL(url);
    (global as any).window = {
      location: {
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        pathname: parsedUrl.pathname,
        href: url,
      },
    };
  }

  it("returns absolute URLs unchanged (http)", () => {
    mockWindow("https://example.com/yasgui/");
    const result = resolveEndpointUrl("http://example.com/sparql");
    expect(result).to.equal("http://example.com/sparql");
  });

  it("returns absolute URLs unchanged (https)", () => {
    mockWindow("https://example.com/yasgui/");
    const result = resolveEndpointUrl("https://example.com/sparql");
    expect(result).to.equal("https://example.com/sparql");
  });

  it("converts absolute path to full URL with current protocol and host", () => {
    mockWindow("https://example.com/yasgui/index.html");
    const result = resolveEndpointUrl("/sparql");
    expect(result).to.equal("https://example.com/sparql");
  });

  it("converts relative path to full URL with current directory", () => {
    mockWindow("https://example.com/yasgui/");
    const result = resolveEndpointUrl("sparql");
    expect(result).to.equal("https://example.com/yasgui/sparql");
  });

  it("uses https protocol when page is https", () => {
    mockWindow("https://secure.example.com/app/");
    const result = resolveEndpointUrl("/sparql");
    expect(result).to.equal("https://secure.example.com/sparql");
  });

  it("uses http protocol when page is http", () => {
    mockWindow("http://example.com/app/");
    const result = resolveEndpointUrl("/sparql");
    expect(result).to.equal("http://example.com/sparql");
  });

  it("handles empty string", () => {
    mockWindow("https://example.com/app/");
    const result = resolveEndpointUrl("");
    expect(result).to.equal("");
  });

  it("includes port number if present", () => {
    mockWindow("https://example.com:8080/app/");
    const result = resolveEndpointUrl("/sparql");
    expect(result).to.equal("https://example.com:8080/sparql");
  });
});
