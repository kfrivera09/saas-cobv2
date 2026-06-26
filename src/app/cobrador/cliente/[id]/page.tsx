import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabase } from "../../../../lib/supabase";
import FormularioPago from "./FormularioPago";

export default async function DetalleClienteCobrador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();

  const cliente = await prisma.client.findUnique({
    where: { id },
    include: {
      loans: {
        where: { status: "ACTIVE" },
        include: {
          installments: {
            where: { status: { in: ["PENDING", "PARTIAL"] } },
            orderBy: { dueDate: "asc" },
            take: 1
          }
        }
      }
    }
  });

  if (!cliente) redirect("/cobrador/ruta");

  const prestamo = cliente.loans[0];
  const cuotaHoy = prestamo?.installments[0];

  if (!prestamo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/cobrador/ruta" className="text-2xl text-gray-400">←</Link>
          <h2 className="text-xl font-bold text-gray-800 truncate">{cliente.name}</h2>
        </div>
        <div className="bg-white p-10 rounded-3xl border border-gray-100 text-center space-y-4">
          <span className="text-5xl">📭</span>
          <h3 className="text-lg font-bold text-gray-800">Sin Préstamos Activos</h3>
          <p className="text-sm text-gray-500">Este cliente no tiene préstamos activos en este momento.</p>
          <Link href="/cobrador/ruta" className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-sm">
            Volver a mi ruta
          </Link>
        </div>
      </div>
    );
  }

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const yaPagoHoy = await prisma.collection.findFirst({
    where: {
      loanId: prestamo?.id,
      createdAt: { gte: inicioHoy }
    }
  });

  async function registrarPago(formData: FormData) {
    "use server";

    const monto = parseFloat(formData.get("amount") as string);
    const loanId = formData.get("loanId") as string;
    const installmentId = formData.get("installmentId") as string;
    const photoFile = formData.get("photo") as File;

    if (!monto || monto <= 0 || !loanId) return;

    const session = await getServerSession();
    if (!session?.user?.email) {
      redirect("/auth/login");
    }

    // --- 🚀 NUEVA LÓGICA: BLOQUEO DE COBRO DUPLICADO EL MISMO DÍA ---
    // 1. Definimos el inicio del día de hoy (00:00:00) para la búsqueda [cite: 663]
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    // 2. Buscamos si ya existe un registro en 'Collection' para este préstamo hoy [cite: 662, 663]
    const cobroExistente = await prisma.collection.findFirst({
      where: {
        loanId: loanId,
        createdAt: {
          gte: inicioHoy // Solo cobros realizados desde que empezó el día de hoy
        }
      }
    });

    // 3. Si ya existe un registro, detenemos la operación inmediatamente [cite: 12]
    if (cobroExistente) {
      console.log("🚫 BLOQUEO: Este cliente ya realizó un pago el día de hoy.");
      // Opcional: podrías retornar un objeto de error para mostrar en la interfaz
      return;
    }
    // -----------------------------------------------------------------

    const usuario = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    const jornada = await prisma.workday.findFirst({
      where: { workerId: usuario?.id, status: "OPEN" }
    });

    if (!jornada) {
      throw new Error("Debes tener una jornada abierta para registrar cobros.");
    }

    const cuota = await prisma.installment.findUnique({ where: { id: installmentId } });
    if (!cuota) return;

    const prestamo = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!prestamo) return;
    if (prestamo.balance < monto) {
      throw new Error(`El saldo pendiente ($${prestamo.balance.toFixed(0)}) es menor al monto ingresado ($${monto.toFixed(0)}).`);
    }

    // LÓGICA DE SUBIDA A SUPABASE STORAGE [cite: 680]
    let photoUrl = null;
    if (photoFile && photoFile.size > 0) {
      const fileName = `cobro-${Date.now()}-${photoFile.name.replace(/\s+/g, '_')}`;
      const { data } = await supabase.storage.from('evidencias').upload(`cobros/${fileName}`, photoFile);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('evidencias').getPublicUrl(`cobros/${fileName}`);
        photoUrl = publicUrl;
      }
    }

    const nuevoTotalPagado = cuota.amountPaid + monto;
    const nuevoEstado = nuevoTotalPagado >= cuota.amountDue ? "PAID" : "PARTIAL";

    // TRANSACCIÓN ATÓMICA [cite: 673, 675]
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
        data: { balance: { decrement: monto } }
      }),
      prisma.collection.create({
        data: {
          workdayId: jornada.id,
          loanId: loanId,
          amount: monto,
          evidencePhoto: photoUrl // URL de la foto en la nube [cite: 680]
        }
      })
    ]);

    revalidatePath("/cobrador/caja");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/monitoreo");

    redirect("/cobrador/ruta");
  }

  async function registrarNoPago(formData: FormData) {
    "use server";
    const loanId = formData.get("loanId") as string;
    const motivo = formData.get("motivo") as string;

    // Aquí podrías guardar la visita en una nueva tabla 'VisitLog' 
    // o simplemente añadir un comentario al préstamo.
    console.log(`Visita fallida al préstamo ${loanId}. Motivo: ${motivo}`);

    // Por ahora, solo refrescamos para mostrar que se gestionó
    revalidatePath("/cobrador/ruta");
    redirect("/cobrador/ruta");
  }

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex items-center gap-4">
        <Link href="/cobrador/ruta" className="text-2xl text-gray-400">←</Link>
        <h2 className="text-xl font-bold text-gray-800 truncate">{cliente.name}</h2>
      </div>

      {/* TARJETA DE ESTADO FINANCIERO [cite: 536] */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-400 font-bold uppercase">Saldo Pendiente</p>
        <p className="text-4xl font-black text-red-500 mt-1">${prestamo?.balance.toFixed(0)}</p>
        <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Cuota de hoy</p>
            <p className="font-bold text-gray-700">${cuotaHoy?.amountDue.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Fecha</p>
            <p className="font-bold text-gray-700">
              {cuotaHoy?.dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>
      </div>

      {/* 🏁 LÓGICA DE DECISIÓN: ¿Ya pagó hoy o mostramos formularios? */}
      {yaPagoHoy ? (
        /* ESTADO: YA PAGÓ (Tarjeta de éxito) [cite: 681] */
        <div className="bg-green-50 border-2 border-green-200 p-10 rounded-[2.5rem] text-center space-y-4 shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">✅</div>
          <h3 className="text-xl font-black text-green-800">¡Cuota Pagada!</h3>
          <p className="text-sm text-green-600 font-medium italic">
            Registrado a las {new Date(yaPagoHoy.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <Link
            href="/cobrador/ruta"
            className="block w-full bg-green-600 text-white font-bold py-4 rounded-2xl text-xs uppercase"
          >
            Volver a mi ruta
          </Link>
        </div>
      ) : (
        /* ESTADO: PENDIENTE (Mostramos Formulario de Pago y Reporte Fallido) */
        <>
          {/* Componente Client que maneja el cobro, la foto y los errores temporales */}
          <FormularioPago cuotaHoy={cuotaHoy} loanId={prestamo.id} />

          {/* REPORTE DE VISITA FALLIDA (No hubo pago) [cite: 11] */}
          <div className="pt-6 border-t border-dashed border-gray-200 mt-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 text-center tracking-widest">¿No hubo pago hoy? ❌</h4>
            <form action={registrarNoPago} className="flex gap-2">
              <input type="hidden" name="loanId" value={prestamo?.id} />
              <select
                name="motivo"
                className="flex-1 bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="NO_ESTABA">No estaba el cliente</option>
                <option value="LOCAL_CERRADO">Local comercial cerrado</option>
                <option value="PIDE_PLAZO">El cliente pidió plazo</option>
                <option value="YA_PAGO">Dice que ya pagó</option>
              </select>
              <button
                type="submit"
                className="bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all"
              >
                Reportar
              </button>
            </form>
          </div>
        </>
      )}

      {/* INFORMACIÓN DE UBICACIÓN FÍSICA [cite: 650, 660] */}
      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4">
        <p className="text-xs text-blue-700 text-center">
          <b>Dirección registrada:</b> {cliente.address}
        </p>
        {cliente.lat && (
          <a
            href={`https://www.google.com/maps?q=${cliente.lat},${cliente.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-[10px] text-blue-500 font-black uppercase mt-2 underline"
          >
            Ver en Google Maps 📍
          </a>
        )}
      </div>
    </div>
  );
}