import "@testing-library/jest-dom";

// Polyfill ResizeObserver for cmdk / Radix UI components in JSDOM environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;

// Polyfill Element.prototype.scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
