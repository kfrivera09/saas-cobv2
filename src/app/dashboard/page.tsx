import { getServerSession } from "next-auth";
import { prisma } from "../../lib/prisma"; 
// 👇 1. IMPORTANTE: Importamos resolverAlerta
import { aprobarCierre, resolverAlerta } from "./actions"; 
import DashboardMapWrapper from "../../components/DashboardMapWrapper";

export default async function DashboardPage() {
  const session = await getServerSession();
  const userEmail = session?.user?.email;

  if (!userEmail) return <div className="p-10">Inicia sesión para continuar.</div>;

  const admin = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!admin || !admin.tenantId) return <div className="p-10">Error de configuración de empresa.</div>;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // 1. Consultas Globales
  const [pCount, cCount, cierres, activos, collectionsHoy, cierresAprobados, panicos] = await Promise.all([
    prisma.loan.count({ where: { tenantId: admin.tenantId } }),
    prisma.client.count({ where: { tenantId: admin.tenantId } }),
    prisma.workdayClosure.findMany({
      where: { status: "PENDING_APPROVAL", workday: { tenantId: admin.tenantId } },
      include: { workday: { include: { worker: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.workday.findMany({
      where: { tenantId: admin.tenantId, status: "OPEN" },
      include: { 
        worker: true,
        collections: true,
        expenses: true,
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1 
        }
      }
    }),
    prisma.collection.findMany({
      where: { 
        createdAt: { gte: hoy },
        workday: { tenantId: admin.tenantId }
      }
    }),
    prisma.workdayClosure.aggregate({
      where: { status: "APPROVED", workday: { tenantId: admin.tenantId } },
      _sum: { safeDeposit: true }
    }),
    // Consulta de pánicos activos (¡Está perfecta!)
    prisma.panicAlert.findMany({
      where: { status: "PENDING", workday: { tenantId: admin.tenantId } },
      include: { workday: { include: { worker: true } } }
    })
  ]);

  const recaudacionHoy = collectionsHoy.reduce((acc, curr) => acc + curr.amount, 0);
  const cajaFuerteTotal = cierresAprobados._sum.safeDeposit || 0;

  // 2. Preparar datos para el Mapa
  const puntosCobradores = activos
    .filter(j => j.locations.length > 0)
    .map(j => ({
      id: j.id,
      lat: j.locations[0].lat,
      lng: j.locations[0].lng,
      nombre: `👤 ${j.worker.name}`,
      subtitulo: `Ult. Reporte: ${new Date(j.locations[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
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
      
      {/* 👇 2. SECCIÓN DE EMERGENCIAS CORREGIDA (Usando el array 'panicos') */}
      {panicos.length > 0 && (
        <section className="space-y-4">
          <div className="bg-red-600 p-6 rounded-[2.5rem] shadow-[0_0_40px_rgba(220,38,38,0.4)] border-4 border-red-500 animate-pulse">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              🚨 EMERGENCIAS ACTIVAS
            </h2>
            
            <div className="mt-6 space-y-3">
              {panicos.map(p => (
                <div key={p.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-white/20">
                  <div className="text-white">
                    <p className="font-black text-lg">{p.workday.worker.name}</p>
                    <p className="text-xs font-bold text-red-200">
                      Alerta disparada a las {new Date(p.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <form action={resolverAlerta}>
                    <input type="hidden" name="panicId" value={p.id} />
                    <button 
                      type="submit"
                      className="bg-white text-red-600 font-black px-6 py-2 rounded-xl hover:bg-red-50 active:scale-95 transition-all shadow-lg text-xs"
                    >
                      MARCAR COMO RESUELTO ✅
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- MÉTRICAS --- */}
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-slate-800">Panel de Control 🏛️</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Préstamos Activos</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">{pCount}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Clientes</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">{cCount}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
            <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-widest">Recaudación Hoy</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">${recapitular(recaudacionHoy)}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-bold">Efectivo en rutas 🛵</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
            <h3 className="text-green-400 text-[10px] font-black uppercase tracking-widest">Caja Fuerte (Aprobado)</h3>
            <p className="text-4xl font-black text-white mt-2">${recapitular(cajaFuerteTotal)}</p>
            <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-green-500/10 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN DEL MAPA --- */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            🌍 Mapa de Operaciones en Vivo
          </h3>
        </div>
        <DashboardMapWrapper puntos={puntosMapa} center={centroInicial} />
      </section>

      {/* --- MONITOR DE PERSONAL (WIDGETS) --- */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800">🛰️ Monitor de Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activos.map((jornada) => {
            const totalCobros = jornada.collections.reduce((acc, c) => acc + c.amount, 0);
            const totalGastos = jornada.expenses.reduce((acc, e) => acc + e.amount, 0);
            const efectivoTeorico = (jornada.baseAmount + totalCobros) - totalGastos;
            const ultimaLoc = jornada.locations[0];
            const minutos = ultimaLoc ? Math.floor((new Date().getTime() - new Date(ultimaLoc.timestamp).getTime()) / 60000) : null;

            return (
              <div key={jornada.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-lg overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-slate-800 text-lg">{jornada.worker.name}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Turno Abierto</p>
                  </div>
                  <div className="text-2xl">👤</div>
                </div>

                <div className="p-6 space-y-3 flex-1">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Base</span><span className="font-bold">${jornada.baseAmount}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Recaudos</span><span className="font-bold text-green-600">+${totalCobros}</span></div>
                  <div className="flex justify-between text-sm border-b pb-3"><span className="text-slate-400">Gastos</span><span className="font-bold text-red-500">-${totalGastos}</span></div>
                  <div className="pt-2 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efectivo estimado</p>
                    <p className="text-3xl font-black text-slate-900">${efectivoTeorico}</p>
                  </div>
                </div>

                <div className={`px-6 py-3 border-t flex justify-between items-center ${minutos !== null && minutos < 10 ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex h-2 w-2 rounded-full ${minutos !== null && minutos < 10 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <p className="text-[10px] font-black text-slate-600 uppercase">
                      {minutos !== null ? `Hace ${minutos} min` : 'Sin señal GPS'}
                    </p>
                  </div>
                  {ultimaLoc && (
                    <a href={`https://www.google.com/maps?q=${ultimaLoc.lat},${ultimaLoc.lng}`} target="_blank" className="text-[9px] font-bold text-blue-600 underline uppercase">Ver Google Maps</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- AUDITORÍA DE CIERRES --- */}
      <section className="space-y-6">
        <h3 className="text-xl font-black text-slate-800">🔍 Auditoría de Cierres</h3>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobrador</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Reportado</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diferencia</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cierres.map((c) => (
                <tr key={c.id}>
                  <td className="p-5">
                    <p className="font-bold text-slate-800">{c.workday.worker.name}</p>
                    <p className="text-[9px] text-slate-400">{new Date(c.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="p-5 text-right font-black text-slate-700">${c.reportedCash}</td>
                  <td className="p-5 text-right">
                    <span className={`font-black px-3 py-1 rounded-full text-xs ${c.difference < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {c.difference > 0 ? '+' : ''}${c.difference}
                    </span>
                  </td>
                  <td className="p-3">
                    <form action={aprobarCierre} className="flex gap-2 items-center justify-center">
                      <input type="hidden" name="cierreId" value={c.id} />
                      <input type="hidden" name="reportedCash" value={c.reportedCash} />
                      <input type="number" name="rolloverAmount" defaultValue={20} className="w-16 border rounded p-1 text-xs font-bold text-center" />
                      <button type="submit" className="bg-blue-600 text-white text-[9px] font-black px-3 py-2 rounded-lg">APROBAR</button>
                    </form>
                  </td>
                </tr>
              ))}
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