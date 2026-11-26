import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { renderToString } from "react-dom/server";
import { Drawer } from "./drawer";

function Opener({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Drawer
          label="Things"
          header={<h2>Things</h2>}
          footer={<button type="button">Last</button>}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        >
          <button type="button">First</button>
        </Drawer>
      )}
    </>
  );
}

function open() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Drawer", () => {
  it("takes the focus when it opens and gives it back to the opener when it closes", () => {
    render(<Opener />);
    const opener = open();

    const dialog = screen.getByRole("dialog", { name: "Things" });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape and on a click outside the panel", () => {
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);

    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.click(screen.getByRole("dialog").previousElementSibling as Element);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("gives the focus to the page heading when the opener is gone, as after a delete", () => {
    function Page() {
      const [open, setOpen] = useState(false);
      const [listed, setListed] = useState(true);
      return (
        <main>
          <h1>Library</h1>
          {listed && (
            <button type="button" onClick={() => setOpen(true)}>
              Ash
            </button>
          )}
          {open && (
            <Drawer label="Ash" header={<h2>Ash</h2>} onClose={() => setOpen(false)}>
              <button type="button" onClick={() => setListed(false)}>
                Delete
              </button>
            </Drawer>
          )}
        </main>
      );
    }
    render(<Page />);
    const opener = screen.getByRole("button", { name: "Ash" });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.getByRole("heading", { name: "Library" })).toHaveFocus();
  });

  it("stays open when something inside it has already handled Escape", () => {
    const onClose = vi.fn();
    render(
      <Drawer label="Things" header={<h2>Things</h2>} onClose={onClose}>
        <input
          aria-label="Search"
          onKeyDown={(event) => {
            if (event.key === "Escape") event.preventDefault();
          }}
        />
      </Drawer>,
    );

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search" }), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab inside the panel, wrapping from the last control to the first and back", () => {
    render(<Opener />);
    open();

    const close = screen.getByRole("button", { name: "Close" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("sends Shift+Tab from the panel itself, right after opening, to the last control", () => {
    render(<Opener />);
    open();

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("renders nothing on the server, where there is no page to put it on", () => {
    expect(() =>
      renderToString(
        <Drawer label="Things" header={<h2>Things</h2>} onClose={() => {}}>
          <p>Inside</p>
        </Drawer>,
      ),
    ).not.toThrow();
  });

  it("opens with the focus inside when it is on the page from the start", () => {
    render(
      <Drawer label="Things" header={<h2>Things</h2>} onClose={() => {}}>
        <button type="button">First</button>
      </Drawer>,
    );

    expect(screen.getByRole("dialog", { name: "Things" })).toHaveFocus();
  });

  it("plays its closing animation before it goes, when the page animates it", () => {
    const real = window.getComputedStyle;
    const computed = vi.spyOn(window, "getComputedStyle").mockImplementation(
      (element, pseudo) =>
        new Proxy(real(element, pseudo), {
          get(target, key) {
            if (key === "animationName") return "panel-in";
            const value = Reflect.get(target, key);
            return typeof value === "function" ? value.bind(target) : value;
          },
        }),
    );
    const onClose = vi.fn();
    render(<Opener onClose={onClose} />);
    open();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    const dialog = screen.getByRole("dialog");
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.className).toContain("animate-sheet-out");

    fireEvent(dialog, new Event("webkitAnimationEnd", { bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    computed.mockRestore();
  });
});
