import { Controller, Get, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { EpisodesModule } from "./episodes/episodes.module";
import { GuestsModule } from "./guests/guests.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { SiteModule } from "./site/site.module";
import { LeadsModule } from "./leads/leads.module";
import { AskModule } from "./ask/ask.module";
import { AdminModule } from "./admin/admin.module";
import { ConfigModule } from "./config/config.module";

@Controller("health")
export class HealthController {
  @Get()
  check(): { status: "ok"; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
@Module({
  imports: [
    ConfigModule,
    MulterModule.register({ storage: memoryStorage() }),
    PrismaModule,
    CommonModule,
    EpisodesModule,
    GuestsModule,
    TaxonomyModule,
    SiteModule,
    LeadsModule,
    AskModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
