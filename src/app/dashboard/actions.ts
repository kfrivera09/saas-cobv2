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
    }
  });

  revalidatePath("/dashboard");
}

//crud para trabajador

export async function eliminarCobrador(formData: FormData) {
  const id = formData.get("id") as string;

  const jornadasAbiertas = await prisma.workday.findFirst({
    where: { workerId: id, status: "OPEN" }
  });
  if (jornadasAbiertas) {
    throw new Error("No puedes eliminar un cobrador con jornada abierta. Ciérrala primero.");
  }
  
  await prisma.user.update({
    where: { id },
    data: { active: false }
  });

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
  const cedula = formData.get("cedula") as string; // Nuevo campo
  const celular = formData.get("celular") as string; // Nuevo campo
  const routeId = formData.get("routeId") as string;
  const lat = parseFloat(formData.get("lat") as string);
  const lng = parseFloat(formData.get("lng") as string);

  await prisma.client.create({
    data: {
      name,
      phone,
      address,
      cedula, // Nuevo campo
      celular, // Nuevo campo
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
    await prisma.client.update({
      where: { id },
      data: { active: false }
    });
    
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

  if (!amount || amount <= 0) return;

  const prestamo = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!prestamo) return;
  if (prestamo.balance < amount) {
    throw new Error(`El saldo pendiente ($${prestamo.balance.toFixed(0)}) es menor al monto ingresado ($${amount.toFixed(0)}).`);
  }

  const cuota = await prisma.installment.findUnique({ where: { id: installmentId } });
  if (!cuota) return;

  const nuevoTotalPagado = cuota.amountPaid + amount;
  const nuevoEstado = nuevoTotalPagado >= cuota.amountDue ? "PAID" : "PARTIAL";

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

  await prisma.$transaction([
    prisma.installment.update({
      where: { id: installmentId },
      data: { status: nuevoEstado, amountPaid: nuevoTotalPagado, paidAt: new Date() }
    }),
    prisma.loan.update({
      where: { id: loanId },
      data: { balance: { decrement: amount } }
    }),
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

export async function editarCobrador(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  const duplicado = await prisma.user.findUnique({ where: { email } });
  if (duplicado && duplicado.id !== id) {
    throw new Error("El correo electrónico ya está en uso por otro usuario.");
  }

  await prisma.user.update({
    where: { id },
    data: { name, email }
  });

  revalidatePath("/dashboard/cobradores");
  redirect("/dashboard/cobradores");
}

export async function crearCobrador(formData: FormData) {
  "use server";
  
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  
  if (!admin || !admin.tenantId) {
    throw new Error("No autorizado");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Verificamos que el correo no esté registrado previamente
  const usuarioExistente = await prisma.user.findUnique({
    where: { email }
  });

  if (usuarioExistente) {
    throw new Error("El correo electrónico ya está en uso.");
  }

  // Encriptamos la contraseña con el bcrypt que ya tienes importado arriba
  const hashedPassword = await bcrypt.hash(password, 10);

  // Creamos el usuario asignándole el rol WORKER
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "WORKER",
      tenantId: admin.tenantId,
    }
  });

  revalidatePath("/dashboard/cobradores");
  redirect("/dashboard/cobradores");
}

export async function editarRuta(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const workerId = formData.get("workerId") as string || null;

  await prisma.route.update({
    where: { id },
    data: { 
      name, 
      workerId: workerId === "none" ? null : workerId 
    }
  });

  revalidatePath("/dashboard/rutas");
  redirect("/dashboard/rutas");
}

export async function editarCliente(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const cedula = formData.get("cedula") as string;
  const celular = formData.get("celular") as string;
  const routeId = formData.get("routeId") as string;

  await prisma.client.update({
    where: { id },
    data: { name, phone, address, cedula, celular, routeId }
  });

  revalidatePath("/dashboard/clientes");
  redirect("/dashboard/clientes");
}

export async function cambiarClave(formData: FormData) {
  const session = await getServerSession();
  const usuario = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!usuario) throw new Error("No autorizado");

  const claveAnterior = formData.get("claveAnterior") as string;
  const claveNueva = formData.get("claveNueva") as string;
  const repetirClave = formData.get("repetirClave") as string;

  const coincide = await bcrypt.compare(claveAnterior, usuario.password);
  if (!coincide) throw new Error("La contraseña anterior no es correcta.");

  if (claveNueva.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
  if (claveNueva !== repetirClave) throw new Error("Las contraseñas nuevas no coinciden.");

  const hashedPassword = await bcrypt.hash(claveNueva, 10);
  await prisma.user.update({
    where: { id: usuario.id },
    data: { password: hashedPassword }
  });

  redirect("/dashboard/cambio-clave?exito=1");
}

export async function cancelarTurnoAdmin() {
  "use server";
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!admin) {
    throw new Error("No autorizado para realizar esta acción.");
  }

  const jornadaAbierta = await prisma.workday.findFirst({
    where: { workerId: admin.id, status: "OPEN" },
  });

  if (jornadaAbierta) {
    await prisma.workday.update({
      where: { id: jornadaAbierta.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    console.log(`✅ Turno del administrador ${admin.name} cancelado.`);
  } else {
    console.log("ℹ️ No se encontró ningún turno abierto para el administrador.");
  }
  revalidatePath("/dashboard");
}
