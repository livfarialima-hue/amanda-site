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
  sessionInitial = {},
  setupSource = "",
} = {}) {
  const localStorage = storage({ amanda_tracking_consent: consent });
  const sessionStorage = storage(sessionInitial);
  const documentListeners = {};
  const document = {
    readyState,
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    },
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
  return {
    debug: window.AmandaAttributionDebug,
    documentListeners,
    links,
    localStorage,
    sessionStorage,
    window,
  };
}

test("measures the bridge from a price guide to the main procedure page only after consent", () => {
  const link = {
    dataset: {
      ctaLocation: "price_explanation",
      trackId: "procedure_overview",
    },
    closest(selector) {
      return selector === 'a[data-track="content-depth"]' ? this : null;
    },
  };
  const measured = loadAttribution({
    consent: "granted",
    links: [],
    readyState: "complete",
    setupSource: `
      window.AMANDA_TRACKING_CONFIG.ga4Id = "G-TEST";
      window.__measurementCalls = [];
      window.gtag = function () { window.__measurementCalls.push(Array.from(arguments)); };
    `,
  });

  measured.documentListeners.click({ target: link });

  assert.equal(measured.window.__measurementCalls.length, 1);
  assert.equal(measured.window.__measurementCalls[0][1], "content_depth_click");
  assert.equal(measured.window.__measurementCalls[0][2].link_role, "procedure_overview");

  const denied = loadAttribution({
    consent: "denied",
    links: [],
    readyState: "complete",
    setupSource: `
      window.AMANDA_TRACKING_CONFIG.ga4Id = "G-TEST";
      window.__measurementCalls = [];
      window.gtag = function () { window.__measurementCalls.push(Array.from(arguments)); };
    `,
  });
  denied.documentListeners.click({ target: link });
  assert.equal(denied.window.__measurementCalls.length, 0);
});

function loadConsentManager({ local = {}, session = {} } = {}) {
  const localStorage = storage(local);
  const sessionStorage = storage(session);
  const dispatched = [];
  const document = {
    cookie: "",
    addEventListener() {},
    dispatchEvent(event) {
      dispatched.push(event.type);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const window = {
    AMANDA_TRACKING_CONFIG: {},
    location: { hostname: "draamandaschroeder.com.br" },
  };
  vm.runInNewContext(loaderSource, {
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    Date,
    JSON,
    Object,
    document,
    localStorage,
    sessionStorage,
    window,
  });
  return { dispatched, localStorage, sessionStorage, window };
}

test("reads exact Google click IDs without marketing consent", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4example";
  const { debug } = loadAttribution({
    consent: "denied",
    search: `?utm_campaign=LF01&gclid=${gclid}`,
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(debug.readAttributionFromUrl())),
    { utm_campaign: "LF01", gclid },
  );
});

test("adds the exact click ID to WhatsApp without consent", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4example";
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "hero", procedure: "lifting-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.%0A%0ARefer%C3%AAncia%3A%20Lifting%20facial",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };

  const { debug } = loadAttribution({
    consent: "denied",
    links: [link],
    readyState: "complete",
    search: `?gclid=${gclid}`,
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(debug.readAttributionFromUrl())),
    { gclid, origem: "G26ADS" },
  );
  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /Ref\. G26ADS-lifting-facial/);
  assert.match(message, new RegExp(`GCLID: ${gclid}$`));
});

test("keeps the Google click ID across pages in the same unconsented session", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4session";
  const firstPage = loadAttribution({
    consent: "denied",
    readyState: "complete",
    search: `?gclid=${gclid}`,
  });
  const stored = firstPage.sessionStorage.getItem(
    "amanda_marketing_attribution",
  );

  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "final", procedure: "blefaroplastia" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.",
    matches() {
      return true;
    },
    textContent: "Ver horários",
  };
  loadAttribution({
    consent: "denied",
    links: [link],
    readyState: "complete",
    sessionInitial: { amanda_marketing_attribution: stored },
  });

  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /Ref\. G26ADS-blefaroplastia/);
  assert.match(message, new RegExp(`GCLID: ${gclid}$`));
});

test("treats GBRAID and WBRAID as consent-independent Google click IDs", () => {
  for (const param of ["gbraid", "wbraid"]) {
    const value = `0AAAAA_${param}_example`;
    const { debug } = loadAttribution({
      consent: "denied",
      search: `?${param}=${value}`,
    });
    assert.equal(debug.readAttributionFromUrl()[param], value);
  }
});

test("does not load or send any external measurement on an unconsented click", () => {
  const listeners = {};
  const link = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    closest() {
      return null;
    },
    dataset: { ctaLocation: "hero", procedure: "lifting-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };
  const { window } = loadAttribution({
    consent: "denied",
    links: [link],
    readyState: "complete",
    search: "?gclid=CjwKCAjwsrbTBhAvEiwA0Bpp4nomeasure",
    setupSource: `
      window.__measurementCalls = [];
      window.gtag = function () { window.__measurementCalls.push(Array.from(arguments)); };
      window.AmandaConsent = {
        prepareMinimalWhatsAppMeasurement: function () { window.__minimalPrepared = true; }
      };
    `,
  });

  listeners.click();

  assert.equal(window.__measurementCalls.length, 0);
  assert.equal(window.__minimalPrepared, undefined);
  assert.equal(window.__amandaLastMeasurementEvent.mode, "attribution_only");
});

test("sends Google measurement after consent is granted", () => {
  const listeners = {};
  const link = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    closest() {
      return null;
    },
    dataset: { ctaLocation: "final", procedure: "blefaroplastia" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.",
    matches() {
      return true;
    },
    textContent: "Ver horários",
  };
  const { window } = loadAttribution({
    consent: "granted",
    links: [link],
    readyState: "complete",
    setupSource: `
      window.AMANDA_TRACKING_CONFIG.ga4Id = "G-TEST";
      window.AMANDA_TRACKING_CONFIG.googleAdsId = "AW-TEST";
      window.AMANDA_TRACKING_CONFIG.googleAdsConversionLabel = "LABEL";
      window.__measurementCalls = [];
      window.gtag = function () { window.__measurementCalls.push(Array.from(arguments)); };
    `,
  });

  listeners.click();

  assert.equal(window.__measurementCalls.length, 2);
  assert.equal(window.__measurementCalls[0][1], "whatsapp_click");
  assert.equal(window.__measurementCalls[1][1], "conversion");
  assert.equal(window.__amandaLastMeasurementEvent.mode, "consented");
});

test("every organic site CTA gets a stable SITE reference", () => {
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "hero", procedure: "avaliacao-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1%2C%20vim%20pelo%20site.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };

  loadAttribution({
    consent: "denied",
    links: [link],
    readyState: "complete",
  });

  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /Ref\. SITE-avaliacao-facial$/);
});

test("keeps exact click IDs after explicit consent", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4example";
  const { debug } = loadAttribution({
    consent: "granted",
    search: `?utm_campaign=LF01&gclid=${gclid}`,
  });

  assert.equal(debug.readAttributionFromUrl().gclid, gclid);
});

test("continues adding the exact click ID after explicit consent", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4example";
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "hero", procedure: "lifting-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.%0A%0ARefer%C3%AAncia%3A%20Lifting%20facial",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };

  loadAttribution({
    consent: "granted",
    links: [link],
    readyState: "complete",
    search: `?gclid=${gclid}`,
  });

  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /Ref\. G26ADS-lifting-facial/);
  assert.match(message, new RegExp(`GCLID: ${gclid}$`));
});

test("stored click IDs remain available in the session without consent", () => {
  const gclid = "previous-click-id";
  const { debug, sessionStorage } = loadAttribution({
    consent: "denied",
    sessionInitial: {
      amanda_marketing_attribution: JSON.stringify({
        utm_campaign: "LF01",
        gclid,
      }),
    },
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(debug.loadStoredAttribution())),
    { utm_campaign: "LF01", gclid },
  );
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem("amanda_marketing_attribution")),
    { utm_campaign: "LF01", gclid },
  );
});

test("the consent loader preserves session click IDs while announcing denial", () => {
  assert.match(loaderSource, /'amanda_marketing_attribution'/);
  assert.match(loaderSource, /consentIndependentClickIdKeys/);
  assert.match(loaderSource, /sessionStorage\.setItem\(marketingAttributionStorageKey/);
  assert.match(loaderSource, /CustomEvent\('amanda:consent-denied'\)/);
});

test("revoking consent clears optional attribution but preserves session click IDs", () => {
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4revoke";
  const manager = loadConsentManager({
    local: {
      amanda_tracking_consent: "granted",
      amanda_click_id_gclid: "legacy-persistent-id",
      amanda_marketing_attribution: JSON.stringify({ gclid }),
      amanda_first_touch: "optional",
    },
    session: {
      amanda_click_id_gclid: JSON.stringify({
        value: gclid,
        expiresAt: Date.now() + 60_000,
      }),
      amanda_marketing_attribution: JSON.stringify({
        utm_campaign: "LF01",
        gclid,
      }),
      amanda_first_touch: "optional",
    },
  });

  manager.window.AmandaConsent.revoke();

  assert.equal(manager.localStorage.getItem("amanda_click_id_gclid"), null);
  assert.equal(manager.localStorage.getItem("amanda_marketing_attribution"), null);
  assert.equal(manager.localStorage.getItem("amanda_first_touch"), null);
  assert.ok(manager.sessionStorage.getItem("amanda_click_id_gclid"));
  assert.deepEqual(
    JSON.parse(manager.sessionStorage.getItem("amanda_marketing_attribution")),
    { gclid },
  );
  assert.equal(manager.sessionStorage.getItem("amanda_first_touch"), null);
  assert.ok(manager.dispatched.includes("amanda:consent-denied"));
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
