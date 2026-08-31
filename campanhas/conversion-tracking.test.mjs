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
  journeyEnabled = false,
  links = [],
  localInitial = {},
  pathname = "/",
  procedure = "",
  randomSeed = 3,
  readyState = "loading",
  runLoaderFirst = false,
  search = "",
  sessionInitial = {},
  setupSource = "",
} = {}) {
  const localStorage = storage({
    ...localInitial,
    amanda_tracking_consent: consent,
  });
  const sessionStorage = storage(sessionInitial);
  const documentListeners = {};
  const document = {
    cookie: "",
    title: "Test page",
    readyState,
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    },
    dispatchEvent() {},
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      return /wa\.me|whatsapp/i.test(String(selector || "")) ? links : [];
    },
    getElementById() { return null; },
    createElement() { return { setAttribute() {}, style: {} }; },
    head: { appendChild() {} },
    body: null,
    documentElement: { dataset: { procedure } },
  };
  const window = {
    AMANDA_TRACKING_CONFIG: {
      attributionJourneyEnabled: journeyEnabled,
      debug: true,
    },
    location: {
      search,
      href: `https://example.test/${search}`,
      hostname: "example.test",
      pathname,
    },
    MutationObserver: null,
  };
  if (journeyEnabled) {
    let randomCalls = 0;
    window.__beaconCalls = [];
    window.crypto = {
      getRandomValues(values) {
        for (let index = 0; index < values.length; index += 1) {
          values[index] = (randomSeed + randomCalls * 29 + index * 17) % 256;
        }
        randomCalls += 1;
        return values;
      },
    };
    window.navigator = {
      sendBeacon(url, body) {
        window.__beaconCalls.push({ url, body });
        return true;
      },
    };
  }
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
    Uint8Array,
    CustomEvent: class CustomEvent {
      constructor(type) { this.type = type; }
    },
    document,
    localStorage,
    sessionStorage,
    window,
  };

  if (runLoaderFirst) vm.runInNewContext(loaderSource, sandbox);
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
  assert.match(
    message,
    /^Olá! Tenho interesse em lifting facial com a Dra\. Amanda e gostaria de entender melhor como funciona a avaliação\./,
  );
  assert.match(message, /Ref\. G26ADS-lifting-facial/);
  assert.match(message, new RegExp(`GCLID: ${gclid}$`));
  assert.equal(link.dataset.templateId, "procedure_evaluation_v1");
});

test("keeps the lifting price-range intent while generic CTAs stay neutral", () => {
  const rangeLink = {
    addEventListener() {},
    dataset: {
      ctaLocation: "price_range_reference",
      prefillIntent: "price_range_reference",
      procedure: "lifting-facial-preco",
    },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.%0A%0ARefer%C3%AAncia%3A%20pre%C3%A7o%20de%20lifting%20facial",
    matches() {
      return true;
    },
    textContent: "Conversar sobre uma faixa geral",
  };
  const genericLink = {
    addEventListener() {},
    dataset: { ctaLocation: "footer", procedure: "lifting-facial-preco" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.%0A%0ARefer%C3%AAncia%3A%20pre%C3%A7o%20de%20lifting%20facial",
    matches() {
      return true;
    },
    textContent: "Conversar com a equipe",
  };

  loadAttribution({
    consent: "denied",
    links: [rangeLink, genericLink],
    readyState: "complete",
  });

  const rangeMessage = new URL(rangeLink.href).searchParams.get("text");
  const genericMessage = new URL(genericLink.href).searchParams.get("text");
  assert.match(
    rangeMessage,
    /^Olá! Li sobre o valor do lifting facial e gostaria de conversar sobre uma faixa geral de valores como ponto de partida\./,
  );
  assert.match(rangeMessage, /Ref\. SITE-lifting-facial-preco$/);
  assert.equal(rangeLink.dataset.templateId, "procedure_evaluation_v1");
  assert.match(
    genericMessage,
    /^Olá! Tenho interesse em lifting facial com a Dra\. Amanda e gostaria de entender melhor como funciona a avaliação\./,
  );
  assert.equal(genericLink.dataset.templateId, "procedure_evaluation_v1");
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
  assert.deepEqual(
    JSON.parse(JSON.stringify(window.__measurementCalls[0][2])),
    {
      event_category: "engagement",
      contact_channel: "whatsapp",
      measurement_state: "consented",
      transport_type: "beacon",
      send_to: "G-TEST",
    },
  );
  for (const forbidden of [
    "event_label",
    "page_type",
    "content_group",
    "cta_location",
    "cta_text",
    "page_path",
  ]) {
    assert.equal(Object.hasOwn(window.__measurementCalls[0][2], forbidden), false);
  }
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
  assert.match(
    message,
    /^Olá! Tenho interesse em avaliação facial com a Dra\. Amanda e gostaria de entender melhor como funciona a avaliação\./,
  );
  assert.match(message, /Ref\. SITE-avaliacao-facial$/);
  assert.equal(link.dataset.templateId, "procedure_evaluation_v1");
});

test("does not infer direct traffic from an absent referrer", () => {
  const { debug } = loadAttribution({
    consent: "denied",
    journeyEnabled: true,
    pathname: "/avaliacao-facial/",
    readyState: "complete",
  });
  const state = debug.updateJourneyFromCurrentPage();
  assert.equal(state.first_touch.origin, "Desconhecida");
  assert.equal(state.first_touch.channel, "unknown");
  assert.equal(state.first_touch.referrer_type, "missing");
  const envelope = debug.journeyEnvelopeForLink({
    dataset: { ctaLocation: "hero" },
  });
  assert.equal(envelope.conversion_path, "unknown");
  assert.equal(envelope.confidence, "unknown");
  assert.equal(envelope.fallback_reason, "origin_unknown");
});

test("M26F02S survives the site journey without consent or duplicate prefixes", () => {
  const firstPage = loadAttribution({
    consent: "denied",
    readyState: "complete",
    search: "?origem=M26F02S&utm_source=meta&utm_medium=paid_social&utm_campaign=M26F02S",
  });
  const stored = firstPage.sessionStorage.getItem(
    "amanda_marketing_attribution",
  );
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "hero", procedure: "avaliacao-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1%2C%20vim%20pelo%20site.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };
  const secondPage = loadAttribution({
    consent: "denied",
    links: [link],
    readyState: "complete",
    sessionInitial: { amanda_marketing_attribution: stored },
  });

  secondPage.debug.updateAllWhatsAppLinks();
  const message = new URL(link.href).searchParams.get("text");
  assert.match(message, /Ref\. M26F02S-avaliacao-facial$/);
  assert.equal((message.match(/M26F02S/g) || []).length, 1);
});

test("M26C02S carries the cervical campaign, creative, landing and CTA to WhatsApp", () => {
  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "video", procedure: "lifting-cervical" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1%2C%20quero%20saber%20mais.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };
  const { debug } = loadAttribution({
    consent: "denied",
    journeyEnabled: true,
    links: [link],
    pathname: "/lifting-cervical/",
    readyState: "complete",
    search:
      "?origem=M26C02S&utm_source=meta&utm_medium=paid_social" +
      "&utm_campaign=M26C02S&utm_content=C07H01" +
      "&meta_campaign_id=120000000000000100" +
      "&meta_adset_id=120000000000000101" +
      "&meta_ad_id=120000000000000102",
  });

  const envelope = debug.journeyEnvelopeForLink(link);
  const message = new URL(link.href).searchParams.get("text");
  assert.match(
    message,
    /^Olá! Tenho interesse em cervicoplastia \(lifting cervical\) com a Dra\. Amanda e gostaria de entender melhor como funciona a avaliação\./,
  );
  assert.match(message, /Ref\. M26C02S-C07H01-lifting-cervical/);
  assert.match(message, /JID: J1_[A-Za-z0-9_-]{22}/);
  assert.equal(link.textContent, "Conversar sobre a avaliação");
  assert.equal(envelope.first_touch.origin, "Meta Ads");
  assert.equal(envelope.first_touch.campaign_code, "M26C02S");
  assert.equal(envelope.first_touch.creative_code, "C07H01");
  assert.equal(envelope.first_touch.meta_campaign_id, "120000000000000100");
  assert.equal(envelope.first_touch.meta_adset_id, "120000000000000101");
  assert.equal(envelope.first_touch.meta_ad_id, "120000000000000102");
  assert.equal(envelope.first_touch.page_path, "/lifting-cervical/");
  assert.equal(envelope.cta.page_path, "/lifting-cervical/");
  assert.equal(envelope.cta.location, "video");
  assert.equal(envelope.cta.template_id, "procedure_evaluation_v1");
  assert.equal(envelope.conversion_path, "meta_site_whatsapp");
  assert.equal(envelope.confidence, "observed");
  assert.equal(envelope.fallback_reason, "");
});

test("creates a PII-free journey envelope for Meta site and registers it on click", () => {
  const listeners = {};
  const link = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    closest() {
      return null;
    },
    dataset: { ctaLocation: "hero", procedure: "avaliacao-facial" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1%2C%20vim%20pelo%20site.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };
  const loaded = loadAttribution({
    consent: "denied",
    journeyEnabled: true,
    links: [link],
    pathname: "/avaliacao-facial/",
    readyState: "complete",
    search:
      "?origem=M26F02S&utm_source=meta&utm_medium=paid_social" +
      "&utm_campaign=M26F02S&utm_content=C01H01" +
      "&meta_campaign_id=120000000000000000" +
      "&meta_adset_id=120000000000000001" +
      "&meta_ad_id=120000000000000002",
  });

  const message = new URL(link.href).searchParams.get("text");
  const preparedToken = message.match(/JID: (J1_[A-Za-z0-9_-]{22})/)[1];
  assert.match(message, /Ref\. M26F02S-C01H01-avaliacao-facial/);
  listeners.click();
  assert.equal(loaded.window.__beaconCalls.length, 1);
  assert.equal(
    loaded.window.__beaconCalls[0].url,
    "/.netlify/functions/attribution-journey",
  );
  const envelope = JSON.parse(loaded.window.__beaconCalls[0].body);
  const clickedMessage = new URL(link.href).searchParams.get("text");
  const clickedToken = clickedMessage.match(/JID: (J1_[A-Za-z0-9_-]{22})/)[1];
  assert.notEqual(clickedToken, preparedToken);
  assert.equal(envelope.token, clickedToken);
  assert.equal(envelope.first_touch.origin, "Meta Ads");
  assert.equal(envelope.first_touch.campaign_code, "M26F02S");
  assert.equal(envelope.first_touch.creative_code, "C01H01");
  assert.equal(envelope.first_touch.meta_adset_id, "120000000000000001");
  assert.equal(envelope.cta.page_path, "/avaliacao-facial/");
  assert.equal(envelope.cta.location, "hero");
  assert.equal(envelope.conversion_path, "meta_site_whatsapp");
  assert.equal(envelope.confidence, "observed");
  assert.equal(/5511961957144|OlÃ¡|mensagem/i.test(loaded.window.__beaconCalls[0].body), false);

  listeners.click();
  assert.equal(loaded.window.__beaconCalls.length, 2);
  const secondEnvelope = JSON.parse(loaded.window.__beaconCalls[1].body);
  const secondMessage = new URL(link.href).searchParams.get("text");
  const secondToken = secondMessage.match(/JID: (J1_[A-Za-z0-9_-]{22})/)[1];
  assert.notEqual(secondToken, clickedToken);
  assert.equal(secondEnvelope.token, secondToken);
});

test("enabled journey transports Google click IDs without exposing them in WhatsApp text", () => {
  const listeners = {};
  const link = {
    addEventListener(type, listener) { listeners[type] = listener; },
    closest() { return null; },
    dataset: { ctaLocation: "hero", procedure: "blefaroplastia" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.",
    matches() { return true; },
    textContent: "Falar com a equipe",
  };
  const gclid = "CjwKCAjwsrbTBhAvEiwA0Bpp4journey";
  const loaded = loadAttribution({
    consent: "denied",
    journeyEnabled: true,
    links: [link],
    pathname: "/blefaroplastia/",
    readyState: "complete",
    search: `?utm_source=google&utm_medium=cpc&utm_campaign=G26BLEF&gclid=${gclid}`,
  });
  listeners.click();
  const message = new URL(link.href).searchParams.get("text");
  const envelope = JSON.parse(loaded.window.__beaconCalls[0].body);
  assert.equal(message.includes(gclid), false);
  assert.doesNotMatch(message, /\bGCLID:/);
  assert.match(message, /JID: J1_[A-Za-z0-9_-]{22}/);
  assert.equal(envelope.click_ids.gclid, gclid);
});

test("preserves first Meta touch and classifies a consented later return", () => {
  const firstPage = loadAttribution({
    consent: "granted",
    journeyEnabled: true,
    pathname: "/avaliacao-facial/",
    randomSeed: 5,
    readyState: "complete",
    search:
      "?origem=M26F02S&utm_source=meta&utm_medium=paid_social" +
      "&utm_campaign=M26F02S&utm_content=C01H01",
  });
  const persisted = firstPage.localStorage.getItem(
    "amanda_attribution_journey_v1",
  );
  assert.ok(persisted);

  const link = {
    addEventListener() {},
    dataset: { ctaLocation: "final", procedure: "blefaroplastia" },
    href: "https://wa.me/5511961957144?text=Ol%C3%A1.",
    matches() {
      return true;
    },
    textContent: "Falar com a equipe",
  };
  const returnPage = loadAttribution({
    consent: "granted",
    journeyEnabled: true,
    links: [link],
    localInitial: { amanda_attribution_journey_v1: persisted },
    pathname: "/blefaroplastia/",
    randomSeed: 71,
    readyState: "complete",
    runLoaderFirst: true,
  });
  const envelope = returnPage.debug.journeyEnvelopeForLink(link);
  assert.equal(envelope.first_touch.origin, "Meta Ads");
  assert.equal(envelope.first_touch.page_path, "/avaliacao-facial/");
  assert.equal(envelope.last_touch.channel, "unknown");
  assert.equal(envelope.last_touch.referrer_type, "missing");
  assert.equal(envelope.last_non_direct_touch.campaign_code, "M26F02S");
  assert.equal(envelope.cta.page_path, "/blefaroplastia/");
  assert.equal(envelope.conversion_path, "meta_site_return_whatsapp");
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
      amanda_attribution_journey_v1: JSON.stringify({ version: 1, persistent: true }),
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
      amanda_attribution_journey_v1: JSON.stringify({ version: 1, operational: true }),
    },
  });

  manager.window.AmandaConsent.revoke();

  assert.equal(manager.localStorage.getItem("amanda_click_id_gclid"), null);
  assert.equal(manager.localStorage.getItem("amanda_marketing_attribution"), null);
  assert.equal(manager.localStorage.getItem("amanda_first_touch"), null);
  assert.equal(manager.localStorage.getItem("amanda_attribution_journey_v1"), null);
  assert.ok(manager.sessionStorage.getItem("amanda_click_id_gclid"));
  assert.deepEqual(
    JSON.parse(manager.sessionStorage.getItem("amanda_marketing_attribution")),
    { gclid },
  );
  assert.equal(manager.sessionStorage.getItem("amanda_first_touch"), null);
  assert.ok(manager.sessionStorage.getItem("amanda_attribution_journey_v1"));
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
