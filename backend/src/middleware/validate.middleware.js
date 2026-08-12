// Express middleware that validates request bodies/params/query against a Zod schema.
// Returns 400 with structured errors on failure; passes through on success.
// Usage: router.post('/route', validateBody(mySchema), controller);

const { ZodError } = require('zod');

function convertZodErrors(errors) {
  return errors.map((e) => ({
    field: e.path.join('.') || 'body',
    message: e.message,
  }));
}

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.validatedBody = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: convertZodErrors(err.errors),
        });
      }
      next(err);
    }
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.params);
      req.validatedParams = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid route parameters',
          errors: convertZodErrors(err.errors),
        });
      }
      next(err);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      req.validatedQuery = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: convertZodErrors(err.errors),
        });
      }
      next(err);
    }
  };
}

module.exports = { validateBody, validateParams, validateQuery };
