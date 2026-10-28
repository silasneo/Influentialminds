import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { resolve } from "node:path";
import { API_VERSION_PREFIX } from "@influential-minds/contracts";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { CONFIG_TOKEN, type AppConfig } from "./config/configuration";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const config = app.get<AppConfig>(CONFIG_TOKEN);

  // crossOriginResourcePolicy is relaxed so the web app can load uploaded media.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );
  app.use(cookieParser());
  app.set("trust proxy", 1);

  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.useGlobalFilters(new ApiExceptionFilter());

  app.useStaticAssets(resolve(process.cwd(), config.STORAGE_LOCAL_ROOT), {
    prefix: config.STORAGE_PUBLIC_PATH,
    index: false,
    maxAge: config.isProduction ? "7d" : 0,
  });

  await app.listen(config.PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(
    `Influential Minds API listening on ${config.API_URL}/${API_VERSION_PREFIX} (AI provider: ${config.AI_PROVIDER})`
  );
}

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
