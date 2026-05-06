import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

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

  async function registrarPago(formData: FormData) {
    "use server";
    const monto = parseFloat(formData.get("amount") as string);
    const loanId = formData.get("loanId") as string;
    const installmentId = formData.get("installmentId") as string;

    const session = await getServerSession();
    const usuario = await prisma.user.findUnique({
      where: { email: session?.user?.email! }
    });

    if (!usuario || !monto || !loanId) return;

    const jornada = await prisma.workday.findFirst({
      where: { workerId: usuario.id, status: "OPEN" }
    });

    if (!jornada) {
      throw new Error("No tienes una jornada abierta.");
    }

    await prisma.$transaction([
      // 1. Actualizar cuota
      prisma.installment.update({
        where: { id: installmentId },
        data: { 
          amountPaid: { increment: monto },
          status: "PAID" 
        }
      }),
      // 2. Restar al balance del préstamo
      prisma.loan.update({
        where: { id: loanId },
        data: { balance: { decrement: monto } }
      }),
      // 3. CREAR LA COLECCIÓN (Corregido: Sin tenantId)
      prisma.collection.create({
        data: {
          workdayId: jornada.id,
          loanId: loanId,
          amount: monto
          // Se eliminó tenantId porque no existe en tu modelo Collection
        }
      })
    ]);

    revalidatePath("/cobrador/caja");
    revalidatePath("/dashboard");
    redirect("/cobrador/ruta");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cobrador/ruta" className="text-2xl text-gray-400">←</Link>
        <h2 className="text-xl font-bold text-gray-800 truncate">{cliente.name}</h2>
      </div>

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

      <form action={registrarPago} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-800 text-center">Registrar Cobro</h3>
        <input type="hidden" name="loanId" value={prestamo?.id} />
        <input type="hidden" name="installmentId" value={cuotaHoy?.id} />
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Monto Recibido ($)</label>
          <input 
            type="number" 
            name="amount" 
            defaultValue={cuotaHoy?.amountDue}
            className="w-full text-3xl font-black text-center bg-gray-50 rounded-2xl p-4 border-none outline-none"
            required
          />
        </div>
        <button type="submit" className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
          CONFIRMAR PAGO ✅
        </button>
      </form>
    </div>
  );
}