export type WktGeometryType = "POINT" | "LINESTRING" | "POLYGON";

export interface WktCoordinate {
  lat: number;
  lng: number;
}

const MAX_DECIMALS = 6;

function normalizeCoordinate(value: number): string {
  return Number(value.toFixed(MAX_DECIMALS)).toString();
}

function sameCoordinate(left: WktCoordinate, right: WktCoordinate): boolean {
  return left.lat === right.lat && left.lng === right.lng;
}

function formatCoordinates(coordinates: WktCoordinate[]) {
  return coordinates.map((coord) => `${normalizeCoordinate(coord.lng)} ${normalizeCoordinate(coord.lat)}`).join(", ");
}

export function coordinatesToWkt(geometryType: WktGeometryType, coordinates: WktCoordinate[]): string | undefined {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return undefined;

  if (geometryType === "POINT") {
    const point = coordinates[coordinates.length - 1];
    return `POINT(${normalizeCoordinate(point.lng)} ${normalizeCoordinate(point.lat)})`;
  }

  if (geometryType === "LINESTRING") {
    if (coordinates.length < 2) return undefined;
    return `LINESTRING(${formatCoordinates(coordinates)})`;
  }

  if (coordinates.length < 3) return undefined;

  const polygonCoordinates = coordinates.slice();
  if (!sameCoordinate(polygonCoordinates[0], polygonCoordinates[polygonCoordinates.length - 1])) {
    polygonCoordinates.push(polygonCoordinates[0]);
  }

  return `POLYGON((${formatCoordinates(polygonCoordinates)}))`;
}
