import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function MiRutaPage() {
  const session = await getServerSession();
  
  // 1. Obtenemos al cobrador y su ruta
  const empleado = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
    include: {
      routes: {
        include: {
          clients: {
            include: {
              loans: {
                where: { status: "ACTIVE" } // Solo préstamos vivos
              }
            }
          }
        }
      }
    }
  });

  const ruta = empleado?.routes[0];
  const clientes = ruta?.clients || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Clientes en Ruta</h2>
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">
          {clientes.length} Clientes
        </span>
      </div>

      {clientes.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-dashed border-gray-300">
          <p className="text-gray-400">No hay clientes asignados a esta ruta todavía.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {clientes.map((cliente) => {
            // Calculamos el saldo total sumando sus préstamos activos
            const saldoTotal = cliente.loans.reduce((acc, loan) => acc + loan.balance, 0);

            return (
              <Link 
                href={`/cobrador/cliente/${cliente.id}`} 
                key={cliente.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="font-bold text-gray-800 truncate">{cliente.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{cliente.address}</p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 font-bold uppercase">Saldo</p>
                  <p className={`text-lg font-black ${saldoTotal > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ${saldoTotal.toFixed(0)}
                  </p>
                </div>
                
                <div className="ml-3 text-gray-300">
                  <span>▶️</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}