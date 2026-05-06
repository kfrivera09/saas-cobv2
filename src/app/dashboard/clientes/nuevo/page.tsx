import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NuevoClientePage() {
  const session = await getServerSession();

  // 1. Obtenemos a qué empresa pertenece el Admin
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos las rutas disponibles para mostrarlas en el select
  const rutas = await prisma.route.findMany({
    where: { tenantId: admin?.tenantId },
  });

  // SERVER ACTION: Función que guarda al cliente
  async function crearCliente(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;
    const routeId = formData.get("routeId") as string;

    const sessionActual = await getServerSession();
    const userAdmin = await prisma.user.findUnique({
      where: { email: sessionActual?.user?.email as string },
    });

    if (!userAdmin?.tenantId || !routeId) return;

    // 3. Guardamos en la base de datos de Prisma
    await prisma.client.create({
      data: {
        name,
        phone,
        address,
        routeId, // Lo atamos directamente a la ruta elegida
        tenantId: userAdmin.tenantId, 
      },
    });

    // 4. Volvemos a la tabla de clientes
    redirect("/dashboard/clientes");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Registrar Nuevo Cliente</h2>
        <Link href="/dashboard/clientes" className="text-gray-500 hover:text-gray-700 font-medium">
          Volver
        </Link>
      </div>

      <form action={crearCliente} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo / Negocio</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="Ej. Tienda La Bendición (María Gómez)"
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
          <input 
            type="tel" 
            name="phone" 
            placeholder="Ej. 300 123 4567"
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Físicamente Exacta</label>
          <input 
            type="text" 
            name="address" 
            required 
            placeholder="Ej. Calle Principal #12-34, frente al parque"
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a la Ruta</label>
          <select 
            name="routeId" 
            required
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Selecciona una ruta...</option>
            {rutas.map(ruta => (
              <option key={ruta.id} value={ruta.id}>{ruta.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Guardar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}