import { prisma } from "../../../../../lib/prisma"; // Corregida la ruta de acceso a lib [cite: 653]
import { editarCobrador } from "../../../actions"; // Ajustada la ruta a actions.ts [cite: 652]
import Link from "next/link";

export default async function EditarCobradorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Manejo asíncrono de parámetros [cite: 226, 227]
  const cobrador = await prisma.user.findUnique({ where: { id } });

  if (!cobrador) return <div className="p-10 text-center font-bold">Cobrador no encontrado</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cobradores" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← Volver
        </Link>
        <h2 className="text-2xl font-black text-slate-800">Gestionar Cobrador</h2>
      </div>

      <form action={editarCobrador} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
        <input type="hidden" name="id" value={cobrador.id} />
        
        {/* DATOS BÁSICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo</label>
            <input 
              name="name" 
              defaultValue={cobrador.name} 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico</label>
            <input 
              name="email" 
              type="email" 
              defaultValue={cobrador.email} 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold" 
              required 
            />
          </div>
        </div>

        {/* SECCIÓN DE SEGURIDAD (PASSWORD) */}
        <div className="pt-6 border-t border-slate-50 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nueva Contraseña (Opcional)</label>
          <input 
            name="password" 
            type="password" 
            placeholder="Dejar en blanco para no cambiar" 
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold" 
          />
          <p className="text-[9px] text-slate-400 font-medium italic ml-2">
            * Al escribir una nueva clave, esta se cifrará automáticamente con Bcrypt.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Link 
            href="/dashboard/cobradores" 
            className="flex-1 text-center py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-[10px] tracking-widest"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}