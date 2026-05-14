import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import  BotonEliminarRuta from "./BotonEliminarRuta";

export default async function RutasPage() {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({ where: { email: session?.user?.email! } });

  const rutas = await prisma.route.findMany({
  where: { 
    tenantId: admin?.tenantId,
    active: true // 👈 Solo rutas que no han sido "borradas"
  },
  include: {
    worker: true,
    _count: { 
      select: { 
        // 👈 Solo contamos clientes activos para que el contador marque 0
        // si todos sus clientes fueron "borrados" lógicamente.
        clients: { where: { active: true } } 
      } 
    }
  },
  orderBy: { name: 'asc' }
});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Rutas</h2>
        <Link href="/dashboard/rutas/nueva" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
          + Nueva Ruta
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Nombre de Ruta</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Cobrador Asignado</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Clientes</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rutas.map((ruta) => (
              <tr key={ruta.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <p className="font-bold text-gray-800">{ruta.name}</p>
                </td>
                <td className="p-4">
                  {ruta.worker ? (
                    <span className="text-sm text-gray-600">👤 {ruta.worker.name}</span>
                  ) : (
                    <span className="text-xs italic text-gray-400">Sin asignar</span>
                  )}
                </td>
                <td className="p-4 text-center text-sm font-bold text-blue-600">
                  {ruta._count.clients}
                </td>
                <td className="p-4">
                  <div className="flex justify-center gap-3">
                    <Link href={`/dashboard/rutas/${ruta.id}/editar`} className="text-blue-600 text-xs font-black uppercase">
                      Editar
                    </Link>
                    <BotonEliminarRuta
                      id={ruta.id}
                      tieneClientes={ruta._count.clients > 0}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rutas.length === 0 && (
          <div className="p-10 text-center text-gray-400 italic">No hay rutas configuradas.</div>
        )}
      </div>
    </div>
  );
}