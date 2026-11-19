const { HttpError } = require("../errors/httpError");

const DEFAULT_FAILURE = "Request failed";

const BODY_ERRORS = new Map([
  ["entity.too.large", { status: 413, message: "Request body is too large" }],
  ["entity.parse.failed", { status: 400, message: "Request body is not valid JSON" }],
]);

function failsWith(message) {
  return (req, res, next) => {
    res.locals.failureMessage = message;
    next();
  };
}

function handleErrors(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  const bodyError = BODY_ERRORS.get(err.type);
  if (bodyError) {
    return res.status(bodyError.status).json({ error: bodyError.message });
  }

  console.error(`${req.method} ${req.path}`, err.stack);
  res.status(500).json({ error: res.locals.failureMessage ?? DEFAULT_FAILURE });
}

module.exports = { failsWith, handleErrors };
