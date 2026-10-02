import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hmacHex } from "./crypto";
import { paymongo } from "./paymongo";
import { xendit } from "./xendit";

const ORDER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.stubEnv("PAYMONGO_WEBHOOK_SECRET", "whsk_test");
  vi.stubEnv("XENDIT_CALLBACK_TOKEN", "cb_token");
});
afterEach(() => vi.unstubAllEnvs());

function paymongoEvent(live = false) {
  const body = JSON.stringify({
    data: {
      attributes: {
        type: "checkout_session.payment.paid",
        livemode: live,
        data: { id: "cs_1", attributes: { reference_number: ORDER, metadata: { orderId: ORDER } } },
      },
    },
  });
  const t = String(Math.floor(Date.now() / 1000));
  const sig = hmacHex("whsk_test", `${t}.${body}`);
  return { body, header: `t=${t},te=${live ? "" : sig},li=${live ? sig : ""}` };
}

describe("paymongo webhook", () => {
  it("accepts a correctly signed paid event", () => {
    const { body, header } = paymongoEvent();
    expect(paymongo.parseWebhook(body, new Headers({ "paymongo-signature": header }))).toEqual({ orderId: ORDER, ref: "cs_1" });
  });
  it("rejects a tampered body", () => {
    const { body, header } = paymongoEvent();
    expect(() => paymongo.parseWebhook(body.replace("cs_1", "cs_2"), new Headers({ "paymongo-signature": header }))).toThrow();
  });
  it("rejects a missing signature and a stale timestamp", () => {
    const { body } = paymongoEvent();
    expect(() => paymongo.parseWebhook(body, new Headers())).toThrow();
    const old = String(Math.floor(Date.now() / 1000) - 3600);
    const sig = hmacHex("whsk_test", `${old}.${body}`);
    expect(() => paymongo.parseWebhook(body, new Headers({ "paymongo-signature": `t=${old},te=${sig}` }))).toThrow();
  });
});

describe("xendit webhook", () => {
  const body = JSON.stringify({ id: "inv_1", external_id: ORDER, status: "PAID" });
  it("accepts the right callback token", () => {
    expect(xendit.parseWebhook(body, new Headers({ "x-callback-token": "cb_token" }))).toEqual({ orderId: ORDER, ref: "inv_1" });
  });
  it("rejects a wrong or missing token", () => {
    expect(() => xendit.parseWebhook(body, new Headers({ "x-callback-token": "nope" }))).toThrow();
    expect(() => xendit.parseWebhook(body, new Headers())).toThrow();
  });
  it("ignores events that aren't payments", () => {
    const pending = JSON.stringify({ id: "inv_1", external_id: ORDER, status: "PENDING" });
    expect(xendit.parseWebhook(pending, new Headers({ "x-callback-token": "cb_token" }))).toBeNull();
  });
});
