import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";

export default async function MonitoreoPage() {
  const session = await getServerSession();

  // 1. Buscamos al usuario de forma segura
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return <div className="p-10 text-center font-bold">Sesión no encontrada</div>;
  }

  const admin = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!admin) return <div className="p-10 text-center">Admin no encontrado</div>;

  // 2. Traemos las ALERTAS DE PÁNICO (Usando tu modelo exacto PanicAlert y Workday)
  let alertas: any[] = [];
  try {
    alertas = await prisma.panicAlert.findMany({
      include: {
        workday: {
          include: { worker: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
  } catch (error) {
    console.error("Error cargando alertas de pánico:", error);
  }

  // 3. Traemos los cobros (Lo que Kevin hace en la calle)
  let ultimosPagos: any[] = [];
try {
  // 🚀 CAMBIO CLAVE: Consultamos la tabla 'collection' en lugar de 'installment'
  ultimosPagos = await prisma.collection.findMany({
    // Al ser la tabla Collection, ya sabemos que son pagos realizados
    include: {
      loan: {
        include: {
          client: true // Traemos el cliente para mostrar su nombre
        }
      }
    },
    // Ordenamos por fecha de creación (la más reciente primero) [cite: 665]
    orderBy: { createdAt: 'desc' }, 
    take: 10
  });
} catch (error) {
  console.error("Error en la consulta de Prisma:", error);
}

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Monitoreo en Vivo</h2>
        <p className="text-slate-500 font-medium">Visualizando los últimos movimientos y alertas de la red.</p>
      </div>

      {/* SECCIÓN DE ALERTAS DE PÁNICO */}
      <section>
        <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2">
          🚨 Alertas de Seguridad Recientes
        </h3>
        {alertas.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
            Sin alertas recientes. ¡Todo está tranquilo!
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <div key={alerta.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-black text-red-700">PÁNICO ACTIVADO</p>
                  <p className="text-xs text-red-600 font-medium">
                    Cobrador: {alerta.workday?.worker?.name || 'Desconocido'}
                  </p>
                </div>
                <span className="text-[10px] text-red-500 font-mono bg-red-100 px-2 py-1 rounded">
                  {new Date(alerta.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECCIÓN DE COBROS */}
      <section>
        <h3 className="text-slate-700 font-bold mb-4 flex items-center gap-2">
          💰 Flujo de Caja en Vivo
        </h3>
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalle Cliente</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Recaudado</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ultimosPagos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">😴</span>
                      <p className="text-slate-400 font-bold">Sin actividad hoy todavía</p>
                    </div>
                  </td>
                </tr>
              ) : (
                ultimosPagos.map((pago) => (
                  <tr key={pago.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="p-5">
                      <p className="font-extrabold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {pago.loan?.client?.name || "Cliente General"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        ID: {pago.id.substring(0, 8)}
                      </p>
                    </td>
                    <td className="p-5 text-right">
                      <p className="text-lg font-black text-green-600">
                        +${pago.amount.toFixed(0)}
                      </p>
                    </td>
                    <td className="p-5 text-right">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                        {new Date(pago.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    {/* 🚀 NUEVA COLUMNA: Botón de Evidencia Fotográfica */}
                    <td className="p-5 text-center">
                      {pago.evidencePhoto ? (
                        <a
                          href={pago.evidencePhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-50 text-blue-600 font-black px-3 py-2 rounded-xl text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          📸 Ver Foto
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-300 font-bold uppercase italic">Sin Foto</span>
                      )}
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