import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import BotonEliminarCliente from "../clientes/BotonEliminarCliente";

export default async function ClientesPage(props: { searchParams?: Promise<{ filtro?: string }> }) {
  const session = await getServerSession();
  const searchParams = await props.searchParams;
  const filtro = searchParams?.filtro;

  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

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

  const clientesConMora = clientes.map((cliente) => {
    const cuotasVencidas = cliente.loans.flatMap(loan =>
      loan.installments.filter(inst => new Date(inst.dueDate) < hoy)
    );

    const montoMora = cuotasVencidas.reduce((total, inst) => {
      return total + (inst.amountDue - inst.amountPaid);
    }, 0);

    const diasMora = cuotasVencidas.length > 0
      ? Math.floor((hoy.getTime() - new Date(cuotasVencidas[0].dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const enMora = cuotasVencidas.length > 0;

    return { ...cliente, enMora, diasMora, montoMora };
  });

  const clientesFiltrados = filtro === "mora"
    ? clientesConMora.filter(c => c.enMora)
    : clientesConMora;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
        <Link
          href="/dashboard/clientes/nuevo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-bold w-full sm:w-auto text-center"
        >
          + Nuevo Cliente
        </Link>
      </div>

      <div className="flex gap-2">
        <Link
          href="/dashboard/clientes"
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${!filtro ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Todos
        </Link>
        <Link
          href="/dashboard/clientes?filtro=mora"
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${filtro === "mora" ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          En Mora
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Cliente / Direcci&oacute;n</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Ruta</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Estado</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">D&iacute;as en Mora</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Monto Atrasado</th>
              <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-400 italic">
                  {filtro === "mora"
                    ? "No hay clientes en mora. Todos est&aacute;n al d&iacute;a."
                    : "No tienes clientes registrados a&uacute;n."}
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((cliente) => (
                <tr key={cliente.id} className={`hover:bg-gray-50/50 transition-colors ${cliente.enMora ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 min-w-[250px]">
                    <p className="font-bold text-gray-800">{cliente.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">{cliente.address}</p>
                    {cliente.phone && <p className="text-[10px] text-blue-500 font-bold">{cliente.phone}</p>}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    {cliente.route ? (
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
                        {cliente.route.name}
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs italic">Sin ruta</span>
                    )}
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {cliente.enMora ? (
                      <span className="bg-red-100 text-red-600 text-[10px] px-3 py-1 rounded-full font-black animate-pulse">
                        EN MORA
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-600 text-[10px] px-3 py-1 rounded-full font-black">
                        AL D&Iacute;A
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {cliente.enMora ? (
                      <span className="text-red-600 font-bold text-sm">
                        {cliente.diasMora} d&iacute;as
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">--</span>
                    )}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {cliente.enMora ? (
                      <span className="text-red-600 font-bold text-sm">
                        ${cliente.montoMora.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">--</span>
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex justify-end items-center gap-3">
                      <Link
                        href={`/dashboard/prestamos/nuevo?clientId=${cliente.id}`}
                        className="text-green-600 hover:text-green-800 text-[10px] font-black uppercase tracking-tighter"
                      >
                        Prestar
                      </Link>
                      {cliente.loans.length > 0 && (
                        <Link
                          href={`/dashboard/prestamos/${cliente.loans[0].id}`}
                          className="text-slate-600 hover:text-black text-[10px] font-black uppercase tracking-tighter"
                        >
                          Historial
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/clientes/${cliente.id}/editar`}
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-tighter"
                      >
                        Editar
                      </Link>
                      <BotonEliminarCliente 
                        id={cliente.id}
                        tienePrestamos={cliente._count.loans > 0} 
                      />
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
