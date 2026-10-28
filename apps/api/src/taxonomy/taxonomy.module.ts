import { Module } from "@nestjs/common";
import { CollectionsController, TopicsController } from "./taxonomy.controller";
import { TaxonomyService } from "./taxonomy.service";
import { EpisodesModule } from "../episodes/episodes.module";

@Module({
  imports: [EpisodesModule],
  controllers: [TopicsController, CollectionsController],
  providers: [TaxonomyService],
  exports: [TaxonomyService],
})
export class TaxonomyModule {}
