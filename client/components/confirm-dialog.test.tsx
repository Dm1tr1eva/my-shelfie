import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete book
      </button>
      {open && (
        <ConfirmDialog
          title="Delete “Ash”?"
          text="This cannot be undone."
          cancelLabel="Cancel"
          confirmLabel="Delete"
          onCancel={() => setOpen(false)}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
}

function open() {
  const opener = screen.getByRole("button", { name: "Delete book" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("ConfirmDialog", () => {
  it("puts the focus on Cancel, the safe choice", () => {
    render(<Harness />);
    open();

    const dialog = screen.getByRole("alertdialog", { name: "Delete “Ash”?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape and gives the focus back to what opened it", () => {
    render(<Harness />);
    const opener = open();

    fireEvent.keyDown(screen.getByRole("button", { name: "Cancel" }), { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("marks Escape as handled for listeners on the same root, so a panel under it stays", () => {
    render(<Harness />);
    open();
    const handled: boolean[] = [];
    const listen = (event: KeyboardEvent) => handled.push(event.defaultPrevented);
    document.body.addEventListener("keydown", listen);

    fireEvent.keyDown(screen.getByRole("button", { name: "Cancel" }), { key: "Escape" });
    document.body.removeEventListener("keydown", listen);

    expect(handled).toEqual([true]);
  });

  it("keeps Tab between its two buttons", () => {
    render(<Harness />);
    open();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Delete" });

    remove.focus();
    fireEvent.keyDown(remove, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(remove).toHaveFocus();
  });

  it("confirms only with the destructive button", () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    open();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();

    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
