import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

/** Normalises every failure into the `ApiErrorBody` contract. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Api");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body =
        typeof payload === "object" && payload !== null
          ? {
              statusCode: status,
              error: HttpStatus[status] ?? "Error",
              ...(payload as Record<string, unknown>),
            }
          : {
              statusCode: status,
              error: HttpStatus[status] ?? "Error",
              message: String(payload),
            };
      response.status(status).json(body);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          error: "Conflict",
          message: "A record with these unique values already exists.",
          details: exception.meta,
        });
        return;
      }
      if (exception.code === "P2025") {
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          error: "Not Found",
          message: "The requested record does not exist.",
        });
        return;
      }
    }

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Something went wrong handling this request.",
    });
  }
}
