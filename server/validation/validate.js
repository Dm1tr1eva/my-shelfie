const { HttpError } = require("../errors/httpError");

function formatZodError(error, rootLabel) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || rootLabel}: ${issue.message}`)
    .join("; ");
}

function validate(schema, input, rootLabel = "body") {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, formatZodError(parsed.error, rootLabel));
  }
  return parsed.data;
}

module.exports = { validate };
