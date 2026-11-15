import { describe, expect, it, vi } from "vitest";
import { ArgumentsHost, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiExceptionFilter } from "../src/common/api-exception.filter";

/** Captures what the filter wrote without standing up an HTTP server. */
function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: "POST", url: "/api/v1/admin" }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

/** body-parser tags its failures with `type` rather than a subclass. */
function payloadTooLarge() {
  const error = new Error("request entity too large");
  Object.assign(error, { type: "entity.too.large", limit: 6_000_000 });
  return error;
}

describe("ApiExceptionFilter", () => {
  it("maps an oversized body to 413 instead of a generic 500", () => {
    const { host, status, json } = makeHost();

    new ApiExceptionFilter().catch(payloadTooLarge(), host);

    expect(status).toHaveBeenCalledWith(413);
    // An opaque 500 gave no hint that the file itself was the problem.
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 413,
        error: "Payload Too Large",
        message: expect.stringMatching(/too large/i),
      })
    );
  });

  it("still passes HttpExceptions through untouched", () => {
    const { host, status, json } = makeHost();

    new ApiExceptionFilter().catch(new NotFoundException("No episode"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: "No episode" })
    );
  });

  it("still maps Prisma unique-constraint failures to 409", () => {
    const { host, status, json } = makeHost();
    const error = new Prisma.PrismaClientKnownRequestError("dupe", {
      code: "P2002",
      clientVersion: "6.5.0",
      meta: { target: ["slug"] },
    });

    new ApiExceptionFilter().catch(error, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: "Conflict" })
    );
  });

  it("hides details of unrecognised failures behind a 500", () => {
    const { host, status, json } = makeHost();
    // This path logs the stack by design; keep it out of the test output.
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    new ApiExceptionFilter().catch(new Error("DATABASE_URL=secret"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: expect.not.stringContaining("secret"),
      })
    );
    vi.restoreAllMocks();
  });
});
