import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NuevoPrestamoPage() {
  const session = await getServerSession();

  // 1. Obtenemos el Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Traemos a los clientes para el menú desplegable
  const clientes = await prisma.client.findMany({
    where: { tenantId: admin?.tenantId },
  });

  // SERVER ACTION: Aquí ocurre la magia matemática
  async function crearPrestamo(formData: FormData) {
    "use server";
    
    const clientId = formData.get("clientId") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const interest = parseFloat(formData.get("interest") as string);
    const frequency = formData.get("frequency") as string;
    const cuotasCount = parseInt(formData.get("installmentsCount") as string);

    const sessionActual = await getServerSession();
    const userAdmin = await prisma.user.findUnique({
      where: { email: sessionActual?.user?.email as string },
    });

    if (!userAdmin?.tenantId || !clientId) return;

    // --- CÁLCULOS FINANCIEROS ---
    // 1. Calculamos el total a pagar (Capital + Interés)
    const totalAmount = amount + (amount * (interest / 100));
    
    // 2. Calculamos de cuánto queda cada cuota
    const amountPerInstallment = totalAmount / cuotasCount;

    // 3. Generamos el calendario de cuotas
    let fechaCobro = new Date();
    const cuotasArray = [];

    for (let i = 0; i < cuotasCount; i++) {
      if (frequency === "DAILY") {
        fechaCobro.setDate(fechaCobro.getDate() + 1); // Sumar 1 día
        // Lógica de negocio: Si cae Domingo (0), lo pasamos al Lunes (+1 día más)
        if (fechaCobro.getDay() === 0) {
          fechaCobro.setDate(fechaCobro.getDate() + 1);
        }
      } else if (frequency === "WEEKLY") {
        fechaCobro.setDate(fechaCobro.getDate() + 7); // Sumar 7 días
      }

      cuotasArray.push({
        amountDue: parseFloat(amountPerInstallment.toFixed(2)),
        dueDate: new Date(fechaCobro),
        status: "PENDING"
      });
    }

    // --- GUARDADO EN BASE DE DATOS ---
    // Guardamos el préstamo y TODAS sus cuotas de un solo golpe (Transacción anidada)
    await prisma.loan.create({
      data: {
        tenantId: userAdmin.tenantId,
        clientId,
        amount,
        interest,
        totalAmount,
        balance: totalAmount, // Al inicio, el saldo pendiente es todo
        frequency,
        status: "ACTIVE",
        installments: {
          create: cuotasArray // Magia de Prisma: crea las cuotas automáticamente
        }
      },
    });

    // Volvemos a la tabla
    redirect("/dashboard/prestamos");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Generar Nuevo Préstamo</h2>
        <Link href="/dashboard/prestamos" className="text-gray-500 hover:text-gray-700 font-medium">
          Volver
        </Link>
      </div>

      <form action={crearPrestamo} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Cliente</label>
          <select name="clientId" required className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Elige un cliente...</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>{cliente.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capital a Prestar ($)</label>
            <input type="number" step="0.01" name="amount" required placeholder="Ej. 1000" className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interés (%)</label>
            <input type="number" step="0.1" name="interest" required defaultValue="20" className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de Pago</label>
            <select name="frequency" required className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="DAILY">Diario (Lunes a Sábado)</option>
              <option value="WEEKLY">Semanal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuotas</label>
            <input type="number" name="installmentsCount" required defaultValue="24" placeholder="Ej. 24 (Días)" className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Crear Préstamo y Generar Cuotas
          </button>
        </div>
      </form>
    </div>
  );
}