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
});
