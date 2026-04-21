import { ZodError } from "zod";

const assignParsedFields = (request, parsedData) => {
  if (parsedData.body) {
    request.body = parsedData.body;
  }
  request.validated = parsedData;
};

export const validateRequest = (schema) => {
  return (request, response, next) => {
    try {
      const parsedResult = schema.parse({
        body: request.body,
        params: request.params,
        query: request.query
      });

      assignParsedFields(request, parsedResult);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({
          error: "Validation failed",
          details: error.issues
        });
        return;
      }

      next(error);
    }
  };
};
