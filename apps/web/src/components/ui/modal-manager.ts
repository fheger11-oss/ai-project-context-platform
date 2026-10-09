const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

type ModalEntry = {
  dialog: HTMLElement;
  overlay: HTMLElement;
  previousFocus: HTMLElement | null;
};

type ModalState = {
  entries: ModalEntry[];
  originalBodyOverflow: string;
  originalInert: Map<HTMLElement, boolean>;
};

type ModalRegistration = {
  canDismiss: () => boolean;
  onDismiss: () => void;
};

const states = new WeakMap<Document, ModalState>();

function modalState(document: Document): ModalState {
  const existing = states.get(document);
  if (existing) return existing;

  const state: ModalState = {
    entries: [],
    originalBodyOverflow: document.body.style.overflow,
    originalInert: new Map()
  };
  states.set(document, state);
  return state;
}

function syncBackgroundIsolation(document: Document, state: ModalState) {
  const top = state.entries.at(-1)?.overlay ?? null;

  for (const child of document.body.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (!state.originalInert.has(child)) state.originalInert.set(child, child.inert);
    child.inert = child !== top;
  }
}

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hidden &&
      element.tabIndex >= 0 &&
      !element.matches(":disabled,[aria-disabled='true']") &&
      !element.closest("[inert]") &&
      element.getAttribute("aria-hidden") !== "true"
  );
}

function focusDialog(dialog: HTMLElement) {
  const preferred = dialog.querySelector<HTMLElement>("[data-modal-initial-focus]");
  (preferred ?? dialog).focus({ preventScroll: true });
}

function restoreFocus(element: HTMLElement | null) {
  if (
    !element?.isConnected ||
    element.matches(":disabled,[aria-disabled='true']") ||
    element.closest("[inert]")
  ) {
    return false;
  }

  element.focus();
  return true;
}

export function registerModal(
  document: Document,
  overlay: HTMLElement,
  dialog: HTMLElement,
  registration: ModalRegistration
) {
  const state = modalState(document);
  const entry: ModalEntry = {
    dialog,
    overlay,
    previousFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null
  };

  if (state.entries.length === 0) {
    state.originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  state.entries.push(entry);
  syncBackgroundIsolation(document, state);

  queueMicrotask(() => {
    if (state.entries.at(-1) === entry && dialog.isConnected) focusDialog(dialog);
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (state.entries.at(-1) !== entry) return;

    if (event.key === "Escape") {
      if (!registration.canDismiss()) return;
      event.preventDefault();
      event.stopPropagation();
      registration.onDismiss();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = focusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      focusDialog(dialog);
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first?.focus();
    }
  }

  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
    const index = state.entries.indexOf(entry);
    const wasTop = index === state.entries.length - 1;
    if (index >= 0) state.entries.splice(index, 1);

    if (state.entries.length === 0) {
      document.body.style.overflow = state.originalBodyOverflow;
      for (const [element, inert] of state.originalInert) {
        if (element.isConnected) element.inert = inert;
      }
      state.originalInert.clear();
      states.delete(document);
      if (wasTop) restoreFocus(entry.previousFocus);
      return;
    }

    syncBackgroundIsolation(document, state);
    if (!wasTop) return;

    const nextTop = state.entries.at(-1);
    if (!nextTop) return;
    if (!restoreFocus(entry.previousFocus) || !nextTop.dialog.contains(document.activeElement)) {
      focusDialog(nextTop.dialog);
    }
  };
}
