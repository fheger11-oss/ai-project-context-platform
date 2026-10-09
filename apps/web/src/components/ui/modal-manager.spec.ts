import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerModal } from "@/components/ui/modal-manager";

class FakeElement {
  ariaHidden: string | null = null;
  disabled = false;
  inert = false;
  isConnected = true;
  hidden = false;
  parent: FakeElement | null = null;
  tabIndex = 0;
  focusables: FakeElement[] = [];

  constructor(
    readonly name: string,
    private readonly owner: FakeDocument
  ) {}

  closest(selector: string) {
    if (selector !== "[inert]") return null;
    if (this.inert) return this;
    let ancestor = this.parent;
    while (ancestor) {
      if (ancestor.inert) return ancestor;
      ancestor = ancestor.parent;
    }
    return null;
  }

  contains(value: unknown) {
    if (value === this) return true;
    return this.focusables.includes(value as FakeElement);
  }

  focus() {
    this.owner.activeElement = this;
  }

  getAttribute(name: string) {
    return name === "aria-hidden" ? this.ariaHidden : null;
  }

  matches(selector: string) {
    return selector.includes(":disabled") && this.disabled;
  }

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return this.focusables;
  }
}

class FakeDocument {
  activeElement: FakeElement | null = null;
  readonly body = {
    children: [] as FakeElement[],
    style: { overflow: "auto" }
  };
  private listeners = new Set<(event: KeyboardEvent) => void>();

  addEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.add(listener as (event: KeyboardEvent) => void);
  }

  removeEventListener(_type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.delete(listener as (event: KeyboardEvent) => void);
  }

  dispatchKey(key: string, shiftKey = false) {
    const event = {
      key,
      shiftKey,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as KeyboardEvent;
    for (const listener of this.listeners) listener(event);
    return event;
  }
}

function modalFixture(document: FakeDocument, name: string) {
  const overlay = new FakeElement(`${name}-overlay`, document);
  const dialog = new FakeElement(`${name}-dialog`, document);
  const first = new FakeElement(`${name}-first`, document);
  const last = new FakeElement(`${name}-last`, document);
  first.parent = dialog;
  last.parent = dialog;
  dialog.parent = overlay;
  dialog.focusables = [first, last];
  document.body.children.push(overlay);
  return { dialog, first, last, overlay };
}

describe("modal manager", () => {
  const originalHTMLElement = globalThis.HTMLElement;

  beforeEach(() => {
    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      value: FakeElement
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      value: originalHTMLElement
    });
  });

  it("moves focus into the dialog and isolates the background", async () => {
    const document = new FakeDocument();
    const background = new FakeElement("background", document);
    const opener = new FakeElement("opener", document);
    opener.parent = background;
    document.body.children.push(background);
    document.activeElement = opener;
    const modal = modalFixture(document, "modal");

    const cleanup = registerModal(
      document as unknown as Document,
      modal.overlay as unknown as HTMLElement,
      modal.dialog as unknown as HTMLElement,
      { canDismiss: () => true, onDismiss: vi.fn() }
    );
    await Promise.resolve();

    expect(document.activeElement).toBe(modal.dialog);
    expect(background.inert).toBe(true);
    expect(modal.overlay.inert).toBe(false);
    expect(document.body.style.overflow).toBe("hidden");

    cleanup();

    expect(document.activeElement).toBe(opener);
    expect(background.inert).toBe(false);
    expect(document.body.style.overflow).toBe("auto");
  });

  it("wraps Tab and Shift+Tab within the active dialog", () => {
    const document = new FakeDocument();
    const modal = modalFixture(document, "modal");
    const cleanup = registerModal(
      document as unknown as Document,
      modal.overlay as unknown as HTMLElement,
      modal.dialog as unknown as HTMLElement,
      { canDismiss: () => true, onDismiss: vi.fn() }
    );

    document.activeElement = modal.last;
    document.dispatchKey("Tab");
    expect(document.activeElement).toBe(modal.first);

    document.activeElement = modal.first;
    document.dispatchKey("Tab", true);
    expect(document.activeElement).toBe(modal.last);

    cleanup();
  });

  it("honors dismissibility when Escape is pressed", () => {
    const document = new FakeDocument();
    const modal = modalFixture(document, "modal");
    const onDismiss = vi.fn();
    let dismissible = false;
    const cleanup = registerModal(
      document as unknown as Document,
      modal.overlay as unknown as HTMLElement,
      modal.dialog as unknown as HTMLElement,
      { canDismiss: () => dismissible, onDismiss }
    );

    document.dispatchKey("Escape");
    expect(onDismiss).not.toHaveBeenCalled();

    dismissible = true;
    document.dispatchKey("Escape");
    expect(onDismiss).toHaveBeenCalledOnce();

    cleanup();
  });

  it("keeps background isolation and scroll locking until the last modal closes", async () => {
    const document = new FakeDocument();
    const background = new FakeElement("background", document);
    const outerOpener = new FakeElement("outer-opener", document);
    outerOpener.parent = background;
    document.body.children.push(background);
    document.activeElement = outerOpener;
    const outer = modalFixture(document, "outer");
    const cleanupOuter = registerModal(
      document as unknown as Document,
      outer.overlay as unknown as HTMLElement,
      outer.dialog as unknown as HTMLElement,
      { canDismiss: () => true, onDismiss: vi.fn() }
    );
    await Promise.resolve();

    document.activeElement = outer.first;
    const inner = modalFixture(document, "inner");
    const cleanupInner = registerModal(
      document as unknown as Document,
      inner.overlay as unknown as HTMLElement,
      inner.dialog as unknown as HTMLElement,
      { canDismiss: () => true, onDismiss: vi.fn() }
    );
    await Promise.resolve();

    expect(outer.overlay.inert).toBe(true);
    expect(inner.overlay.inert).toBe(false);

    cleanupInner();
    expect(document.body.style.overflow).toBe("hidden");
    expect(background.inert).toBe(true);
    expect(outer.overlay.inert).toBe(false);
    expect(document.activeElement).toBe(outer.first);

    cleanupOuter();
    expect(document.body.style.overflow).toBe("auto");
    expect(background.inert).toBe(false);
    expect(document.activeElement).toBe(outerOpener);
  });
});
