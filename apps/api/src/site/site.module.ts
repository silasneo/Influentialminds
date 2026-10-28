import { Module } from "@nestjs/common";
import { SiteController } from "./site.controller";
import { SitemapController } from "./sitemap.controller";
import { SiteService } from "./site.service";
import { EpisodesModule } from "../episodes/episodes.module";
import { GuestsModule } from "../guests/guests.module";
import { TaxonomyModule } from "../taxonomy/taxonomy.module";
import { LeadsModule } from "../leads/leads.module";

@Module({
  imports: [EpisodesModule, GuestsModule, TaxonomyModule, LeadsModule],
  controllers: [SiteController, SitemapController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
