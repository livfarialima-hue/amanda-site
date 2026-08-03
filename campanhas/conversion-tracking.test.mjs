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

function loadAttribution({ consent = "denied", search = "" } = {}) {
  const localStorage = storage({ amanda_tracking_consent: consent });
  const sessionStorage = storage();
  const document = {
    readyState: "loading",
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    body: null,
    documentElement: { dataset: {} },
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

  vm.runInNewContext(conversionSource, sandbox);
  return { debug: window.AmandaAttributionDebug, localStorage, sessionStorage };
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
