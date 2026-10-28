import { Body, Controller, Get, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  askRequestSchema,
  type AskRequest,
  type AskResponse,
  type AskUsage,
} from "@influential-minds/contracts";
import { AskService, type AskSubject } from "./ask.service";
import { zodPipe } from "../common/zod-validation.pipe";
import { clientIp, hashIdentifier } from "../common/request-context";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

@Controller("ask")
export class AskController {
  constructor(
    private readonly ask: AskService,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  /**
   * Anonymous visitors are identified by a salted IP hash. Account tiers arrive
   * with the V2 sign-in work; the schema and limits already model them.
   */
  private subject(request: Request): AskSubject {
    const ip = clientIp(request) ?? "unknown";
    return {
      key: hashIdentifier(ip, this.config.IP_HASH_SALT),
      tier: "ANONYMOUS",
    };
  }

  @Get("usage")
  usage(@Req() request: Request): Promise<AskUsage> {
    return this.ask.getUsage(this.subject(request));
  }

  @Post()
  submit(
    @Body(zodPipe(askRequestSchema)) body: AskRequest,
    @Req() request: Request
  ): Promise<AskResponse> {
    return this.ask.ask(body, this.subject(request));
  }
}
