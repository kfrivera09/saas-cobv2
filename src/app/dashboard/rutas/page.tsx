import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function RutasPage() {
  const session = await getServerSession();

  // Traemos el usuario actual para saber a qué Tenant (Empresa) pertenece
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // Buscamos las rutas de esa empresa, incluyendo el nombre del cobrador asignado
  const rutas = await prisma.route.findMany({
    where: { tenantId: user?.tenantId },
    include: { worker: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Rutas</h2>
        <Link href="/dashboard/rutas/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
          + Nueva Ruta
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-semibold text-gray-600">Nombre de la Ruta</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Cobrador Asignado</th>
              <th className="p-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutas.length === 0 ? (
              <tr>
                {/* Cambiamos el colSpan a 3 porque ahora son 3 columnas */}
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  No tienes rutas creadas todavía. Crea la primera para empezar.
                </td>
              </tr>
            ) : (
              rutas.map((ruta) => (
                <tr key={ruta.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{ruta.name}</td>

                  {/* Aquí estaba la ciudad, la hemos eliminado */}

                  <td className="p-4 text-gray-600">
                    {ruta.worker ? (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {ruta.worker.name}
                      </span>
                    ) : (
                      <span className="text-red-500 text-xs font-medium">Sin asignar</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
