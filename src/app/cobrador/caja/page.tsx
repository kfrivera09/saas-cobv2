import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma"; 
import { cerrarJornadaConBlindDrop, registrarGasto } from "../actions";

export default async function CajaCobradorPage() {
  const session = await getServerSession();
  
  const usuario = await prisma.user.findUnique({
    where: { email: session?.user?.email as string }
  });

  if (!usuario) return <div className="p-4 text-red-500">Error de sesión</div>;

  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  let cobrosDetallados: any[] = [];
  let gastosHoy: any[] = [];
  let totalRecaudado = 0;
  let totalGastos = 0;
  let baseInicial = 0;

  if (jornadaActiva) {
    baseInicial = jornadaActiva.baseAmount;

    // 1. Traemos los Cobros
    const coleccionesHoy = await prisma.collection.findMany({
      where: { workdayId: jornadaActiva.id },
      orderBy: { createdAt: 'desc' }
    });
    totalRecaudado = coleccionesHoy.reduce((acc, curr) => acc + curr.amount, 0);

    if (coleccionesHoy.length > 0) {
      const loanIds = coleccionesHoy.map(c => c.loanId);
      const prestamos = await prisma.loan.findMany({
        where: { id: { in: loanIds } },
        include: { client: true }
      });

      cobrosDetallados = coleccionesHoy.map(cobro => {
        const prestamo = prestamos.find(p => p.id === cobro.loanId);
        return {
          id: cobro.id,
          monto: cobro.amount,
          cliente: prestamo?.client?.name || 'Desconocido'
        };
      });
    }

    // 2. NUEVO: Traemos los Gastos
    gastosHoy = await prisma.expense.findMany({
      where: { workdayId: jornadaActiva.id },
      orderBy: { createdAt: 'desc' }
    });
    totalGastos = gastosHoy.reduce((acc, curr) => acc + curr.amount, 0);
  }

  if (!jornadaActiva) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl mt-10">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-xl font-bold mt-4 text-slate-800">Caja Cerrada</h2>
        <p className="text-slate-500 mt-2">No tienes un turno abierto para ver la caja.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-xl font-bold text-gray-800">Resumen de tu Turno</h2>

      {/* Tarjeta de Total Actualizada */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-center pb-4 border-b border-slate-700 mb-4">
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Recaudado Hoy</p>
          <p className="text-5xl font-black mt-2 text-green-400">${totalRecaudado.toFixed(0)}</p>
        </div>
        <div className="relative z-10 flex justify-between text-sm">
          <div>
            <p className="text-slate-400 uppercase text-[10px] font-bold">Base Inicial</p>
            <p className="font-bold">+${baseInicial.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 uppercase text-[10px] font-bold">Gastos</p>
            <p className="font-bold text-red-400">-${totalGastos.toFixed(0)}</p>
          </div>
        </div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full"></div>
      </div>

      {/* ========================================== */}
      {/* NUEVO: SECCIÓN DE GASTOS */}
      {/* ========================================== */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-gray-800 uppercase mb-3 flex justify-between items-center">
          <span>Registrar Gasto</span>
          <span className="text-2xl">🛵</span>
        </h3>
        <form action={registrarGasto} className="flex gap-2">
          <input 
            type="text" 
            name="description" 
            placeholder="Ej. Gasolina" 
            required
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-black font-medium focus:outline-none focus:border-blue-500"
          />
          <input 
            type="number" 
            name="amount" 
            step="0.01"
            placeholder="$ 0.00" 
            required
            className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-black font-bold focus:outline-none focus:border-blue-500 text-center"
          />
          <button type="submit" className="bg-slate-900 text-white rounded-xl px-4 py-2 font-bold hover:bg-slate-800 active:scale-95 transition-all">+</button>
        </form>

        {gastosHoy.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {gastosHoy.map(gasto => (
              <div key={gasto.id} className="flex justify-between items-center bg-red-50 px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-slate-700">{gasto.description}</span>
                <span className="text-xs font-black text-red-600">-${gasto.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listado de cobros */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase ml-1">Cobros Registrados</h3>
        {cobrosDetallados.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl text-center border border-dashed border-gray-200">
            <p className="text-gray-400 text-xs font-medium">Aún no has registrado cobros.</p>
          </div>
        ) : (
          cobrosDetallados.map((cobro: any) => (
            <div key={cobro.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <p className="font-bold text-gray-800 text-sm truncate">{cobro.cliente}</p>
              <p className="text-base font-black text-green-600 shrink-0">+${cobro.monto.toFixed(0)}</p>
            </div>
          ))
        )}
      </div>

      {/* BLIND DROP: DECLARACIÓN CIEGA */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-8">
        <div className="flex justify-center mb-3 text-3xl">💵</div>
        <h3 className="text-slate-800 font-black mb-1 text-center">Declaración de Efectivo</h3>
        <p className="text-xs text-slate-500 text-center mb-6">
          Cuenta el efectivo TOTAL que tienes en mano (Base + Recaudos - Gastos).
        </p>

        <form action={cerrarJornadaConBlindDrop} className="space-y-4">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-black">$</span>
            <input 
              type="number" 
              name="reportedCash" 
              step="0.01"
              required
              placeholder="0.00"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-3xl font-black text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors text-center"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg flex justify-center items-center gap-2"
          >
            <span>🔒</span> ENVIAR CIERRE A SUPERVISOR
          </button>
        </form>
      </div>
    </div>
  );
}