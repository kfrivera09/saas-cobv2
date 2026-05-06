import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NuevaRutaPage() {
  const session = await getServerSession();

  // 1. Obtenemos la empresa (Tenant) del administrador actual
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos si ya hay cobradores creados para mostrarlos en el select
  const cobradores = await prisma.user.findMany({
    where: { tenantId: admin?.tenantId, role: "WORKER" },
  });

  // 3. SERVER ACTION: Esta función corre 100% en el servidor al darle "Guardar"
  async function crearRuta(formData: FormData) {
    "use server";
    
    const nombre = formData.get("name") as string;
    const workerId = formData.get("workerId") as string;

    // Medida de seguridad: Validar sesión
    const sessionActual = await getServerSession();
    const userAdmin = await prisma.user.findUnique({
      where: { email: sessionActual?.user?.email as string },
    });

    if (!userAdmin?.tenantId) return;

    // Guardamos en la base de datos
    await prisma.route.create({
      data: {
        name: nombre,
        tenantId: userAdmin.tenantId,
        workerId: workerId === "unassigned" ? null : workerId,
      },
    });

    // Redirigimos de vuelta a la tabla
    redirect("/dashboard/rutas");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Crear Nueva Ruta</h2>
        <Link href="/dashboard/rutas" className="text-gray-500 hover:text-gray-700 font-medium">
          Volver
        </Link>
      </div>

      <form action={crearRuta} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Ruta</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="Ej. Ruta Centro, Ruta Norte..."
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignar Cobrador (Opcional)</label>
          <select 
            name="workerId" 
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="unassigned">Sin asignar por ahora</option>
            {cobradores.map(cobrador => (
              <option key={cobrador.id} value={cobrador.id}>{cobrador.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Podrás asignar un cobrador más adelante si aún no tienes uno registrado.</p>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Guardar Ruta
          </button>
        </div>
      </form>
    </div>
  );
}