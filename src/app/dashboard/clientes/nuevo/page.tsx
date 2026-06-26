import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import FormularioCliente from "./FormularioClientes";

export default async function NuevoClientePage() {
  const session = await getServerSession();

  // 1. Obtenemos la empresa (Tenant) del administrador actual
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  if (!admin?.tenantId) {
    redirect("/auth/login"); // O manejar el error de otra manera
  }

  // 2. Buscamos las rutas de este Tenant para el select
  const rutas = await prisma.route.findMany({
    where: {
      tenantId: admin.tenantId,
      active: true,
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Cliente</h2>
        <Link href="/dashboard/clientes" className="text-gray-500 hover:text-gray-700 font-medium text-sm">
          ← Volver a la lista
        </Link>
      </div>

      <FormularioCliente rutas={rutas} />
    </div>
  );
}