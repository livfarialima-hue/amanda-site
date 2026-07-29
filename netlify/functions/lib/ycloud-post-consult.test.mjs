import assert from "node:assert/strict";
import test from "node:test";
import {
  isPostConsultConfigured,
  sendYCloudPostConsult,
} from "./ycloud-post-consult.mjs";

test("post-consult follow-up requires API key and sender", () => {
  assert.equal(isPostConsultConfigured({}), false);
  assert.equal(
    isPostConsultConfigured({
      YCLOUD_API_KEY: "key",
      WHATSAPP_SENDER_NUMBER: "+5511961957144",
    }),
    true,
  );
});

test("uses one utility-template variable for the professional", async () => {
  const calls = [];
  const result = await sendYCloudPostConsult(
    {
      appointmentId: "consulta-42",
      patientPhone: "+5511999999999",
      professional: "Dra. Amanda",
    },
    {
      env: {
        YCLOUD_API_KEY: "key",
        WHATSAPP_SENDER_NUMBER: "+5511961957144",
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response("{}", { status: 200 });
      },
    },
  );

  assert.equal(result.status, "completed");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.type, "template");
  assert.equal(
    body.template.name,
    "pos_consulta_cuidado_liv_v1",
  );
  assert.deepEqual(
    body.template.components[0].parameters,
    [{ type: "text", text: "Dra. Amanda" }],
  );
});

test("preserves provider status in the error code", async () => {
  const result = await sendYCloudPostConsult(
    {
      appointmentId: "consulta-42",
      patientPhone: "+5511999999999",
      professional: "Dra. Amanda",
    },
    {
      env: {
        YCLOUD_API_KEY: "key",
        WHATSAPP_SENDER_NUMBER: "+5511961957144",
      },
      fetchImpl: async () =>
        new Response("rejected", { status: 400 }),
    },
  );

  assert.equal(result.errorCode, "http_400");
});
