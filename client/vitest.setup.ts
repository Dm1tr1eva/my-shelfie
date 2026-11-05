import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Element.prototype.scrollIntoView = vi.fn();

window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
