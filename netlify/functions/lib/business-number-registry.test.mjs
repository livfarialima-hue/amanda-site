import assert from "node:assert/strict";
import test from "node:test";
import {
  getBusinessNumber,
  rememberBusinessNumber,
} from "./business-number-registry.mjs";

function fakeStore() {
  let value = null;

  return {
    getStoreImpl: () => ({
      setJSON: async (_key, nextValue) => {
        value = nextValue;
      },
      get: async () => value,
    }),
  };
}

test("business number is learned from a WhatsApp event", async () => {
  const store = fakeStore();
  const remembered = await rememberBusinessNumber(
    "+55 (11) 96195-7144",
    store,
  );
  const recovered = await getBusinessNumber({
    env: {},
    ...store,
  });

  assert.equal(remembered.status, "completed");
  assert.equal(recovered, "+5511961957144");
});

test("explicit sender configuration takes precedence", async () => {
  const store = fakeStore();
  await rememberBusinessNumber("+5511961957144", store);

  const recovered = await getBusinessNumber({
    env: {
      WHATSAPP_SENDER_NUMBER: "+5511999999999",
    },
    ...store,
  });

  assert.equal(recovered, "+5511999999999");
});
