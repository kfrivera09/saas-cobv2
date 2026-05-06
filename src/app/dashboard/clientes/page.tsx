import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function ClientesPage() {
  const session = await getServerSession();

  // 1. Obtenemos a qué empresa pertenece el Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos todos los clientes de la empresa, incluyendo los datos de su ruta
  const clientes = await prisma.client.findMany({
    where: { tenantId: admin?.tenantId },
    include: { 
      route: true // Esto hace la "magia" de traernos el nombre de la ruta
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
        <Link href="/dashboard/clientes/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
          + Nuevo Cliente
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-semibold text-gray-600">Nombre</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Teléfono</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Dirección</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Ruta Asignada</th>
              <th className="p-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No tienes clientes registrados aún. ¡Agrega el primero para empezar a prestar!
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{cliente.name}</td>
                  <td className="p-4 text-gray-600">{cliente.phone || "Sin teléfono"}</td>
                  <td className="p-4 text-gray-600">{cliente.address}</td>
                  <td className="p-4 text-gray-600">
                    {cliente.route ? (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {cliente.route.name}
                      </span>
                    ) : (
                      <span className="text-red-500 text-xs">Sin ruta</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver / Prestar</button>
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