import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const conversionSource = readFileSync(
  new URL("./conversion-tracking.js", import.meta.url),
  "utf8",
);
const loaderSource = readFileSync(
  new URL("./tracking-loader.js", import.meta.url),
  "utf8",
);
const otoplastySource = readFileSync(
  new URL("./otoplasty-campaign.js", import.meta.url),
  "utf8",
);

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function loadAttribution({
  consent = "denied",
  links = [],
  procedure = "",
  readyState = "loading",
  search = "",
  setupSource = "",
} = {}) {
  const localStorage = storage({ amanda_tracking_consent: consent });
  const sessionStorage = storage();
  const document = {
    readyState,
    addEventListener() {},
    querySelectorAll() {
      return links;
    },
    body: null,
    documentElement: { dataset: { procedure } },
  };
  const window = {
    AMANDA_TRACKING_CONFIG: { debug: true },
    location: {
      search,
      href: `https://example.test/${search}`,
      pathname: "/",
    },
    MutationObserver: null,
  };
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    Object,
    Set,
    String,
    URL,
    URLSearchParams,
    document,
    localStorage,
    sessionStorage,
    window,
  };

  if (setupSource) vm.runInNewContext(setupSource, sandbox);
  vm.runInNewContext(conversionSource, sandbox);
  return { debug: window.AmandaAttributionDebug, links, localStorage, sessionStorage };
}

test("does not read click IDs before marketing consent", () => {
  const { debug } = loadAttribution({
    consent: "denied",
    search: "?utm_campaign=LF01&gclid=CjwKCAjwsrbTBhAvEiwA0Bpp4example",
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(debug.readAttributionFromUrl())),
    { utm_campaign: "LF01" },
  );
});

test("keeps exact click IDs after explicit consent", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4example";
  const { debug } = loadAttribution({
    consent: "granted",
    search: `?utm_campaign=LF01&gclid=${gclid}`,
  });

  assert.equal(debug.readAttributionFromUrl().gclid, gclid);
});

test("revocation removes stored click IDs but keeps neutral campaign codes", () => {
  const { debug, sessionStorage } = loadAttribution({ consent: "denied" });
  sessionStorage.setItem(
    "amanda_marketing_attribution",
    JSON.stringify({ utm_campaign: "LF01", gclid: "previous-click-id" }),
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(debug.loadStoredAttribution())),
    { utm_campaign: "LF01" },
  );
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem("amanda_marketing_attribution")),
    { utm_campaign: "LF01" },
  );
});

test("the consent loader clears WhatsApp attribution and announces denial", () => {
  assert.match(loaderSource, /'amanda_marketing_attribution'/);
  assert.match(loaderSource, /CustomEvent\('amanda:consent-denied'\)/);
});

test("otoplasty campaign keeps campaign, creative and child journey in the WhatsApp reference", () => {
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "hero" },
    href: "https://wa.me/5511961957144?text=Mensagem%20antiga.%20Ref.%20OT02",
    matches() {
      return true;
    },
    querySelector() {
      return null;
    },
    textContent: "Falar com a equipe",
  };

  loadAttribution({
    links: [link],
    procedure: "otoplastia-infantil",
    readyState: "complete",
    search: "?origem=M26O01W&utm_source=instagram&utm_medium=paid_social&utm_campaign=M26O01W&utm_content=DbHKuWfGP_N",
    setupSource: otoplastySource,
  });

  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /criança ou adolescente/);
  assert.match(message, /Ref\. M26O01W-DbHKuWfGP_N-OT02$/);
  assert.equal(link.dataset.originalReference, "OT02");
  assert.equal(link.textContent, "Entender a avaliação");
});
