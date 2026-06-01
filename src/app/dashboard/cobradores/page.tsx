import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import { eliminarCobrador } from "../actions";
import BotonEliminar from "./BotonEliminar";

export default async function CobradoresPage() {
  const session = await getServerSession();

  // 1. Obtenemos el Tenant del Admin logueado
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos a los usuarios que sean "WORKER" (Cobradores) de este Tenant
  const cobradores = await prisma.user.findMany({
    where: {
      tenantId: admin?.tenantId,
      role: "WORKER"
    },
    include: {
      routes: true // Traemos las rutas que tienen asignadas para visualización
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      {/* 1. Encabezado responsivo: flex-col en móvil, flex-row en escritorio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Equipo de Cobradores</h2>
        <Link
          href="/dashboard/cobradores/nuevo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-bold w-full sm:w-auto text-center"
        >
          + Nuevo Cobrador
        </Link>
      </div>

      {/* 2. Contenedor de la tabla con overflow-x-auto */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        
        {/* 3. Tabla con min-w-[800px] */}
        <table className="w-full min-w-[800px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {/* 4. whitespace-nowrap en encabezados */}
              <th className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">Nombre</th>
              <th className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">Correo Electrónico</th>
              <th className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">Rutas Asignadas</th>
              <th className="p-4 text-sm font-semibold text-gray-600 text-center whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cobradores.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                  No tienes cobradores registrados. Agrega uno para empezar a operar.
                </td>
              </tr>
            ) : (
              cobradores.map((cobrador) => (
                <tr key={cobrador.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {/* whitespace-nowrap en celdas de texto */}
                  <td className="p-4 font-medium text-gray-800 whitespace-nowrap">{cobrador.name}</td>
                  <td className="p-4 text-gray-600 whitespace-nowrap">{cobrador.email}</td>
                  
                  {/* Aquí usamos min-w-[200px] para que los tags de las rutas puedan envolverse (flex-wrap) bien si hay muchos */}
                  <td className="p-4 text-gray-600 min-w-[200px]">
                    {cobrador.routes.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {cobrador.routes.map(ruta => (
                          <span key={ruta.id} className="bg-green-100 text-green-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                            {ruta.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs italic whitespace-nowrap">Sin ruta</span>
                    )}
                  </td>
                  
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex justify-center items-center gap-3">
                      {/* BOTÓN EDITAR */}
                      <Link
                         href={`/dashboard/cobradores/${cobrador.id}/editar`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-tighter"
                      >
                        Editar
                      </Link>
                      <BotonEliminar id={cobrador.id} />
                    </div>
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