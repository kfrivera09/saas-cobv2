import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import BotonEliminarCliente from "../clientes/BotonEliminarCliente";
export default async function ClientesPage() {
  const session = await getServerSession();

  // 1. Obtenemos el Tenant del Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos clientes incluyendo su ruta y sus cuotas pendientes para calcular la mora
  const clientes = await prisma.client.findMany({
  where: { 
    tenantId: admin?.tenantId,
    active: true
  },
  include: {
    route: true,
    _count: {
      select: { loans: true }
    },
    loans: {
      where: { status: "ACTIVE" },
      include: {
        installments: {
          where: { 
            status: { in: ["PENDING", "PARTIAL"] } 
          },
          orderBy: { dueDate: 'asc' }
        }
      }
    }
  },
  orderBy: { name: 'asc' }
});

  const hoy = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
        <Link
          href="/dashboard/clientes/nuevo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-bold"
        >
          + Nuevo Cliente
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Cliente / Dirección</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Ruta</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Estado de Pago</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                  No tienes clientes registrados aún. ¡Agrega el primero para empezar a operar!
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => {
                // Lógica de Mora: ¿Tiene alguna cuota cuya fecha de vencimiento ya pasó?
                const tieneMora = cliente.loans.some(loan =>
                  loan.installments.some(inst => new Date(inst.dueDate) < hoy)
                );

                return (
                  <tr key={cliente.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{cliente.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-medium">{cliente.address}</p>
                      {cliente.phone && <p className="text-[10px] text-blue-500 font-bold">{cliente.phone}</p>}
                    </td>
                    <td className="p-4">
                      {cliente.route ? (
                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                          {cliente.route.name}
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs italic">Sin ruta</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {tieneMora ? (
                        <span className="bg-red-100 text-red-600 text-[10px] px-3 py-1 rounded-full font-black animate-pulse">
                          🔴 EN MORA
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 text-[10px] px-3 py-1 rounded-full font-black">
                          🟢 AL DÍA
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-3">
                        {/* Acción para crear préstamo rápido con el cliente pre-seleccionado */}
                        <Link
                          href={`/dashboard/prestamos/nuevo?clientId=${cliente.id}`}
                          className="text-green-600 hover:text-green-800 text-[10px] font-black uppercase tracking-tighter"
                        >
                          Prestar
                        </Link>

                        <Link
                           href={`/dashboard/clientes/${cliente.id}/editar`}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-tighter"
                        >
                          Editar
                        </Link>

                        <BotonEliminarCliente id={cliente.id}
                          tienePrestamos={cliente._count.loans > 0} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}