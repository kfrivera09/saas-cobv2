import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import BotonEliminarRuta from "./BotonEliminarRuta";

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
      {/* 1. Encabezado responsivo: flex-col en móvil, flex-row en escritorio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Rutas</h2>
        <Link 
          href="/dashboard/rutas/nueva" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 w-full sm:w-auto text-center"
        >
          + Nueva Ruta
        </Link>
      </div>

      {/* 2. Contenedor de la tabla con overflow-x-auto para el scroll horizontal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        
        {/* 3. Tabla con un ancho mínimo para que las columnas no se colapsen */}
        <table className="w-full min-w-[700px] text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {/* 4. whitespace-nowrap en encabezados para mantenerlos en una línea */}
              <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Nombre de Ruta</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Cobrador Asignado</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center whitespace-nowrap">Clientes</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rutas.map((ruta) => (
              <tr key={ruta.id} className="hover:bg-gray-50/50 transition-colors">
                {/* whitespace-nowrap en las celdas */}
                <td className="p-4 whitespace-nowrap">
                  <p className="font-bold text-gray-800">{ruta.name}</p>
                </td>
                <td className="p-4 whitespace-nowrap">
                  {ruta.worker ? (
                    <span className="text-sm text-gray-600">👤 {ruta.worker.name}</span>
                  ) : (
                    <span className="text-xs italic text-gray-400">Sin asignar</span>
                  )}
                </td>
                <td className="p-4 text-center text-sm font-bold text-blue-600 whitespace-nowrap">
                  {ruta._count.clients}
                </td>
                <td className="p-4 whitespace-nowrap">
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
        {/* Este mensaje se muestra solo si no hay datos */}
        {rutas.length === 0 && (
          <div className="p-10 text-center text-gray-400 italic">No hay rutas configuradas.</div>
        )}
      </div>
    </div>
  );
}