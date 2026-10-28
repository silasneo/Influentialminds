import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.module";

export interface AuditActor {
  id: string;
  email: string;
}

/** Records every admin mutation so editorial changes are traceable. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    actor: AuditActor | null,
    action: string,
    entity: string,
    entityId: string | null,
    summary?: string
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          action,
          entity,
          entityId,
          summary: summary ?? null,
        },
      });
    } catch (error) {
      // An audit write must never break the editorial action it describes.
      this.logger.warn(
        `Failed to write audit entry for ${action} ${entity}: ${String(error)}`
      );
    }
  }
}
