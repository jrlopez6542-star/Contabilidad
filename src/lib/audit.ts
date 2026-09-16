import { prisma } from "./prisma";
import type { SessionUser } from "./auth";

export async function writeAudit(
  session: SessionUser | null | undefined,
  action: string,
  entity: string,
  entityId: string,
  summary: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session?.id || null,
        userEmail: session?.email || "",
        action,
        entity,
        entityId: entityId || "",
        summary,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
