import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registrarPagoManualAdmin } from "../../actions"; // Importamos la acción de cobro manual

export default async function DetallePrestamoPage({ params }: { params: Promise<{ id: string }> }) {
  
  // 1. Manejo asíncrono de parámetros (Obligatorio en Next.js moderno) [cite: 224]
  const { id } = await params;

  // 2. Consulta profunda con cliente e historial de cuotas
  const prestamo = await prisma.loan.findUnique({
    where: { id: id },
    include: {
      client: true, 
      installments: { 
        orderBy: { dueDate: 'asc' } 
      }
    }
  });

  if (!prestamo) redirect("/dashboard/prestamos");

  return (
    <div className="space-y-8 pb-10">
      {/* --- CABECERA --- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Crédito</h2>
          <p className="text-slate-500 font-medium">Cliente: <span className="text-blue-600 font-bold">{prestamo.client.name}</span></p>
        </div>
        <Link 
          href="/dashboard/prestamos" 
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all"
        >
          ← Volver
        </Link>
      </div>

      {/* --- TARJETAS DE RESUMEN FINANCIERO (Diseño Premium) --- [cite: 436] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total a Pagar</p>
          <p className="text-3xl font-black text-slate-800 mt-1">${recapitular(prestamo.totalAmount)}</p>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Saldo Pendiente</p>
            <p className="text-3xl font-black text-white mt-1">${recapitular(prestamo.balance)}</p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</p>
          <div className="mt-2">
            {prestamo.status === "ACTIVE" ? (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Activo</span>
            ) : (
              <span className="bg-green-100 text-green-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Pagado ✅</span>
            )}
          </div>
        </div>
      </div>

      {/* --- TABLA DE CONTROL DE CUOTAS --- [cite: 660] */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-tighter">
            Calendario de Pagos ({prestamo.installments.length} cuotas)
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic">Historial Inmutable de Auditoría</p>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/30">
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">No.</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Cuota</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Abonado</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción Manual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prestamo.installments.map((cuota, index) => (
              <tr key={cuota.id} className={`hover:bg-slate-50/50 transition-colors ${cuota.status === 'PAID' ? 'bg-green-50/10' : ''}`}>
                <td className="p-5 text-sm font-bold text-slate-300">{index + 1}</td>
                <td className="p-5">
                  <p className="text-sm font-bold text-slate-700">
                    {new Date(cuota.dueDate).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {cuota.paidAt && (
                    <p className="text-[9px] text-green-600 font-bold uppercase mt-1">Pagado el {new Date(cuota.paidAt).toLocaleDateString()}</p>
                  )}
                </td>
                <td className="p-5 text-right font-black text-slate-600">${recapitular(cuota.amountDue)}</td>
                <td className="p-5 text-right font-black text-green-600">${recapitular(cuota.amountPaid)}</td>
                <td className="p-5 text-center">
                  {cuota.status === "PENDING" && <span className="bg-orange-100 text-orange-700 text-[10px] px-3 py-1 rounded-full font-black uppercase animate-pulse">Pendiente</span>}
                  {cuota.status === "PARTIAL" && <span className="bg-blue-100 text-blue-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Parcial</span>}
                  {cuota.status === "PAID" && <span className="bg-green-100 text-green-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Pagado</span>}
                </td>
                <td className="p-5 text-center">
                  {cuota.status !== 'PAID' && (
                    <form action={registrarPagoManualAdmin}>
                      <input type="hidden" name="installmentId" value={cuota.id} />
                      <input type="hidden" name="loanId" value={prestamo.id} />
                      <input type="hidden" name="amount" value={cuota.amountDue} />
                      <button 
                        type="submit" 
                        className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95"
                      >
                        COBRAR EN OFICINA
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Función para formatear miles (e.g. 1000 -> 1.000) [cite: 444]
function recapitular(num: number) {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}