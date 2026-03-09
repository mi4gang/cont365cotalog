import { describe, expect, it } from "vitest";
import {
  buildContainerIdentityIndex,
  registerContainerIdentity,
  resolveContainerIdentityMatch,
} from "./dataLayerIdentity";

describe("dataLayerIdentity", () => {
  it("matches by bitrixProductId when externalId was renamed", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "OLD123", bitrixProductId: 413 },
    ]);

    const match = resolveContainerIdentityMatch(index, {
      externalId: "NEW123",
      bitrixProductId: 413,
    });

    expect(match.strategy).toBe("bitrix");
    expect(match.existing?.id).toBe(1);
  });

  it("falls back to externalId when bitrixProductId is missing", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "BOX123", bitrixProductId: null },
    ]);

    const match = resolveContainerIdentityMatch(index, {
      externalId: "BOX123",
    });

    expect(match.strategy).toBe("external");
    expect(match.existing?.id).toBe(1);
  });

  it("uses legacy external-only matching when stable identity flag is disabled", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "BOX123", bitrixProductId: 100 },
      { id: 2, externalId: "BOX999", bitrixProductId: 999 },
    ]);

    const match = resolveContainerIdentityMatch(index, {
      externalId: "BOX123",
      bitrixProductId: 999,
      preferBitrixIdMatching: false,
    });

    expect(match.strategy).toBe("external");
    expect(match.existing?.id).toBe(1);
  });

  it("creates a new row under legacy matching when externalId was renamed", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "OLD123", bitrixProductId: 413 },
    ]);

    const match = resolveContainerIdentityMatch(index, {
      externalId: "NEW123",
      bitrixProductId: 413,
      preferBitrixIdMatching: false,
    });

    expect(match.strategy).toBe("create");
    expect(match.existing).toBeNull();
  });

  it("returns create when no identity matches", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "BOX123", bitrixProductId: 100 },
    ]);

    const match = resolveContainerIdentityMatch(index, {
      externalId: "BOX999",
      bitrixProductId: 999,
    });

    expect(match.strategy).toBe("create");
    expect(match.existing).toBeNull();
  });

  it("throws on conflicting externalId and bitrixProductId matches", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "BOX123", bitrixProductId: 100 },
      { id: 2, externalId: "BOX999", bitrixProductId: 999 },
    ]);

    expect(() =>
      resolveContainerIdentityMatch(index, {
        externalId: "BOX123",
        bitrixProductId: 999,
      }),
    ).toThrow(/Ambiguous catalog sync identity mapping/);
  });

  it("updates index after container rename", () => {
    const index = buildContainerIdentityIndex([
      { id: 1, externalId: "OLD123", bitrixProductId: 413 },
    ]);

    registerContainerIdentity(index, {
      id: 1,
      externalId: "NEW123",
      bitrixProductId: 413,
    });

    expect(resolveContainerIdentityMatch(index, { externalId: "OLD123", bitrixProductId: 413 }).existing?.id).toBe(1);
    expect(resolveContainerIdentityMatch(index, { externalId: "NEW123", bitrixProductId: 413 }).existing?.id).toBe(1);
    expect(resolveContainerIdentityMatch(index, { externalId: "OLD123" }).existing).toBeNull();
  });
});
