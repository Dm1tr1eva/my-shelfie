# Design: public pages — home, sign in, create account, privacy

## Problem

- The four public pages still carry the first-stage look and wording ("Your reading, on one
  shelf", a reading tracker) and no longer describe the app (`client/app/page.tsx`,
  `login-form.tsx`, `register-form.tsx`, `app/privacy/page.tsx`).
- The server accepts any registration body: no password length, no email check, no name check.
  An empty password reaches `bcrypt.hash` and answers `500`
  (`server/controllers/authController.js:15`). The handoff shows a password rule and per-field
  errors, which the server cannot back today.
- The privacy page lists a reading tracker's data, not series, ownership, tropes, links or notes.

## Out of scope

Google sign-in (decided 2026-10-11), a password reset (so no "Forgot password?" link), email
verification, account deletion from the UI, the README and screenshots.

## Scale assumptions

A handful of accounts; registration is rare and not abusive, so no rate limit (principle 2).

## Approach

1. **Server rule, one place.** `validation/authSchemas.js`: register takes `email` (valid, at
   most 254 characters), `name` (1–100) and `password` (8–72 characters; bcrypt reads no more);
   login takes non-empty `email` and `password`. Unknown fields are rejected like everywhere
   else. Answers are `400` with the existing `field: message` text; a taken email stays `409`.
   Existing accounts with a shorter password keep signing in: the length rule is on register
   only.
2. **Same rule on the client**, so the page says "Use at least 8 characters" because it is
   true. Create account validates per field (name, email, password, matching confirmation) and
   shows a taken email under the email field with a link to sign in. Sign in shows one generic
   banner and never says which field was wrong. Both have a show/hide password button.
3. **Home** as `home-*`: a navy hero with the eyebrow, "Your books, shelved by series.", the
   two actions and a decorative shelf with a dashed gap; three cards for series, gaps and
   shop languages. A signed-in visitor gets "Open my library" in place of the two actions.
4. **Privacy** as `privacy-*`: contents list and sections. Everything it says is what the app
   does: the Google-sign-in and scope placeholders are not in it because there is no Google
   sign-in. Contact and deletion stay on the public issue tracker, as now.
5. After sign-in or registration the app goes to `/library`, not through the old redirect.

## Trade-offs accepted

- A password length rule with no strength meter or breached-password check.
- Contact for deletion requests is a public issue, so a request must carry no personal detail;
  an email address would be better and is the author's to supply.
- "Last updated" on the privacy page is edited by hand.

## Cost

One new server file and edits to the auth controller; client: login, register, home, privacy,
a password field component and two icons; tests for each. Roughly 600 changed lines.

## Open questions

- Does the author want an email address on the privacy page in place of the issue tracker?
