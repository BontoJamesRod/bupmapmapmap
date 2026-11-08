import { describe, expect, it } from "vitest";
import { endpointParam, href, parseEndpoint, parseHash } from "./url";

describe("URL routing (every screen is a shareable link)", () => {
  it("parses each screen", () => {
    expect(parseHash("#/")).toEqual({ name: "home" });
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/place/salceda-building")).toEqual({ name: "place", id: "salceda-building" });
    expect(parseHash("#/about")).toEqual({ name: "about" });
    expect(parseHash("#/qr/clinic")).toEqual({ name: "qr", id: "clinic" });
    expect(parseHash("#/route?to=clinic")).toEqual({ name: "route", from: null, to: "clinic" });
    expect(parseHash("#/route?from=canteen&to=clinic")).toEqual({
      name: "route", from: { kind: "place", id: "canteen" }, to: "clinic",
    });
  });

  it("round-trips links built by href", () => {
    expect(parseHash(href.place("nursing-court"))).toEqual({ name: "place", id: "nursing-court" });
    expect(parseHash(href.qr("cesd"))).toEqual({ name: "qr", id: "cesd" });
    const from = { kind: "point" as const, coord: [123.4851, 13.2959] as [number, number], label: "Your location" };
    const v = parseHash(href.route("gymnasium", from));
    expect(v.name).toBe("route");
    if (v.name === "route") {
      expect(v.to).toBe("gymnasium");
      expect(v.from?.kind).toBe("point");
      if (v.from?.kind === "point") {
        expect(v.from.coord[0]).toBeCloseTo(123.4851, 5);
        expect(v.from.coord[1]).toBeCloseTo(13.2959, 5);
      }
    }
  });

  it("encodes GPS start points as @lat,lng with 6 decimals", () => {
    expect(endpointParam({ kind: "point", coord: [123.48512345, 13.2959], label: "x" })).toBe("@13.295900,123.485123");
    expect(parseEndpoint("@13.2959,123.4851")).toMatchObject({ kind: "point", coord: [123.4851, 13.2959] });
    expect(parseEndpoint("registrar")).toEqual({ kind: "place", id: "registrar" });
    expect(parseEndpoint(null)).toBeNull();
  });

  it("falls back to home for unknown or malformed links", () => {
    expect(parseHash("#/nope")).toEqual({ name: "home" });
    expect(parseHash("#/route")).toEqual({ name: "home" });
    expect(parseHash("#/place/")).toEqual({ name: "home" });
  });
});
