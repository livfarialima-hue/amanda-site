import assert from "node:assert/strict";
import test from "node:test";
import {
  cameFromWebsite,
  getRecommendedSiteResource,
} from "./site-content.mjs";

test("offers only an approved procedure page to non-site conversations", () => {
  assert.deepEqual(
    getRecommendedSiteResource({
      procedure: "blefaroplastia",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: [],
    }),
    {
      title: "Blefaroplastia",
      url: "https://draamandaschroeder.com.br/blefaroplastia/",
    },
  );
});

test("does not offer the site to people who came from it", () => {
  for (const referenceCategory of [
    "site_cta",
    "site_page",
    "site_uncoded",
  ]) {
    assert.equal(cameFromWebsite(referenceCategory), true);
    assert.equal(
      getRecommendedSiteResource({
        procedure: "blefaroplastia",
        referenceCategory,
        recentConversation: [],
      }),
      null,
    );
  }
});

test("does not repeat a site link already shared in the conversation", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: "blefaroplastia",
      referenceCategory: "meta_uncoded",
      recentConversation: [
        {
          role: "assistant",
          text: "Veja https://draamandaschroeder.com.br/blefaroplastia/",
        },
      ],
    }),
    null,
  );
});

test("does not invent a page for an unknown procedure", () => {
  assert.equal(
    getRecommendedSiteResource({
      procedure: "procedimento_inexistente",
      referenceCategory: "whatsapp_uncoded",
      recentConversation: [],
    }),
    null,
  );
});
