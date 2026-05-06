"use server";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * 1. REGISTRAR PAGO (¡ESTA ES LA QUE TE FALTABA!)
 * Esta función es la que hace que el dinero aparezca en el Dashboard y en la Caja.
 */
export async function registrarPagoCuota(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const installmentId = formData.get("installmentId") as string;
  const loanId = formData.get("loanId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) return;

  // Buscamos la jornada abierta para amarrar el cobro
  const jornada = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornada) throw new Error("Debes iniciar jornada para cobrar");

  // Usamos una transacción para asegurar que se guarde todo o nada
  await prisma.$transaction([
    // A. Actualizamos la cuota
    prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        amountPaid: amount,
        paidAt: new Date()
      }
    }),
    // B. CREAMOS LA COLECCIÓN (Esto es lo que suma en el Dashboard)
    prisma.collection.create({
      data: {
        workdayId: jornada.id,
        loanId: loanId,
        amount: amount,
        tenantId: usuario.tenantId!
      }
    })
  ]);

  // Forzamos la actualización de las pantallas
  revalidatePath("/cobrador/caja");
  revalidatePath("/dashboard");
}

/**
 * 2. REGISTRAR UBICACIÓN (GPS)
 */
export async function registrarUbicacion(lat: number, lng: number) {
  console.log("🚀 LLEGADA AL SERVIDOR:", { lat, lng });

  const session = await getServerSession();
  if (!session?.user?.email) {
    console.log("❌ Sin sesión");
    return;
  }

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) {
    console.log("❌ Usuario no encontrado");
    return;
  }

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (jornadaActiva) {
    await prisma.location.create({
      data: {
        workdayId: jornadaActiva.id,
        lat: lat,
        lng: lng,
      }
    });
    console.log(`✅ Ubicación guardada en DB para ${usuario.name}`);
  } else {
    // ESTA ES LA CAUSA MÁS PROBABLE
    console.log(`⚠️ No se guardó: ${usuario.name} NO tiene una jornada OPEN.`);
  }
}


export async function iniciarJornada(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario || !usuario.tenantId) return;

  const jornadaExistente = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (jornadaExistente) return;

  const baseAmount = parseFloat(formData.get("baseAmount") as string) || 0;

  await prisma.workday.create({
    data: {
      workerId: usuario.id,
      tenantId: usuario.tenantId,
      baseAmount: baseAmount,
      status: "OPEN"
    }
  });

  revalidatePath("/cobrador");
  revalidatePath("/dashboard");
}

/**
 * 4. REGISTRAR GASTO
 */
export async function registrarGasto(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;

  if (isNaN(amount) || amount <= 0 || !description) return;

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) return;

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornadaActiva) return;

  await prisma.expense.create({
    data: {
      workdayId: jornadaActiva.id,
      amount: amount,
      description: description
    }
  });

  revalidatePath("/cobrador/caja");
  revalidatePath("/dashboard");
}

/**
 * 5. CERRAR JORNADA (BLIND DROP)
 */
export async function cerrarJornadaConBlindDrop(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const reportedCash = parseFloat(formData.get("reportedCash") as string);
  if (isNaN(reportedCash)) return;

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) return;

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornadaActiva) return;

  // Cálculo del efectivo teórico
  const cobros = await prisma.collection.aggregate({
    where: { workdayId: jornadaActiva.id },
    _sum: { amount: true }
  });
  const totalCobrado = cobros._sum?.amount || 0;

  const gastos = await prisma.expense.aggregate({
    where: { workdayId: jornadaActiva.id },
    _sum: { amount: true }
  });
  const totalGastos = gastos._sum?.amount || 0;

  const calculatedCash = (jornadaActiva.baseAmount + totalCobrado) - totalGastos;
  const difference = reportedCash - calculatedCash;

  // Registro del cierre
  await prisma.workdayClosure.create({
    data: {
      workdayId: jornadaActiva.id,
      calculatedCash,
      reportedCash,
      difference,
      status: "PENDING_APPROVAL"
    }
  });

  // Marcar jornada como cerrada
  await prisma.workday.update({
    where: { id: jornadaActiva.id },
    data: { status: "CLOSED", closedAt: new Date() }
  });

  revalidatePath("/dashboard");
  redirect("/cobrador");
}
export async function dispararPanico(lat: number, lng: number) {
  const session = await getServerSession();
  if (!session?.user?.email) return;

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) return;

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornadaActiva) return;

  await prisma.panicAlert.create({
    data: {
      workdayId: jornadaActiva.id,
      lat: lat,
      lng: lng,
      status: "PENDING"
    }
  });

  revalidatePath("/dashboard");
}