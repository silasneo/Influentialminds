import { Module } from "@nestjs/common";
import {
  BrevoMailProvider,
  DisabledMailProvider,
  MAIL_PROVIDER,
  type MailProvider,
} from "./mail.provider";
import { CONFIG_TOKEN, type AppConfig } from "../config/configuration";

@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [CONFIG_TOKEN],
      useFactory: (config: AppConfig): MailProvider =>
        config.EMAIL_PROVIDER === "brevo"
          ? new BrevoMailProvider(config)
          : new DisabledMailProvider(),
    },
  ],
  exports: [MAIL_PROVIDER],
})
export class MailModule {}
