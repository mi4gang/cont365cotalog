import { describe, expect, it } from "vitest";

import { normalizeDataLayerManualSyncScope } from "./dataLayerSync";

describe("dataLayerSync", () => {
  it("defaults manual Data Layer sync scope to catalog", () => {
    expect(normalizeDataLayerManualSyncScope(undefined)).toBe("catalog");
    expect(normalizeDataLayerManualSyncScope("")).toBe("catalog");
    expect(normalizeDataLayerManualSyncScope("weird")).toBe("catalog");
  });

  it("accepts explicit supported scopes", () => {
    expect(normalizeDataLayerManualSyncScope("catalog")).toBe("catalog");
    expect(normalizeDataLayerManualSyncScope("fast")).toBe("fast");
    expect(normalizeDataLayerManualSyncScope("full")).toBe("full");
  });
});
