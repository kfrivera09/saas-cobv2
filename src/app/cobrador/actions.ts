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

  // 1. VALIDACIÓN DE BLOQUEO DIARIO [cite: 12]
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const cobroExistente = await prisma.collection.findFirst({
    where: { loanId, createdAt: { gte: inicioHoy } }
  });

  if (cobroExistente) {
    return { error: "⚠️ Este cliente ya realizó un pago hoy." };
  }

  // ... (resto de tu lógica de transacción actual)
  try {
    await prisma.$transaction([ /* ... tus updates y create collection ... */ ]);
    revalidatePath("/cobrador/caja");
    revalidatePath("/dashboard");
  } catch (e) {
    return { error: "Error al guardar el pago" };
  }

  // Redirigimos solo si todo salió bien
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
  
  // Capturamos el archivo físico del formulario [cite: 679]
  const photoFile = formData.get("photo") as File;

  if (isNaN(amount) || amount <= 0 || !description) return;

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

  if (!usuario) return;

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  if (!jornadaActiva) return;

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
