import { Module } from "@nestjs/common";
import { GuestsController } from "./guests.controller";
import { GuestsService } from "./guests.service";
import { EpisodesModule } from "../episodes/episodes.module";

@Module({
  imports: [EpisodesModule],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
