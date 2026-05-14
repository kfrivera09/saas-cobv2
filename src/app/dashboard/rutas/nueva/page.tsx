import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache"; // 👈 Importante para refrescar la lista
import Link from "next/link";

export default async function NuevaRutaPage() {
  const session = await getServerSession();

  // 1. Obtenemos la empresa (Tenant) del administrador actual
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  // 2. Buscamos a los cobradores (WORKER) de este Tenant para el select
  const cobradores = await prisma.user.findMany({
    where: { 
      tenantId: admin?.tenantId, 
      role: "WORKER" 
    },
    orderBy: { name: 'asc' }
  });

  // 3. SERVER ACTION
  async function crearRuta(formData: FormData) {
    "use server";
    
    const nombre = formData.get("name") as string;
    const workerId = formData.get("workerId") as string;

    const sessionActual = await getServerSession();
    const userAdmin = await prisma.user.findUnique({
      where: { email: sessionActual?.user?.email as string },
    });

    if (!userAdmin?.tenantId) return;

    // Guardamos en la base de datos respetando el esquema
    await prisma.route.create({
      data: {
        name: nombre,
        tenantId: userAdmin.tenantId,
        // Si eligió "unassigned", guardamos null para que la relación sea opcional
        workerId: workerId === "unassigned" ? null : workerId,
      },
    });

    // 👈 LIMPIAMOS LA CACHÉ para que la tabla de rutas se actualice al instante
    revalidatePath("/dashboard/rutas");
    
    // Redirigimos de vuelta a la tabla
    redirect("/dashboard/rutas");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Crear Nueva Ruta</h2>
        <Link href="/dashboard/rutas" className="text-gray-500 hover:text-gray-700 font-medium text-sm">
          ← Volver a la lista
        </Link>
      </div>

      <form action={crearRuta} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Nombre de la Ruta / Zona
          </label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="Ej. Ruta Centro, Sector Norte..."
            className="w-full rounded-xl border-2 border-gray-50 bg-gray-50 p-3 focus:bg-white focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Asignar Cobrador (Opcional)
          </label>
          <select 
            name="workerId" 
            className="w-full rounded-xl border-2 border-gray-50 bg-gray-50 p-3 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none"
          >
            <option value="unassigned">Sin asignar por ahora</option>
            {cobradores.map(cobrador => (
              <option key={cobrador.id} value={cobrador.id}>
                👤 {cobrador.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-2 ml-1 italic">
            * Podrás asignar o cambiar el cobrador más adelante desde la tabla principal.
          </p>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            GUARDAR RUTA
          </button>
        </div>
      </form>
    </div>
  );
}