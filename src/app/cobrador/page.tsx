import { getServerSession } from "next-auth";
import { prisma } from "../../lib/prisma"; 
import { iniciarJornada } from "./actions";
import Link from "next/link";

export default async function CobradorPage() {
  const session = await getServerSession();
  
  const usuario = await prisma.user.findUnique({
    where: { email: session?.user?.email as string }
  });

  if (!usuario) return <div className="p-10 text-center text-red-500 font-bold">Error de sesión</div>;

  // Verificamos si hay una jornada abierta
  const jornadaActiva = await prisma.workday.findFirst({
    where: { workerId: usuario.id, status: "OPEN" }
  });

  return (
    <div className="space-y-6">
      <header className="py-4">
        <h2 className="text-2xl font-black text-slate-800">Hola, {usuario.name.split(' ')[0]} 👋</h2>
        <p className="text-slate-500 text-sm font-medium">Gestión de Cobranza en Terreno</p>
      </header>

      {!jornadaActiva ? (
        /* PANTALLA DE BLOQUEO: INICIAR JORNADA */
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-4xl">
            ☀️
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">¡Buen día!</h3>
            <p className="text-sm text-slate-500 mt-1">Declara tu base inicial para comenzar a operar hoy.</p>
          </div>

          <form action={iniciarJornada} className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Efectivo de Base (Suelto)</label>
              <div className="relative mt-1">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                <input 
                  type="number" 
                  name="baseAmount" 
                  placeholder="0.00" 
                  required
                  step="0.01"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-10 font-black text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              INICIAR DÍA DE TRABAJO
            </button>
          </form>
        </div>
      ) : (
        /* PANTALLA DE ACCESO: JORNADA ACTIVA */
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-green-600 p-6 rounded-[2rem] text-white shadow-lg shadow-green-200">
            <p className="text-green-100 text-[10px] font-bold uppercase tracking-widest">Estado Actual</p>
            <h3 className="text-2xl font-black mt-1">Turno Abierto ✅</h3>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-green-100 text-[10px] uppercase font-bold">Base Inicial</p>
                <p className="text-xl font-black">${jornadaActiva.baseAmount}</p>
              </div>
              <div className="text-right">
                <p className="text-green-100 text-[10px] uppercase font-bold">Iniciado a las</p>
                <p className="text-sm font-bold">{new Date(jornadaActiva.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/cobrador/ruta" className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center hover:bg-slate-50 transition-colors">
              <span className="text-3xl block mb-2">🗺️</span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Ver Mi Ruta</span>
            </Link>
            <Link href="/cobrador/caja" className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center hover:bg-slate-50 transition-colors">
              <span className="text-3xl block mb-2">💵</span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">Ver Mi Caja</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}