const { z } = require("zod");

const isbn = z
  .string()
  .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
  .pipe(z.string().regex(/^(\d{9}[\dX]|\d{13})$/, "Expected an ISBN-10 or ISBN-13"));

const seriesLookupSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    authors: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
    subtitle: z.string().trim().min(1).max(300).optional(),
    isbn: isbn.optional(),
    googleVolumeId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,40}$/, "Expected a Google Books volume id")
      .optional(),
    language: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "Expected a language code such as ru or en")
      .optional(),
  })
  .strict();

module.exports = { seriesLookupSchema };
