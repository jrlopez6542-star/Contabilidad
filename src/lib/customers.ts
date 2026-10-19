import { prisma } from "./prisma";
import { writeAudit } from "./audit";
import type { SessionUser } from "./auth";

export type BulkDeleteCustomersResult =
  | { ok: true; count: number; names: string[] }
  | { error: string };

export async function executeDeleteCustomersBulk(
  ids: string[],
  session?: SessionUser | null
): Promise<BulkDeleteCustomersResult> {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "No se seleccionó ningún cliente." };
  }

  const uniqueIds = Array.from(
    new Set(ids.filter((id) => typeof id === "string" && id.trim().length > 0))
  ).slice(0, 100);

  if (uniqueIds.length === 0) {
    return { error: "No se seleccionaron clientes válidos." };
  }

  try {
    const { deletedCount, deletedNames } = await prisma.$transaction(
      async (tx) => {
        const customers = await tx.customer.findMany({
          where: { id: { in: uniqueIds } },
          include: {
            _count: { select: { invoices: true, quotes: true } },
          },
        });

        if (customers.length === 0) {
          throw new Error("No se encontraron clientes para eliminar.");
        }

        const blocked = customers.filter(
          (c) => c._count.invoices > 0 || c._count.quotes > 0
        );

        if (blocked.length > 0) {
          const names = blocked.map((c) => c.name).join(", ");
          throw new Error(
            `No se pueden eliminar clientes con facturas o cotizaciones asociadas: ${names}`
          );
        }

        const names = customers.map((c) => c.name);

        await tx.customer.deleteMany({
          where: { id: { in: uniqueIds } },
        });

        return { deletedCount: customers.length, deletedNames: names };
      }
    );

    if (session) {
      await writeAudit(
        session,
        "delete",
        "customer",
        "bulk",
        `Eliminación masiva de ${deletedCount} cliente(s): ${deletedNames.join(", ")}`
      );
    }

    return { ok: true, count: deletedCount, names: deletedNames };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error al eliminar los clientes seleccionados.",
    };
  }
}
