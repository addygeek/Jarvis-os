import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "../types/api.js";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = {
      error: err.message,
      code: err.code,
      details: err.details,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[backend] unhandled error:", err);

  const body: ApiErrorBody = { error: message, code: "INTERNAL_ERROR" };
  res.status(500).json(body);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}
