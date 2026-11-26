# Design: v3 series page

## Problem

`/series/[id]` (`components/series-page.tsx`) is the v2 page: a shelf of covers, an "About"
card and one form below that edits everything, the note included, deleting through
`window.confirm`. The v3 handoff (decisions 14–18, 45–50; `series-1440/768/375`,
`series-375-open`, `series-title-1440`, `series-edit-1440`) wants a read-only header, an edit
mode behind a pencil, roomy book rows and one row per run of missing numbers.

## Out of scope

AI ("Fill empty fields with AI"), the add modal (a gap's `+` keeps `/add?series=…&number=…`),
the wishlist page (it keeps `SeriesHeader` and `OwnProgress`), a co-author (the model has one
`author`), the server.

## Scale assumptions

One series, tens of books.

## Approach

**Header, read-only.** Title (Playfair) with the age chip glued to its last word by a no-break
space, so it wraps with that word; a round pencil; author and the outline status chip; Genre
and Tropes rows (labels in their own column, pills wrapping); the series annotation. A right
column holds the navy card "2 of 6 owned" with `SeriesSegments` in a new `card` variant (on
navy, stretched, still at most ten) and **My note**. Below 768px the card shrinks to a strip,
and genre, tropes and annotation fold behind a round "more" button on the card's bottom edge.

**My note** is edited in place: its pencil turns the text into an `AutoTextarea`; leaving it
saves with the panel's `Toast` and Undo; Escape cancels; a failure keeps the text, with Retry.

**Edit mode** replaces the header card: a navy bar "Editing the series", rows Title, Author,
Status (four segments), Books in the series (1–200 or empty, "planned, can be left empty"), Age
(Not set · 12+ · 16+ · 18+), Genre (`GenreMultiSelect`), Tropes (`TagInput`), Annotation; a
footer with "Delete series" left and Cancel / Done right — the one explicit Done/Cancel in the
app. Done sends one `PATCH`; a blank title or a bad count is shown under its field and nothing
is sent. Delete asks in `ConfirmDialog` ("its books stay in your library"), then goes to
`/library`. Below 768px the same form is a near full-screen `Drawer` sheet.

**Expected numbers** (`Series.expected`) are shown, not edited: they will come from series
lookup (step 6), and a hand-made list editor has no design yet.

**Books.** `seriesSlots` (the library's) gives books and gaps in order. A book row is one link
to `/books/[id]`, so the panel opens over the page: `#N`, cover, title, one meta line (the
status dot in the format's words · format, or "In wishlist" with no format), a progress bar
with percent for a book being read, a round arrow. A gap row: `#4–6` in burgundy, a dashed
cover, "Not in the catalogue yet", and "Not before 2027 · according to FantLab" (the earliest
expected year and its source) when known, with a round `+` to the add page. Unnumbered books
come last.

**Shared:** the panel's progress bar moves to `progress-bar.tsx`; new `AgeChip`; `StatusDot`
takes a format.

**States.** Skeleton, `NotFound` on `404`, `ErrorState` with Try again, and "No books in this
series yet" with an add link.

**Removed.** The v2 body, its breadcrumb, dead `series.*` keys, `domain.seriesHeader`.

## Trade-offs accepted

- Expected numbers cannot be corrected by hand until lookup or a later step adds it.
- At 768px all tropes show; the mockup's "+2" fold is not built.
- Done sends every field, not only the changed ones; one user edits a series.

## Cost

New: `series-page.tsx` rewritten, `series-edit.tsx`, `series-note.tsx`, `progress-bar.tsx`,
`AgeChip`, i18n keys, tests. No dependency. About 900 lines.

## Open questions

- Should expected numbers become editable here once lookup exists, or only through lookup?
