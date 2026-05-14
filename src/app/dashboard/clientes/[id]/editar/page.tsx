import { prisma } from "../../../../../lib/prisma";
import { editarCliente } from "../../../actions";
import Link from "next/link";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [cliente, rutas] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.route.findMany()
  ]);

  if (!cliente) return <div className="p-10">Cliente no encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Editar Cliente</h2>
      <form action={editarCliente} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
        <input type="hidden" name="id" value={cliente.id} />
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Nombre</label>
          <input name="name" defaultValue={cliente.name} className="w-full p-3 bg-slate-50 rounded-xl" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Teléfono</label>
            <input name="phone" defaultValue={cliente.phone || ""} className="w-full p-3 bg-slate-50 rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Ruta</label>
            <select name="routeId" defaultValue={cliente.routeId} className="w-full p-3 bg-slate-50 rounded-xl">
              {rutas.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Dirección</label>
          <input name="address" defaultValue={cliente.address} className="w-full p-3 bg-slate-50 rounded-xl" required />
        </div>
        <div className="flex gap-3 pt-4">
          <Link href="/dashboard/clientes" className="flex-1 text-center py-3 text-slate-400 font-bold">Cancelar</Link>
          <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
}
