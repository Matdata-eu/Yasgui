import * as chai from "chai";
import { describe, it } from "mocha";

import { coordinatesToWkt, wrapWktLiteral } from "../../packages/yasqe/src/mapWidget.js";

const expect = chai.expect;

describe("WKT map widget utilities", () => {
  it("creates a POINT from the latest coordinate", () => {
    const wkt = coordinatesToWkt("POINT", [
      { lng: 4.1234567, lat: 52.9876543 },
      { lng: 5.5, lat: 51.5 },
    ]);
    expect(wkt).to.equal("POINT(5.5 51.5)");
  });

  it("creates a LINESTRING for two or more coordinates", () => {
    const wkt = coordinatesToWkt("LINESTRING", [
      { lng: 4.1, lat: 52.1 },
      { lng: 4.2, lat: 52.2 },
      { lng: 4.3, lat: 52.3 },
    ]);
    expect(wkt).to.equal("LINESTRING(4.1 52.1, 4.2 52.2, 4.3 52.3)");
  });

  it("returns undefined LINESTRING when fewer than two coordinates are provided", () => {
    expect(coordinatesToWkt("LINESTRING", [{ lng: 4.1, lat: 52.1 }])).to.equal(undefined);
  });

  it("creates a POLYGON and closes the ring automatically", () => {
    const wkt = coordinatesToWkt("POLYGON", [
      { lng: 4.1, lat: 52.1 },
      { lng: 4.2, lat: 52.2 },
      { lng: 4.3, lat: 52.1 },
    ]);
    expect(wkt).to.equal("POLYGON((4.1 52.1, 4.2 52.2, 4.3 52.1, 4.1 52.1))");
  });

  it("returns undefined for degenerate polygons with fewer than 3 distinct coordinates", () => {
    const wkt = coordinatesToWkt("POLYGON", [
      { lng: 4.1, lat: 52.1 },
      { lng: 4.2, lat: 52.2 },
      { lng: 4.1, lat: 52.1 },
    ]);
    expect(wkt).to.equal(undefined);
  });

  it("wraps generated WKT as a typed literal using geo:wktLiteral datatype IRI", () => {
    expect(wrapWktLiteral("POINT(4.1 52.1)")).to.equal(
      '"POINT(4.1 52.1)"^^<http://www.opengis.net/ont/geosparql#wktLiteral>',
    );
  });
});
