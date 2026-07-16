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

  it("publishes catalog rows without photos when terminal is known", () => {
    expect(
      shouldPublishCatalogRow(true, [], false, { terminalLocation: "Шубино" }),
    ).toBe(true);
    expect(
      shouldPublishCatalogRow(true, [], true, { terminalLocation: "Шубино" }),
    ).toBe(true);
    expect(
      shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false, {
        terminalLocation: "Шубино",
      }),
    ).toBe(true);
    expect(
      shouldPublishCatalogRow(false, [], false, { terminalLocation: "Шубино" }),
    ).toBe(true);
  });

  it("does not publish regular catalog rows before terminal is known", () => {
    expect(
      shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false, {
        terminalLocation: "",
      }),
    ).toBe(false);
    expect(
      shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false, {
        terminalLocation: "Не указан",
      }),
    ).toBe(false);
    expect(
      shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false, {
        terminalLocation: "Голдконтейнер, сухой порт",
      }),
    ).toBe(true);
    expect(
      shouldPublishCatalogRow(true, ["https://example.com/1.jpg"], false, {
        terminalLocation: "",
        serial: true,
      }),
    ).toBe(true);
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
