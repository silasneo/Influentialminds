import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./admin.guard";
import { DashboardService } from "./dashboard.service";
import { MediaService } from "./media.service";
import { TranscriptService } from "./transcript.service";
import { EpisodesModule } from "../episodes/episodes.module";
import { GuestsModule } from "../guests/guests.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { LeadsModule } from "../leads/leads.module";
import { SiteModule } from "../site/site.module";

@Module({
  imports: [
    EpisodesModule,
    GuestsModule,
    TaxonomyModule,
    LeadsModule,
    SiteModule,
  ],
  controllers: [AuthController, AdminController],
  providers: [
    AuthService,
    AdminGuard,
    DashboardService,
    MediaService,
    TranscriptService,
  ],
  exports: [AuthService],
})
export class AdminModule {}
