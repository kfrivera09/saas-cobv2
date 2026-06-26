import { prisma } from "../../../../../lib/prisma";
import { editarRuta } from "../../../actions";
import Link from "next/link";

export default async function EditarRutaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Buscamos la ruta y los trabajadores disponibles para asignar
  const [ruta, workers] = await Promise.all([
    prisma.route.findUnique({ where: { id } }),
    prisma.user.findMany({ where: { role: "WORKER", active: true } })
  ]);

  if (!ruta) return <div className="p-10">Ruta no encontrada</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Editar Ruta</h2>
      <form action={editarRuta} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-4">
        <input type="hidden" name="id" value={ruta.id} />
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Nombre de la Ruta</label>
          <input name="name" defaultValue={ruta.name} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Cobrador Asignado</label>
          <select name="workerId" defaultValue={ruta.workerId || "none"} className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500">
            <option value="none">Sin asignar</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <Link href="/dashboard/rutas" className="flex-1 text-center py-3 text-slate-400 font-bold">Cancelar</Link>
          <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg">Actualizar Ruta</button>
        </div>
      </form>
    </div>
  );
}
