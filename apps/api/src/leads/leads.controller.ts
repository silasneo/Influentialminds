import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  leadSubmissionSchema,
  type LeadMagnet,
  type LeadSubmission,
  type LeadSubmissionResponse,
} from "@influential-minds/contracts";
import { LeadsService } from "./leads.service";
import { zodPipe } from "../common/zod-validation.pipe";
import { clientIp, hashIdentifier } from "../common/request-context";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";
import { Inject } from "@nestjs/common";

@Controller("leads")
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    @Inject(CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  @Get("magnet")
  activeMagnet(): Promise<LeadMagnet | null> {
    return this.leads.getActiveLeadMagnet();
  }

  @Post()
  submit(
    @Body(zodPipe(leadSubmissionSchema)) body: LeadSubmission,
    @Req() request: Request
  ): Promise<LeadSubmissionResponse> {
    const ip = clientIp(request);
    return this.leads.submit(body, {
      ipHash: ip ? hashIdentifier(ip, this.config.IP_HASH_SALT) : null,
    });
  }
}
