"use server";

import { prisma } from "../../lib/prisma"; // Ajusta la ruta a tu prisma
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

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

//crud para trabajador

export async function eliminarCobrador(formData: FormData) {
  const id = formData.get("id") as string;
  
  await prisma.user.delete({ where: { id } });

  revalidatePath("/dashboard/cobradores");
}

//crud ruta

export async function eliminarRuta(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;

  try {
    // 👈 CAMBIO CLAVE: Borrado Lógico en lugar de físico
    // Esto desactiva la ruta sin romper los vínculos con préstamos antiguos
    await prisma.route.update({
      where: { id },
      data: { active: false }
    });

    revalidatePath("/dashboard/rutas");
  } catch (error) {
    console.error("Error al desactivar ruta:", error);
    throw new Error("No se pudo ocultar la ruta. Verifique la conexión a la base de datos.");
  }
}

export async function crearCliente(formData: FormData) {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) throw new Error("No autorizado");

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const routeId = formData.get("routeId") as string;
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);

  await prisma.client.create({
    data: {
      name,
      phone,
      address,
      routeId,
      tenantId: admin.tenantId,
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
    },
  });

  revalidatePath("/dashboard/clientes");
  redirect("/dashboard/clientes");
}

export async function eliminarCliente(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;

  try {
    // En lugar de borrar, cambiamos el estado a false
    await prisma.client.update({
      where: { id },
      data: { active: false }
    });
    
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/clientes");
  } catch (error) {
    console.error("Error al desactivar cliente:", error);
    throw new Error("No se pudo ocultar el cliente.");
  }
}

export async function anularPrestamo(formData: FormData) {
  const id = formData.get("id") as string;

  try {
    await prisma.loan.update({
      where: { id },
      data: { 
        status: "CANCELLED",
        balance: 0 // Al anularlo, el saldo pendiente pasa a ser cero
      }
    });

    //marca todas sus cuotas PENDING como CANCELLED
    await prisma.installment.updateMany({
      where: { loanId: id, status: "PENDING" },
      data: { status: "CANCELLED" }
    });

    revalidatePath("/dashboard/prestamos");
    revalidatePath("/dashboard/clientes"); // Para actualizar el estado de mora
  } catch (error) {
    console.error("Error al anular préstamo:", error);
    throw new Error("No se pudo anular el préstamo.");
  }
}

export async function crearPrestamoAvanzado(formData: FormData) {
  "use server";
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) return;

  const clientId = formData.get("clientId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const interest = parseFloat(formData.get("interest") as string);
  const numInstallments = parseInt(formData.get("numInstallments") as string);
  const frequency = formData.get("frequency") as string; // "DAILY" | "WEEKLY"

  // 1. Cálculos base
  const totalAmount = amount + (amount * (interest / 100));
  const installmentAmount = totalAmount / numInstallments;
  
  // 2. Creación del Préstamo (Loan)
  const nuevoPrestamo = await prisma.loan.create({
    data: {
      tenantId: admin.tenantId,
      clientId: clientId,
      amount: amount,
      interest: interest,
      totalAmount: totalAmount,
      balance: totalAmount,
      frequency: frequency,
      status: "ACTIVE"
    }
  });

  // 3. Generación Automática de Cuotas (Installments)
  const cuotas = [];
  let fechaActual = new Date();

  for (let i = 1; i <= numInstallments; i++) {
    // Lógica de fechas según frecuencia
    if (frequency === "DAILY") {
      fechaActual.setDate(fechaActual.getDate() + 1);
      // Inteligencia: Si es Domingo, saltar al Lunes
      if (fechaActual.getDay() === 0) fechaActual.setDate(fechaActual.getDate() + 1);
    } else {
      fechaActual.setDate(fechaActual.getDate() + 7);
    }

    cuotas.push({
      loanId: nuevoPrestamo.id,
      amountDue: installmentAmount,
      dueDate: new Date(fechaActual),
      status: "PENDING"
    });
  }

  // Guardado masivo de cuotas
  await prisma.installment.createMany({ data: cuotas });

  revalidatePath("/dashboard/prestamos");
  redirect("/dashboard/prestamos");
}

export async function registrarPagoManualAdmin(formData: FormData) {
  "use server";
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) return;

  const installmentId = formData.get("installmentId") as string;
  const loanId = formData.get("loanId") as string;
  const amount = parseFloat(formData.get("amount") as string);

  // 1. Buscamos o creamos la "Jornada de Oficina" del Admin
  let jornadaOficina = await prisma.workday.findFirst({
    where: { workerId: admin.id, status: "OPEN" }
  });

  if (!jornadaOficina) {
    jornadaOficina = await prisma.workday.create({
      data: {
        workerId: admin.id,
        tenantId: admin.tenantId,
        baseAmount: 0,
        status: "OPEN"
      }
    });
  }

  // 2. Registramos el pago en bloque (Transacción)
  await prisma.$transaction([
    // A. Marcamos cuota pagada
    prisma.installment.update({
      where: { id: installmentId },
      data: { status: "PAID", amountPaid: amount, paidAt: new Date() }
    }),
    // B. Restamos al saldo del préstamo
    prisma.loan.update({
      where: { id: loanId },
      data: { balance: { decrement: amount } }
    }),
    // C. CREAMOS EL REGISTRO DE COLECCIÓN (Aquí se contabiliza)
    prisma.collection.create({
      data: {
        workdayId: jornadaOficina.id,
        amount: amount,
        loanId: loanId
      }
    })
  ]);

  revalidatePath(`/dashboard/prestamos/${loanId}`);
  revalidatePath("/dashboard");
}

export async function cerrarCajaOficina() {
  "use server";
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) return;

  const jornada = await prisma.workday.findFirst({
    where: { workerId: admin.id, status: "OPEN" },
    include: { collections: true }
  });

  if (!jornada) return;

  const totalRecaudado = jornada.collections.reduce((acc, c) => acc + c.amount, 0);

  // Creamos el cierre y aprobamos de inmediato (porque tú eres el dueño)
  await prisma.workdayClosure.create({
    data: {
      workdayId: jornada.id,
      reportedCash: totalRecaudado,
      calculatedCash: totalRecaudado,
      difference: 0,
      status: "APPROVED", // Sube directo a caja fuerte
      safeDeposit: totalRecaudado,
      approvedAt: new Date(),
      approvedById: admin.id
    }
  });

  await prisma.workday.update({
    where: { id: jornada.id },
    data: { status: "CLOSED", closedAt: new Date() }
  });

  revalidatePath("/dashboard");
}