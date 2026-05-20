import { describe, expect, it } from "vitest";

import {
  payloadContainsExternalId,
  shouldRefreshReservedDealPayload,
} from "./routers/reservations";

const activePayload = {
  active: true,
  dealId: 2969,
  containers: [
    {
      id: "679",
      containerNumber: "XHCU2649967",
    },
  ],
};

describe("reservations router helpers", () => {
  it("detects whether cached reservation payload contains a container", () => {
    expect(payloadContainsExternalId(activePayload, "XHCU2649967")).toBe(true);
    expect(payloadContainsExternalId(activePayload, "MCCU1122605")).toBe(false);
  });

  it("refreshes inactive, forced, or incomplete cached reservation payloads", () => {
    expect(shouldRefreshReservedDealPayload(activePayload)).toBe(false);
    expect(
      shouldRefreshReservedDealPayload(activePayload, { forceRefresh: true })
    ).toBe(true);
    expect(
      shouldRefreshReservedDealPayload(activePayload, {
        requireExternalId: "XHCU2649967",
      })
    ).toBe(false);
    expect(
      shouldRefreshReservedDealPayload(activePayload, {
        requireExternalId: "MCCU1122605",
      })
    ).toBe(true);
    expect(
      shouldRefreshReservedDealPayload({ ...activePayload, active: false })
    ).toBe(true);
  });
});
