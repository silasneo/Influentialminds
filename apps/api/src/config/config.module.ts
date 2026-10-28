import { Global, Module } from "@nestjs/common";
import { CONFIG_TOKEN, loadConfig, type AppConfig } from "./configuration";

/** Config is parsed once and injected everywhere via {@link CONFIG_TOKEN}. */
@Global()
@Module({
  providers: [
    { provide: CONFIG_TOKEN, useFactory: (): AppConfig => loadConfig() },
  ],
  exports: [CONFIG_TOKEN],
})
export class ConfigModule {}
