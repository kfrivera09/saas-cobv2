import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import bcrypt from "bcryptjs"; // Importamos nuestra herramienta de cifrado

export default async function NuevoCobradorPage() {
  // SERVER ACTION: Función que corre en el servidor para guardar al usuario
  async function crearCobrador(formData: FormData) {
    "use server";
    
    const nombre = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 1. Validar la sesión del Administrador
    const sessionActual = await getServerSession();
    const userAdmin = await prisma.user.findUnique({
      where: { email: sessionActual?.user?.email as string },
    });

    if (!userAdmin?.tenantId) return;

    // 2. CIFRAR LA CONTRASEÑA (Nivel Senior)
    // El número 10 es el "salt" (qué tan complejo es el cifrado)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Guardar en la base de datos
    await prisma.user.create({
      data: {
        name: nombre,
        email: email,
        password: hashedPassword, // Guardamos la contraseña cifrada
        role: "WORKER",           // Le asignamos el rol de cobrador
        tenantId: userAdmin.tenantId, // Lo asociamos a tu misma empresa
      },
    });

    // 4. Redirigimos de vuelta a la tabla
    redirect("/dashboard/cobradores");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Registrar Nuevo Cobrador</h2>
        <Link href="/dashboard/cobradores" className="text-gray-500 hover:text-gray-700 font-medium">
          Volver
        </Link>
      </div>

      <form action={crearCobrador} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="Ej. Juan Pérez"
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (Para iniciar sesión)</label>
          <input 
            type="email" 
            name="email" 
            required 
            placeholder="juan@cobranzas.com"
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <input 
            type="password" 
            name="password" 
            required 
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Esta es la clave que usará el cobrador en su celular.</p>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            Guardar Cobrador
          </button>
        </div>
      </form>
    </div>
  );
}