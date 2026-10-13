const { z } = require("zod");

const MAX_PASSWORD_BYTES = 72;

const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .pipe(z.email({ message: "must be a valid email address" }).max(254)),
    name: z.string().trim().min(1, "is required").max(100),
    password: z
      .string()
      .min(8, "must be at least 8 characters")
      .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES, {
        message: "must be at most 72 bytes",
      }),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().trim().min(1, "is required").max(254),
    password: z.string().min(1, "is required").max(1000),
  })
  .strict();

module.exports = { registerSchema, loginSchema };
