import type { NextFunction, Request, Response } from "express";
import type { ZodType, z } from "zod";
import { AppError } from "../lib/errors.js";

// Per Part E.5 - the same Zod schema a frontend form will eventually import
// from @commerceos/types is parsed here too, so a validation rule is defined
// exactly once. On success, req.body is replaced with the parsed (and typecoerced/defaulted) value; on failure, a single AppError.validation carries
// every failed field per Part O.8's consistent error shape.
export function validateBody<TSchema extends ZodType>(schema: TSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw AppError.validation("Request validation failed", "VALIDATION", result.error.flatten());
    }
    req.body = result.data as z.infer<TSchema>;
    next();
  };
}
