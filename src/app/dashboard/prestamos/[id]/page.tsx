import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

// 1. Ahora params se define como una Promesa (Promise)
export default async function DetallePrestamoPage({ params }: { params: Promise<{ id: string }> }) {
  
  // 2. ¡La línea mágica! Esperamos a que la URL cargue y extraemos el ID
  const { id } = await params;

  // 3. Ahora sí, le pasamos el "id" seguro a Prisma
  const prestamo = await prisma.loan.findUnique({
    where: { id: id },
    include: {
      client: true, 
      installments: { 
        orderBy: { dueDate: 'asc' } 
      }
    }
  });

  // Si no existe el préstamo, lo regresamos a la tabla
  if (!prestamo) redirect("/dashboard/prestamos");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Detalle del Préstamo</h2>
          <p className="text-gray-500">Cliente: <span className="font-medium text-gray-700">{prestamo.client.name}</span></p>
        </div>
        <Link href="/dashboard/prestamos" className="text-gray-500 hover:text-gray-700 font-medium">
          Volver
        </Link>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total a Pagar</p>
          <p className="text-2xl font-bold text-gray-800">${prestamo.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Saldo Pendiente</p>
          <p className="text-2xl font-bold text-red-600">${prestamo.balance.toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Estado</p>
          <p className="text-xl font-bold mt-1">
            {prestamo.status === "ACTIVE" ? (
              <span className="text-blue-600">Activo</span>
            ) : (
              <span className="text-green-600">Pagado</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabla de Cuotas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700">Calendario de Pagos ({prestamo.installments.length} cuotas)</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-semibold text-gray-600">No.</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Fecha de Cobro</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Valor de Cuota</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Abonado</th>
              <th className="p-4 text-sm font-semibold text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {prestamo.installments.map((cuota, index) => (
              <tr key={cuota.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-gray-500">{index + 1}</td>
                <td className="p-4 font-medium text-gray-800">
                  {new Date(cuota.dueDate).toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="p-4 text-gray-600 font-medium">${cuota.amountDue.toFixed(2)}</td>
                <td className="p-4 text-green-600 font-medium">${cuota.amountPaid.toFixed(2)}</td>
                <td className="p-4">
                  {cuota.status === "PENDING" && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Pendiente</span>}
                  {cuota.status === "PARTIAL" && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Abono Parcial</span>}
                  {cuota.status === "PAID" && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Pagado</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}