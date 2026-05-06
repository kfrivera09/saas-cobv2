import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";

export default async function PrestamosPage() {
  const session = await getServerSession();

  // 1. Identificamos a la empresa
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos todos los préstamos, trayendo también los datos del cliente
  const prestamos = await prisma.loan.findMany({
    where: { tenantId: admin?.tenantId },
    include: { client: true },
    orderBy: { createdAt: 'desc' } // Los más recientes primero
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Control de Préstamos</h2>
        <Link href="/dashboard/prestamos/nuevo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors shadow-sm font-medium">
          + Nuevo Préstamo
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-semibold text-gray-600">Cliente</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Capital Prestado</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Total a Pagar</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Saldo Pendiente</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Estado</th>
              <th className="p-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Aún no has registrado ningún préstamo.
                </td>
              </tr>
            ) : (
              prestamos.map((prestamo) => (
                <tr key={prestamo.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{prestamo.client.name}</td>
                  <td className="p-4 text-gray-600">${prestamo.amount.toFixed(2)}</td>
                  <td className="p-4 text-gray-600 font-medium">${prestamo.totalAmount.toFixed(2)}</td>
                  <td className="p-4 text-red-600 font-semibold">${prestamo.balance.toFixed(2)}</td>
                  <td className="p-4">
                    {prestamo.status === "ACTIVE" ? (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Activo</span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Pagado</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/dashboard/prestamos/${prestamo.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver Cuotas</Link>
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