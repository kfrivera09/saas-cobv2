"use server";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { supabase } from "../../lib/supabase"; 
import bcrypt from "bcryptjs";

export async function registrarPagoCuota(prevState: any, formData: FormData) {
  "use server";
  const session = await getServerSession();
  if (!session?.user?.email) return { error: "Sesión expirada" };

  const installmentId = formData.get("installmentId") as string;
  const loanId = formData.get("loanId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const photoFile = formData.get("photo") as File;

  if (!amount || amount <= 0 || !loanId || !installmentId) {
    return { error: "Datos inválidos." };
  }

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const cobroExistente = await prisma.collection.findFirst({
    where: { loanId, createdAt: { gte: inicioHoy } }
  });

  if (cobroExistente) {
    return { error: "Este cliente ya realizó un pago hoy." };
  }

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) return { error: "Usuario no encontrado." };

  const jornada = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornada) {
    return { error: "Debes tener una jornada abierta para registrar cobros." };
  }

  const cuota = await prisma.installment.findUnique({ where: { id: installmentId } });
  if (!cuota) return { error: "Cuota no encontrada." };

  const prestamo = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!prestamo) return { error: "Préstamo no encontrado." };
  if (prestamo.balance < amount) {
    return { error: `El saldo pendiente ($${prestamo.balance.toFixed(0)}) es menor al monto ingresado ($${amount.toFixed(0)}).` };
  }

  let photoUrl = null;
  if (photoFile && photoFile.size > 0) {
    const fileName = `cobro-${Date.now()}-${photoFile.name.replace(/\s+/g, '_')}`;
    const { data } = await supabase.storage.from('evidencias').upload(`cobros/${fileName}`, photoFile);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(`cobros/${fileName}`);
      photoUrl = publicUrl;
    }
  }

  const nuevoTotalPagado = cuota.amountPaid + amount;
  const nuevoEstado = nuevoTotalPagado >= cuota.amountDue ? "PAID" : "PARTIAL";

  try {
    await prisma.$transaction([
      prisma.installment.update({
        where: { id: installmentId },
        data: {
          amountPaid: nuevoTotalPagado,
          status: nuevoEstado,
          paidAt: new Date()
        }
      }),
      prisma.loan.update({
        where: { id: loanId },
        data: { balance: { decrement: amount } }
      }),
      prisma.collection.create({
        data: {
          workdayId: jornada.id,
          loanId: loanId,
          amount: amount,
          evidencePhoto: photoUrl
        }
      })
    ]);
    revalidatePath("/cobrador/caja");
    revalidatePath("/dashboard");
  } catch (e) {
    return { error: "Error al guardar el pago" };
  }

  redirect("/cobrador/ruta");
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
  if (!session?.user?.email) {
    throw new Error("Sesión expirada.");
  }

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario || !usuario.tenantId) {
    throw new Error("Usuario no encontrado.");
  }

  const jornadaExistente = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (jornadaExistente) {
    throw new Error("Ya tienes una jornada abierta.");
  }

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
  if (!session?.user?.email) {
    throw new Error("Sesión expirada.");
  }

  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  
  const photoFile = formData.get("photo") as File;

  if (isNaN(amount) || amount <= 0 || !description) {
    throw new Error("Monto inválido o descripción vacía.");
  }

  let photoUrl = null;

  // 🚀 NUEVA LÓGICA: Subida a Supabase Storage (en lugar de Base64)
  if (photoFile && photoFile.size > 0) {
    // Generamos un nombre de archivo único para evitar colisiones
    const fileName = `${Date.now()}-${photoFile.name.replace(/\s+/g, '_')}`;
    
    // Subimos el archivo al bucket 'evidencias' dentro de la carpeta 'gastos'
    const { data, error } = await supabase.storage
      .from('evidencias')
      .upload(`gastos/${fileName}`, photoFile);

    if (data) {
      // Obtenemos la URL pública para guardarla en la base de datos [cite: 680]
      const { data: { publicUrl } } = supabase.storage
        .from('evidencias')
        .getPublicUrl(`gastos/${fileName}`);
      
      photoUrl = publicUrl;
    } else {
      console.error("Error al subir la imagen:", error?.message);
    }
  }

  const usuario = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!usuario) {
    throw new Error("Usuario no encontrado.");
  }

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornadaActiva) {
    throw new Error("No tienes una jornada abierta.");
  }

  // 3. Guardamos el gasto incluyendo la URL de Supabase (más ligero que el Base64) [cite: 665, 680]
  await prisma.expense.create({
    data: {
      workdayId: jornadaActiva.id,
      amount: amount,
      description: description,
      evidencePhoto: photoUrl // Ahora guarda un link corto: "https://..."
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

  const photoFile = formData.get("photo") as File;

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

  let photoUrl = null;
  if (photoFile && photoFile.size > 0) {
    const fileName = `cierre-${Date.now()}-${photoFile.name.replace(/\s+/g, '_')}`;
    const { data } = await supabase.storage.from('evidencias').upload(`cierres/${fileName}`, photoFile);
    if (data) {
      const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(`cierres/${fileName}`);
      photoUrl = publicUrl;
    }
  }

  await prisma.$transaction([
    prisma.workdayClosure.create({
      data: {
        workdayId: jornadaActiva.id,
        calculatedCash,
        reportedCash,
        difference,
        evidencePhoto: photoUrl,
        status: "PENDING_APPROVAL"
      }
    }),
    prisma.workday.update({
      where: { id: jornadaActiva.id },
      data: { status: "CLOSED", closedAt: new Date() }
    })
  ]);

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
