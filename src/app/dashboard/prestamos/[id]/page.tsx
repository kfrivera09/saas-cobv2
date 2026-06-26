import { prisma } from "../../../../lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function HistorialPrestamoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const prestamo = await prisma.loan.findUnique({
    where: { id },
    include: {
      client: true,
      installments: {
        orderBy: { dueDate: "asc" }
      }
    }
  });

  if (!prestamo) notFound();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Cálculos solicitados
  const cuotasMora = prestamo.installments.filter(i => new Date(i.dueDate) < hoy && i.status !== "PAID");
  const moraALaFecha = cuotasMora.reduce((acc, i) => acc + (i.amountDue - i.amountPaid), 0);
  const cuotasPendientes = prestamo.installments.filter(i => i.status !== "PAID");
  const fechaFinal = prestamo.installments[prestamo.installments.length - 1]?.dueDate;
  const valorCuota = prestamo.installments[0]?.amountDue || 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Historial de Préstamo</h2>
        <Link href="/dashboard/clientes" className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all">
          ← Volver
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* INFORMACIÓN DEL CLIENTE */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Datos del Cliente</p>
          <div>
            <h3 className="text-xl font-black text-slate-800">{prestamo.client.name}</h3>
            <p className="text-xs text-slate-500 font-medium">{prestamo.client.address}</p>
          </div>
          <div className="pt-4 border-t border-slate-50 space-y-2">
            <p className="text-xs font-bold text-slate-600">🪪 Cédula: <span className="text-slate-400 font-medium">{prestamo.client.cedula || 'No registrada'}</span></p>
            <p className="text-xs font-bold text-slate-600">📱 Celular: <span className="text-slate-400 font-medium">{prestamo.client.celular || 'No registrado'}</span></p>
          </div>
        </div>

        {/* RESUMEN FINANCIERO */}
        <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Valor Préstamo</p>
            <p className="text-2xl font-black">${prestamo.amount.toFixed(0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Valor Cuota</p>
            <p className="text-2xl font-black">${valorCuota.toFixed(0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Forma de Pago</p>
            <p className="text-lg font-black text-blue-400">{prestamo.frequency === 'DAILY' ? 'DIARIO' : 'SEMANAL'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Pendiente</p>
            <p className="text-2xl font-black text-red-400">${prestamo.balance.toFixed(0)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Fecha Inicial</p>
            <p className="text-sm font-bold">{new Date(prestamo.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Fecha Finalización</p>
            <p className="text-sm font-bold">{fechaFinal ? new Date(fechaFinal).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Cuotas en Mora</p>
            <p className="text-sm font-bold text-red-400">{cuotasMora.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase">Mora a la Fecha</p>
            <p className="text-sm font-bold text-red-400">${moraALaFecha.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* TABLA DE CUOTAS PENDIENTES */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Plan de Pagos / Cuotas Pendientes ({cuotasPendientes.length})</h4>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
              <th className="p-4">Vencimiento</th>
              <th className="p-4 text-right">Valor Cuota</th>
              <th className="p-4 text-right">Abonado</th>
              <th className="p-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prestamo.installments.map((cuota) => (
              <tr key={cuota.id} className="text-xs font-bold text-slate-600">
                <td className="p-4">{new Date(cuota.dueDate).toLocaleDateString()}</td>
                <td className="p-4 text-right text-slate-800">${cuota.amountDue.toFixed(0)}</td>
                <td className="p-4 text-right text-green-600">${cuota.amountPaid.toFixed(0)}</td>
                <td className="p-4 text-center">
                  <span className={`text-[9px] px-2 py-1 rounded-lg uppercase ${cuota.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {cuota.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}