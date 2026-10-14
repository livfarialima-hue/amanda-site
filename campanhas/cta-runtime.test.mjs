import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const label = "Conversar sobre a consulta";
const accessibleLabel = `${label} pelo WhatsApp`;
const normalizeSelector = (value) => value.replaceAll("'", '"');

// This DOM fixture executes the complete production scripts, including their
// DOMContentLoaded callbacks and deferred installs, without browser dependencies.
function pageFixture({ procedure = "mastopexia", pageType = "procedure", pathname = `/${procedure}/`, generatedFinal = false } = {}) {
  const callbacks = [];
  const timers = [];
  const selectors = new Map();
  const links = [];
  const inserted = [];

  function element(tag = "div", className = "") {
    const attributes = new Map();
    const classes = new Set(className.split(" ").filter(Boolean));
    const node = {
      tagName: tag.toUpperCase(), className, dataset: {}, children: [], textContent: "",
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, state) { if (state) classes.add(name); else classes.delete(name); },
      },
      addEventListener() {},
      setAttribute(name, value) {
        attributes.set(name, String(value));
        if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
        if (name === "href") this.href = String(value);
      },
      getAttribute(name) { return attributes.get(name) ?? null; },
      removeAttribute(name) { attributes.delete(name); },
      append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); },
      appendChild(child) { this.append(child); return child; },
      insertAdjacentElement(position, child) { inserted.push(child); if (this.parent) this.parent.append(child); },
      querySelector(query) {
        const key = normalizeSelector(query);
        if (this.queries?.has(key)) return this.queries.get(key);
        for (const child of this.children) {
          if (child.matches(key)) return child;
          const nested = child.querySelector(key);
          if (nested) return nested;
        }
        return null;
      },
      querySelectorAll() { return []; },
      matches(query) {
        return query === this.tagName.toLowerCase() || query === ".btn" && this.className.split(" ").includes("btn") ||
          query === ".nav-cta" && this === nav || query === ".whatsapp-float" && this === floating;
      },
      closest(query) {
        if (query === "header" && this === nav) return this;
        if (query === ".hero" && this === hero) return this;
        if ((query === ".cta" || query === "main > .cta") && this === final) return finalSection;
        if (query === ".article-aside-card" && this === aside) return asideCard;
        return null;
      },
      cloneNode() {
        const clone = element(tag, this.className);
        clone.dataset = { ...this.dataset };
        clone.href = this.href;
        attributes.forEach((value, name) => clone.setAttribute(name, value));
        links.push(clone);
        return clone;
      },
    };
    Object.defineProperty(node, "innerHTML", {
      set(html) {
        this.html = html;
        // Secondary conversion creates its CTA through innerHTML. Retain the
        // resulting element's attributes so the test checks the generated link.
        for (const match of html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)) {
          const anchor = element("a", "btn");
          for (const attribute of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) anchor.setAttribute(attribute[1], attribute[2]);
          anchor.textContent = match[2];
          this.append(anchor);
          links.push(anchor);
        }
      },
      get() { return this.html || ""; },
    });
    return node;
  }

  function cta(location, className) {
    const node = element("a", className);
    node.dataset = { procedure, track: "whatsapp", ctaLocation: location, originalReference: `${procedure}-reference`, templateId: "procedure_evaluation_v1" };
    node.href = `https://wa.me/5511961957144?text=${encodeURIComponent(`Olá! Tenho interesse em ${procedure}.\n\nRef. G26TEST-${location}`)}`;
    node.textContent = label;
    links.push(node);
    return node;
  }

  const nav = cta("header", "btn nav-cta");
  const hero = cta("hero", "btn");
  const final = cta("final", "btn");
  const floating = cta("floating", "whatsapp-float");
  const aside = cta("article_context", "btn");
  const finalSection = element("section", "cta");
  finalSection.append(final);
  const asideCard = element("aside", "article-aside-card");
  asideCard.append(aside);
  const main = element("main");
  if (!generatedFinal) main.append(finalSection);
  const root = element("html");
  root.dataset = { procedure, pageType, contentGroup: "mama" };
  root.setAttribute("data-procedure", procedure);
  const mainQueries = new Map([
    ['.hero-actions a[data-track="whatsapp"]', hero],
    ['.cta a[data-track="whatsapp"]', final],
    ["#auxiliary-team", element()],
  ]);
  main.queries = mainQueries;
  for (const query of ['.nav-cta[data-track="whatsapp"]', ".nav-cta"]) selectors.set(query, nav);
  for (const query of ['.hero-actions [data-track="whatsapp"]', '.hero-actions a[data-track="whatsapp"]', '.article-hero [data-track="whatsapp"], .hero[data-section="hero"] [data-track="whatsapp"]']) selectors.set(query, hero);
  for (const query of ['.whatsapp-float[data-track="whatsapp"]', ".whatsapp-float"]) selectors.set(query, floating);
  for (const query of ['.cta [data-track="whatsapp"]', '.cta a[data-track="whatsapp"]', '.cta a.btn[data-track="whatsapp"]']) selectors.set(query, final);
  selectors.set("main", main);
  selectors.set(".cta", finalSection);
  if (!generatedFinal) selectors.set("main > .cta", finalSection);
  selectors.set(".article-aside-card", asideCard);

  const document = {
    documentElement: root, body: element("body"), readyState: "loading", referrer: "",
    querySelector(query) { return selectors.get(normalizeSelector(query)) || null; },
    querySelectorAll(query) {
      const key = normalizeSelector(query);
      if (key === 'a[data-track="whatsapp"]') return links;
      if (key === `[data-procedure="${procedure}"][data-track="whatsapp"]`) return [nav, final];
      return [];
    },
    getElementById() { return null; },
    createElement: element,
    addEventListener(name, callback) { if (name === "DOMContentLoaded") callbacks.push(callback); },
  };
  const location = new URL(pathname, "https://example.test");
  const window = {
    location, scrollY: 0, addEventListener() {},
    setTimeout(callback) { timers.push(callback); }, clearTimeout() {},
    matchMedia() { return { matches: false, addEventListener() {} }; },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  };
  const sandbox = { document, window, location, URL, URLSearchParams, console,
    MutationObserver: class { observe() {} }, history: { replaceState() {} } };
  vm.createContext(sandbox);
  return {
    nav, hero, final, floating, aside, main, links, inserted,
    run(...scripts) {
      for (const script of scripts) vm.runInContext(readFileSync(new URL(`../${script}`, import.meta.url), "utf8"), sandbox, { filename: script });
      callbacks.forEach(callback => callback());
      while (timers.length) timers.shift()();
    },
  };
}

function linkIdentity(link) {
  return { href: link.href, procedure: link.dataset.procedure, track: link.dataset.track,
    reference: link.dataset.originalReference, template: link.dataset.templateId };
}

test("auxiliary and secondary scripts preserve consultation CTAs in either install order", () => {
  for (const scripts of [
    ["campanhas/site-enhancements.js", "campanhas/secondary-conversion.js"],
    ["campanhas/secondary-conversion.js", "campanhas/site-enhancements.js"],
  ]) {
    const page = pageFixture();
    const original = page.links.map(linkIdentity);
    page.run(...scripts);
    for (const link of [page.nav, page.hero, page.final, page.floating]) assert.equal(link.textContent, label);
    assert.equal(page.floating.getAttribute("aria-label"), accessibleLabel);
    assert.deepEqual(page.links.slice(0, original.length).map(linkIdentity), original);
    const generated = page.inserted.find(section => section.className === "secondary-practical").querySelector(".btn");
    assert.equal(generated.textContent, label);
    assert.equal(generated.href, page.nav.href);
    assert.equal(generated.dataset.procedure, "mastopexia");
    assert.equal(generated.dataset.originalReference, "mastopexia");
    assert.equal(generated.dataset.ctaLocation, "consultation_offer");
  }
});

test("secondary procedure variants keep generated CTAs neutral and attributed", () => {
  for (const procedure of ["mastopexia-com-protese", "protese-de-mama", "mamoplastia-redutora", "abdominoplastia", "lipoaspiracao", "pos-bariatrica", "braquioplastia", "lip-lifting", "ninfoplastia"]) {
    const page = pageFixture({ procedure });
    const original = page.links.map(linkIdentity);
    page.run("campanhas/secondary-conversion.js");
    for (const link of [page.nav, page.hero, page.final, page.floating, page.links.at(-1)]) assert.equal(link.textContent, label, procedure);
    assert.deepEqual(page.links.slice(0, original.length).map(linkIdentity), original);
    assert.equal(page.links.at(-1).href, page.nav.href);
    assert.equal(page.links.at(-1).dataset.procedure, procedure);
    assert.equal(page.links.at(-1).dataset.ctaLocation, "consultation_offer");
    assert.equal(page.floating.getAttribute("aria-label"), accessibleLabel);
  }
});

test("article runtime keeps existing and cloned CTAs conversational", () => {
  for (const generatedFinal of [false, true]) {
    const page = pageFixture({ pageType: "article", procedure: "injetaveis", pathname: "/conteudos/botox-preenchimento-bioestimulador/", generatedFinal });
    const original = page.links.map(linkIdentity);
    page.run("campanhas/article-conversion.js", "campanhas/landing-behavior.js");
    for (const link of [page.aside, page.floating]) {
      assert.equal(link.textContent, label);
      assert.equal(link.getAttribute("aria-label"), accessibleLabel);
    }
    const final = generatedFinal ? page.main.querySelector(".btn") : page.final;
    assert.equal(final.textContent, label);
    assert.deepEqual(page.links.slice(0, original.length).map(linkIdentity), original);
    if (generatedFinal) assert.deepEqual(linkIdentity(final), linkIdentity(page.aside));
    for (const link of page.links) assert.doesNotMatch(link.textContent, /agendar|horários/i);
  }
});

test("mama and procedure adjustments do not restore a scheduling invitation", () => {
  for (const [procedure, script] of [["mama", "mama/mama.js"], ["procedimentos", "campanhas/procedure-terra-fixes.js"]]) {
    const page = pageFixture({ procedure });
    const original = page.links.map(linkIdentity);
    page.run(script);
    assert.equal(page.final.textContent, label);
    assert.deepEqual(page.links.map(linkIdentity), original);
    for (const link of page.links) assert.doesNotMatch(link.textContent, /agendar|horários/i);
  }
});
