"use server";

import { prisma } from "../../lib/prisma"; // Ajusta la ruta a tu prisma
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function aprobarCierre(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  // Verificamos que exista y sea un administrador
  if (!admin || !admin.tenantId) return;

  // 1. Extraemos los datos del formulario oculto en la tabla
  const cierreId = formData.get("cierreId") as string;
  const reportedCash = parseFloat(formData.get("reportedCash") as string);
  const rolloverAmount = parseFloat(formData.get("rolloverAmount") as string) || 0;

  // 2. Cálculo lógico: Lo que entregó el cobrador MENOS lo que le dejo para mañana = Caja Fuerte
  const safeDeposit = reportedCash - rolloverAmount;

  if (safeDeposit < 0) {
    throw new Error("No puedes dejar de base más dinero del que entregó el cobrador.");
  }

  // 3. Actualizamos el Cierre a APROBADO de forma inmutable
  await prisma.workdayClosure.update({
    where: { id: cierreId },
    data: {
      status: "APPROVED",
      rolloverAmount: rolloverAmount,
      safeDeposit: safeDeposit,
      approvedAt: new Date(),
      approvedById: admin.id // Guardamos qué admin autorizó esto (Auditoría estricta)
    }
  });

  console.log(`✅ Cierre Aprobado. A la Caja Fuerte van: $${safeDeposit} | Para mañana: $${rolloverAmount}`);

  // Recargamos el dashboard para que desaparezca de la lista de pendientes
  revalidatePath("/dashboard");
}

// src/app/dashboard/actions.ts

export async function resolverAlerta(formData: FormData) {
  "use server";
  const panicId = formData.get("panicId") as string;

  await prisma.panicAlert.update({
    where: { id: panicId },
    data: { 
      status: "RESOLVED",
      // Opcional: podrías guardar quién lo resolvió o a qué hora
    }
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard");
}