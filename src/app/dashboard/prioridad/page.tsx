import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { actualizarPrioridad, reordenarPrioridad } from "./actions";

export default async function PrioridadPage() {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });

  const rutas = await prisma.route.findMany({
    where: { tenantId: admin?.tenantId, active: true },
    include: {
      clients: {
        where: { active: true },
        orderBy: { priority: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Prioridad de Clientes</h2>
      </div>

      <p className="text-sm text-gray-500 italic">
        Asigna el orden en que los cobradores deben visitar a los clientes. Usa los botones para subir/bajar o escribe el n&uacute;mero directamente.
      </p>

      <div className="space-y-8">
        {rutas.map((ruta) => (
          <div key={ruta.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4">
              <h3 className="font-bold text-lg">{ruta.name}</h3>
            </div>

            {ruta.clients.length === 0 ? (
              <div className="p-10 text-center text-gray-400 italic">No hay clientes activos en esta ruta.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap w-20">#</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Cliente</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Direcci&oacute;n</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap text-center">Prioridad</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap text-center">Ordenar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ruta.clients.map((cliente, index) => (
                      <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="font-bold text-gray-800">{cliente.name}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-600 max-w-[200px] truncate">
                          {cliente.address}
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <form action={actualizarPrioridad} className="flex items-center justify-center gap-2">
                            <input type="hidden" name="clientId" value={cliente.id} />
                            <input
                              type="number"
                              name="priority"
                              min="0"
                              defaultValue={cliente.priority}
                              className="w-16 text-center rounded-lg border-2 border-gray-50 bg-gray-50 p-2 focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                            />
                            <button
                              type="submit"
                              className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              OK
                            </button>
                          </form>
                        </td>
                        <td className="p-4 whitespace-nowrap text-center">
                          <div className="flex justify-center gap-1">
                            <form action={reordenarPrioridad}>
                              <input type="hidden" name="clientId" value={cliente.id} />
                              <input type="hidden" name="direccion" value="up" />
                              <button
                                type="submit"
                                disabled={index === 0}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                ↑
                              </button>
                            </form>
                            <form action={reordenarPrioridad}>
                              <input type="hidden" name="clientId" value={cliente.id} />
                              <input type="hidden" name="direccion" value="down" />
                              <button
                                type="submit"
                                disabled={index === ruta.clients.length - 1}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                ↓
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {rutas.length === 0 && (
          <div className="p-10 text-center text-gray-400 italic">No hay rutas activas. Crea una ruta primero.</div>
        )}
      </div>
    </div>
  );
}
