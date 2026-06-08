import { describe, expect, it } from "vitest";

import {
  normalizeDataLayerManualSyncScope,
  photoUrlsMatchCatalogPayload,
  shouldPublishCatalogRow,
} from "./dataLayerSync";

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

  it("does not publish new photo-capable catalog rows without photos", () => {
    expect(shouldPublishCatalogRow(true, [], false)).toBe(false);
    expect(shouldPublishCatalogRow(true, [], true)).toBe(true);
    expect(shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false)).toBe(true);
    expect(shouldPublishCatalogRow(false, [], false)).toBe(true);
  });

  it("keeps unchanged photo payloads out of the write path", () => {
    expect(
      photoUrlsMatchCatalogPayload(
        [{ url: "https://example.com/1.jpg" }, { url: "https://example.com/2.jpg" }],
        ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      ),
    ).toBe(true);
    expect(
      photoUrlsMatchCatalogPayload(
        [{ url: "https://example.com/1.jpg" }, { url: "https://example.com/2.jpg" }],
        ["https://example.com/2.jpg", "https://example.com/1.jpg"],
      ),
    ).toBe(false);
  });
});
