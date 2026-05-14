import { getServerSession } from "next-auth";
import { prisma } from "../../lib/prisma";
import { aprobarCierre, resolverAlerta } from "./actions";
import { iniciarJornada } from "../cobrador/actions";
import DashboardMapWrapper from "../../components/DashboardMapWrapper";

export default async function DashboardPage() {
  const session = await getServerSession();
  const userEmail = session?.user?.email;

  if (!userEmail) return <div className="p-10">Inicia sesión para continuar.</div>;

  const admin = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!admin || !admin.tenantId) return <div className="p-10">Error de configuración de empresa.</div>;

  const miJornada = await prisma.workday.findFirst({
    where: { workerId: admin.id, status: "OPEN" }
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // 1. CONSULTAS GLOBALES CON SEPARACIÓN CONTABLE [cite: 703, 704]
  const [
    pCount,
    cCount,
    cierres,
    activos,
    recaudoCalleQuery,
    recaudoOficinaQuery,
    cierresAprobados,
    panicos
  ] = await Promise.all([
    prisma.loan.count({ where: { tenantId: admin.tenantId } }),
    prisma.client.count({ where: { tenantId: admin.tenantId } }),

    // Cierres de calle esperando aprobación
    prisma.workdayClosure.findMany({
      where: { status: "PENDING_APPROVAL", workday: { tenantId: admin.tenantId } },
      include: { workday: { include: { worker: true } } },
      orderBy: { createdAt: 'desc' }
    }),

    // Monitoreo de jornadas abiertas (Live GPS) [cite: 703]
    prisma.workday.findMany({
      where: { tenantId: admin.tenantId, status: "OPEN" },
      include: {
        worker: true,
        collections: true,
        expenses: true,
        locations: { orderBy: { timestamp: 'desc' }, take: 1 }
      }
    }),

    // A. RECAUDACIÓN EN CALLE (Cobros de usuarios con rol WORKER) [cite: 704]
    prisma.collection.aggregate({
      where: { workday: { status: "OPEN", worker: { role: "WORKER" }, tenantId: admin.tenantId } },
      _sum: { amount: true }
    }),

    // B. RECAUDACIÓN EN OFICINA (Cobros de usuarios con rol ADMIN) [cite: 704]
    prisma.collection.aggregate({
      where: { workday: { status: "OPEN", worker: { role: "ADMIN" }, tenantId: admin.tenantId } },
      _sum: { amount: true }
    }),

    // C. CAJA FUERTE (Dinero físico ya aprobado por el dueño) [cite: 663, 704]
    prisma.workdayClosure.aggregate({
      where: { status: "APPROVED", workday: { tenantId: admin.tenantId } },
      _sum: { safeDeposit: true }
    }),

    // Emergencias activas
    prisma.panicAlert.findMany({
      where: { status: "PENDING", workday: { tenantId: admin.tenantId } },
      include: { workday: { include: { worker: true } } }
    })
  ]);

  const montoCalle = recaudoCalleQuery._sum.amount || 0;
  const montoOficina = recaudoOficinaQuery._sum.amount || 0;
  const cajaFuerteTotal = cierresAprobados._sum.safeDeposit || 0;

  // 2. Preparar datos para el Mapa (Mantenemos la corrección de índices ) [cite: 705]
  const puntosCobradores = activos
    .filter(j => j.locations.length > 0)
    .map(j => ({
      id: j.id,
      lat: j.locations[0].lat,
      lng: j.locations[0].lng,
      nombre: `👤 ${j.worker.name}`,
      subtitulo: `Ult. Reporte: ${new Date(j.locations[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      tipo: "COBRADOR" as const
    }));

  const puntosPanicos = panicos.map(p => ({
    id: `panico-${p.id}`,
    lat: p.lat,
    lng: p.lng,
    nombre: `🚨 EMERGENCIA: ${p.workday.worker.name}`,
    subtitulo: `Reportada: ${new Date(p.createdAt).toLocaleTimeString()}`,
    tipo: "PANICO" as const
  }));

  const puntosMapa = [...puntosCobradores, ...puntosPanicos];
  const centroInicial: [number, number] = puntosPanicos.length > 0
    ? [puntosPanicos[0].lat, puntosPanicos[0].lng]
    : puntosCobradores.length > 0
      ? [puntosCobradores[0].lat, puntosCobradores[0].lng]
      : [4.6097, -74.0817];

  return (
    <div className="space-y-10 pb-20">
       {!miJornada && (
      <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-orange-100">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🏛️</span>
          <div>
            <h3 className="text-xl font-black text-orange-800">Oficina Cerrada</h3>
            <p className="text-orange-600 text-sm font-medium">Debes abrir tu turno para registrar recaudos en escritorio.</p>
          </div>
        </div>
        <form action={iniciarJornada} className="flex gap-3 w-full md:w-auto">
          <input 
            type="number" 
            name="baseAmount" 
            placeholder="Base $" 
            className="w-24 bg-white border border-orange-200 rounded-xl p-3 text-sm font-bold" 
            required 
          />
          <button type="submit" className="bg-orange-600 text-white font-black px-6 py-3 rounded-xl text-xs uppercase">
            Abrir Oficina 🔓
          </button>
        </form>
      </div>
    )}
      {/* SECCIÓN DE EMERGENCIAS */}
      {panicos.length > 0 && (
        <section className="space-y-4">
          <div className="bg-red-600 p-6 rounded-[2.5rem] shadow-2xl animate-pulse">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">🚨 EMERGENCIAS ACTIVAS</h2>
            <div className="mt-6 space-y-3">
              {panicos.map(p => (
                <div key={p.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/20">
                  <div className="text-white">
                    <p className="font-black text-lg">{p.workday.worker.name}</p>
                    <p className="text-xs font-bold text-red-200">Alerta a las {new Date(p.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <form action={resolverAlerta}>
                    <input type="hidden" name="panicId" value={p.id} />
                    <button type="submit" className="bg-white text-red-600 font-black px-4 py-2 rounded-xl text-xs uppercase shadow-lg">RESOLVER ✅</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MÉTRICAS GLOBALES CON 5 COLUMNAS [cite: 711, 712] */}
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Panel de Control 🏛️</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Préstamos</h3>
            <p className="text-3xl font-black text-slate-800 mt-1">{pCount}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Clientes</h3>
            <p className="text-3xl font-black text-slate-800 mt-1">{cCount}</p>
          </div>
          {/* MÉTRICA DE CALLE */}
          <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
            <h3 className="text-blue-500 text-[9px] font-black uppercase tracking-widest">Recaudos Calle</h3>
            <p className="text-3xl font-black text-slate-800 mt-1">${recapitular(montoCalle)}</p>
            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">En rutas 🛵</p>
          </div>
          {/* MÉTRICA DE OFICINA (La que buscabas) */}
          <div className="bg-white p-5 rounded-3xl border border-orange-100 shadow-sm">
            <h3 className="text-orange-500 text-[9px] font-black uppercase tracking-widest">Recaudos Oficina</h3>
            <p className="text-3xl font-black text-slate-800 mt-1">${recapitular(montoOficina)}</p>
            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">En escritorio 🖥️</p>
          </div>
          {/* CAJA FUERTE */}
          <div className="bg-slate-900 p-5 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
            <div className="relative z-10">
              <h3 className="text-green-400 text-[9px] font-black uppercase tracking-widest">Caja Fuerte</h3>
              <p className="text-3xl font-black text-white mt-1">${recapitular(cajaFuerteTotal)}</p>
            </div>
            <div className="absolute -right-5 -bottom-5 w-20 h-20 bg-green-500/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      {/* MAPA */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">🌍 Mapa de Operaciones en Vivo</h3>
        <DashboardMapWrapper puntos={puntosMapa} center={centroInicial} />
      </section>

      {/* MONITOR DE PERSONAL (WIDGETS) */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800">🛰️ Monitor de Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activos.map((jornada) => {
            const totalCobros = jornada.collections.reduce((acc, c) => acc + c.amount, 0);
            const totalGastos = jornada.expenses.reduce((acc, e) => acc + e.amount, 0);
            const efectivoTeorico = (jornada.baseAmount + totalCobros) - totalGastos;
            const ultimaLoc = jornada.locations;
            const minutos = ultimaLoc ? Math.floor((new Date().getTime() - new Date(ultimaLoc[0].timestamp).getTime()) / 60000) : null;

            return (
              <div key={jornada.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden flex flex-col group">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{jornada.worker.name}</p>
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">Turno Abierto</span>
                  </div>
                  <div className="text-2xl">👤</div>
                </div>
                <div className="p-6 space-y-3 flex-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Base</span><span className="font-black text-slate-700">${recapitular(jornada.baseAmount)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Recaudos</span><span className="font-black text-green-600">+$ {recapitular(totalCobros)}</span></div>
                  <div className="flex justify-between text-sm border-b pb-3"><span className="text-slate-400">Gastos</span><span className="font-black text-red-500">-$ {recapitular(totalGastos)}</span></div>
                  <div className="pt-2 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efectivo en Mano</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">${recapitular(efectivoTeorico)}</p>
                  </div>
                </div>
                <div className={`px-6 py-3 border-t flex justify-between items-center ${minutos !== null && minutos < 10 ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-2 w-2 rounded-full ${minutos !== null && minutos < 10 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <p className="text-[10px] font-black text-slate-600 uppercase">{minutos !== null ? `Hace ${minutos} min` : 'Sin señal GPS'}</p>
                  </div>
                  {ultimaLoc && (
                    <a href={`https://www.google.com/maps?q=${ultimaLoc[0].lat},${ultimaLoc[0].lng}`} target="_blank" className="text-[9px] font-bold text-blue-600 underline uppercase">Google Maps</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AUDITORÍA DE CIERRES */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800">🔍 Auditoría de Liquidaciones</h3>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobrador</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Reportado</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diferencia</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cierres.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic">No hay cierres pendientes.</td></tr>
              ) : (
                cierres.map((c) => (
                  <tr key={c.id}>
                    <td className="p-5">
                      <p className="font-extrabold text-slate-800">{c.workday.worker.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{new Date(c.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="p-5 text-right font-black text-slate-700 text-lg">${recapitular(c.reportedCash)}</td>
                    <td className="p-5 text-right">
                      <span className={`font-black px-3 py-1 rounded-full text-[10px] uppercase ${c.difference < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {c.difference > 0 ? '+' : ''}${recapitular(c.difference)}
                      </span>
                    </td>
                    <td className="p-5">
                      <form action={aprobarCierre} className="flex gap-2 items-center justify-center">
                        <input type="hidden" name="cierreId" value={c.id} />
                        <input type="hidden" name="reportedCash" value={c.reportedCash} />
                        <input type="number" name="rolloverAmount" defaultValue={20} className="w-16 border rounded-lg p-1.5 text-xs font-black text-center" />
                        <button type="submit" className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-blue-600 transition-all">APROBAR</button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function recapitular(num: number) {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}