import { prisma } from "../../../../../lib/prisma";
import { editarCobrador } from "../../../actions";
import Link from "next/link";

export default async function EditarCobradorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cobrador = await prisma.user.findUnique({ where: { id } });

  if (!cobrador) return <div className="p-10">Cobrador no encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Editar Cobrador</h2>
      <form action={editarCobrador} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
        <input type="hidden" name="id" value={cobrador.id} />
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Nombre Completo</label>
          <input name="name" defaultValue={cobrador.name} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Correo Electrónico</label>
          <input name="email" type="email" defaultValue={cobrador.email} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="flex gap-3 pt-4">
          <Link href="/dashboard/cobradores" className="flex-1 text-center py-3 text-slate-400 font-bold">Cancelar</Link>
          <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg">Guardar Cambios</button>
        </div>
      </form>
    </div>
  );
}
