import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Validates request payloads against the shared zod contracts so the API and
 * the frontend can never drift apart.
 */
export class ZodValidationPipe<TOutput> implements PipeTransform<
  unknown,
  TOutput
> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): TOutput {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      details: result.error.issues.map(issue => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    });
  }
}

export function zodPipe<TOutput>(
  schema: ZodType<TOutput>
): ZodValidationPipe<TOutput> {
  return new ZodValidationPipe(schema);
}
