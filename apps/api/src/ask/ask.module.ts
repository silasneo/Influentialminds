import { Module } from "@nestjs/common";
import { AskController } from "./ask.controller";
import { AskService } from "./ask.service";
import { RetrievalService } from "./retrieval.service";
import {
  ASK_PROVIDER,
  DisabledAskProvider,
  MindStudioAskProvider,
  MockAskProvider,
  type AskProvider,
} from "./ask.provider";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

@Module({
  controllers: [AskController],
  providers: [
    AskService,
    RetrievalService,
    {
      provide: ASK_PROVIDER,
      inject: [CONFIG_TOKEN],
      useFactory: (config: AppConfig): AskProvider => {
        if (config.AI_PROVIDER === "mindstudio")
          return new MindStudioAskProvider(config);
        if (config.AI_PROVIDER === "mock") return new MockAskProvider();
        return new DisabledAskProvider();
      },
    },
  ],
  exports: [AskService, RetrievalService],
})
export class AskModule {}
