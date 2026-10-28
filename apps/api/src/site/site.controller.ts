import { Controller, Get } from "@nestjs/common";
import type {
  HomepagePayload,
  SiteSettings,
} from "@influential-minds/contracts";
import { SiteService } from "./site.service";

@Controller("site")
export class SiteController {
  constructor(private readonly site: SiteService) {}

  @Get("settings")
  settings(): Promise<SiteSettings> {
    return this.site.getSettings();
  }

  @Get("homepage")
  homepage(): Promise<HomepagePayload> {
    return this.site.getHomepage();
  }
}
