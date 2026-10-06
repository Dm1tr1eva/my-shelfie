const { z } = require("zod");

// Mirrors server/models/book.js exactly — this is boundary validation, not a
// chance to invent constraints Mongoose never had. .strict() doubles as the
// allow-list PATCH used to track by hand in UPDATABLE_FIELDS: an unknown key
// (userId, _id, createdAt, ...) is now rejected, not silently dropped.
const createBookSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    coverUrl: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["want", "reading", "dropped", "read"]).optional(),
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    startedAt: z.coerce.date().optional(),
    finishedAt: z.coerce.date().optional(),
  })
  .strict();

const CLEARABLE_FIELDS = ["coverUrl", "description", "rating", "review", "startedAt", "finishedAt"];

const clearableFields = Object.fromEntries(
  CLEARABLE_FIELDS.map((field) => [field, createBookSchema.shape[field].nullable()]),
);

const updateBookSchema = createBookSchema
  .partial()
  .extend(clearableFields)
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No updatable fields provided",
  });

module.exports = { createBookSchema, updateBookSchema };
