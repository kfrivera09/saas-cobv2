import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function CobradoresPage() {
  const session = await getServerSession();

  // Obtenemos el Tenant del Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // Buscamos a los usuarios que sean "WORKER" (Cobradores) de este Tenant
  const cobradores = await prisma.user.findMany({
    where: { 
      tenantId: admin?.tenantId,
      role: "WORKER"
    },
    include: {
      routes: true // Traemos las rutas que tienen asignadas
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Equipo de Cobradores</h2>
        <Link href="/dashboard/cobradores/nuevo" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm">
          + Nuevo Cobrador
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-semibold text-gray-600">Nombre</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Correo Electrónico</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Rutas Asignadas</th>
              <th className="p-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobradores.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No tienes cobradores registrados. Agrega uno para empezar a operar.
                </td>
              </tr>
            ) : (
              cobradores.map((cobrador) => (
                <tr key={cobrador.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{cobrador.name}</td>
                  <td className="p-4 text-gray-600">{cobrador.email}</td>
                  <td className="p-4 text-gray-600">
                    {cobrador.routes.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {cobrador.routes.map(ruta => (
                          <span key={ruta.id} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            {ruta.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Sin ruta</span>
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