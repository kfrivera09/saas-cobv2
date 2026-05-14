import { getServerSession } from "next-auth";
import { prisma } from "../../../../lib/prisma";
import Link from "next/link";
import FormularioCliente from "../nuevo/FormularioClientes";

export default async function NuevoClientePage() {
  const session = await getServerSession();
  const admin = await prisma.user.findUnique({
    where: { email: session?.user?.email as string },
  });

  const rutas = await prisma.route.findMany({
    where: { tenantId: admin?.tenantId },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Registrar Nuevo Cliente</h2>
          <p className="text-gray-500 text-sm">Asegura el punto de cobro con coordenadas GPS.</p>
        </div>
        <Link href="/dashboard/clientes" className="text-gray-400 hover:text-gray-800 font-bold text-sm">
          ← Volver
        </Link>
      </div>

      <FormularioCliente rutas={rutas} />
    </div>
  );
}