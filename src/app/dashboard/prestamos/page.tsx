import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import BotonAnular from "./BotonAnular"; // Importamos el componente de cliente

export default async function PrestamosPage() {
  const session = await getServerSession();

  // 1. Identificamos a la empresa del Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos todos los préstamos, trayendo datos del cliente y ordenando por fecha
  const prestamos = await prisma.loan.findMany({
    where: { tenantId: admin?.tenantId },
    include: { client: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Control de Préstamos</h2>
        <Link 
          href="/dashboard/prestamos/nuevo" 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-bold"
        >
          + Nuevo Préstamo
        </Link>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Cliente</th>
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Capital</th>
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Saldo</th>
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
              <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prestamos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-400 italic">
                  Aún no has registrado ningún préstamo.
                </td>
              </tr>
            ) : (
              prestamos.map((prestamo) => (
                <tr 
                  key={prestamo.id} 
                  className={`hover:bg-gray-50/50 transition-colors ${prestamo.status === "CANCELLED" ? "opacity-50 grayscale bg-slate-50" : ""}`}
                >
                  <td className="p-5">
                    <p className="font-bold text-slate-800">{prestamo.client.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{new Date(prestamo.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="p-5 text-slate-600 font-medium">${recapitular(prestamo.amount)}</td>
                  <td className="p-5 text-slate-800 font-bold">${recapitular(prestamo.totalAmount)}</td>
                  <td className="p-5">
                    <p className={`font-black ${prestamo.balance > 0 ? "text-red-500" : "text-green-600"}`}>
                      ${recapitular(prestamo.balance)}
                    </p>
                  </td>
                  <td className="p-5 text-center">
                    {prestamo.status === "ACTIVE" && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Activo</span>
                    )}
                    {prestamo.status === "PAID" && (
                      <span className="bg-green-100 text-green-700 text-[10px] px-3 py-1 rounded-full font-black uppercase">Pagado</span>
                    )}
                    {prestamo.status === "CANCELLED" && (
                      <span className="bg-slate-200 text-slate-600 text-[10px] px-3 py-1 rounded-full font-black uppercase">Anulado</span>
                    )}
                  </td>
                  <td className="p-5">
                    <div className="flex justify-end items-center gap-4">
                      <Link 
                        href={`/dashboard/prestamos/${prestamo.id}`} 
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-tighter"
                      >
                        Ver Cuotas
                      </Link>

                      {/* Solo mostramos el botón de anular si el préstamo está activo */}
                      {prestamo.status === "ACTIVE" && (
                        <BotonAnular id={prestamo.id} />
                      )}
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

function recapitular(num: number) {
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}