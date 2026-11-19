import { ZodError } from 'zod';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Validate req[part] against a zod schema and replace it with the parsed value. */
export const validate = (schema, part = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.') || part;
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }
  Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
  next();
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'That already exists.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
}
