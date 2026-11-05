import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InstallAction } from "./install-action";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function pretend({ agent, standalone = false }: { agent: string; standalone?: boolean }) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(agent);
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query === "(display-mode: standalone)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function offerInstall() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { prompt, event };
}

describe("InstallAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows nothing in a browser that has not offered to install the site", () => {
    pretend({ agent: ANDROID });
    const { container } = render(<InstallAction />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers an Install app button once the browser says the site can be installed, and opens its prompt", async () => {
    pretend({ agent: ANDROID });
    render(<InstallAction />);
    const { prompt, event } = offerInstall();

    fireEvent.click(await screen.findByRole("button", { name: "Install app" }));

    expect(event.defaultPrevented).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument();
  });

  it("explains the Share menu steps on an iPhone, where there is no install prompt", () => {
    pretend({ agent: IPHONE });
    render(<InstallAction />);

    expect(screen.getByText(/tap Share, then Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument();
  });

  it("shows nothing once the site is already running as an installed app", () => {
    pretend({ agent: IPHONE, standalone: true });
    const { container } = render(<InstallAction />);
    offerInstall();

    expect(container).toBeEmptyDOMElement();
  });

  it("goes away when the browser reports the site was installed", async () => {
    pretend({ agent: ANDROID });
    render(<InstallAction />);
    offerInstall();
    await screen.findByRole("button", { name: "Install app" });

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument();
  });
});
