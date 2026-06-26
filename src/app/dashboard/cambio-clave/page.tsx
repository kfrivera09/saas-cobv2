import { getServerSession } from "next-auth";
import { prisma } from "../../../lib/prisma";
import { cambiarClave } from "../actions";

export default async function CambioClavePage(props: { searchParams?: Promise<{ exito?: string }> }) {
  const session = await getServerSession();
  const usuario = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
  if (!usuario) return <div>No autorizado</div>;

  const searchParams = await props.searchParams;
  const exito = searchParams?.exito;

  const cargo = usuario.role === "ADMIN" ? "Administrador" : "Cobrador";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cambio de Contrase&ntilde;a</h2>

      {exito && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl text-green-700 text-sm font-bold text-center">
          Contrase&ntilde;a actualizada correctamente.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
            {usuario.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800">{usuario.name}</p>
            <p className="text-sm text-gray-500">{cargo}</p>
            <p className="text-sm text-gray-400">{usuario.email}</p>
          </div>
        </div>

        <form action={cambiarClave} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Contrase&ntilde;a Actual
            </label>
            <input
              type="password"
              name="claveAnterior"
              required
              placeholder="Ingresa tu contrase&ntilde;a actual"
              className="w-full rounded-xl border-2 border-gray-50 bg-gray-50 p-3 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Nueva Contrase&ntilde;a
            </label>
            <input
              type="password"
              name="claveNueva"
              required
              minLength={6}
              placeholder="M&iacute;nimo 6 caracteres"
              className="w-full rounded-xl border-2 border-gray-50 bg-gray-50 p-3 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Repetir Nueva Contrase&ntilde;a
            </label>
            <input
              type="password"
              name="repetirClave"
              required
              minLength={6}
              placeholder="Repite la nueva contrase&ntilde;a"
              className="w-full rounded-xl border-2 border-gray-50 bg-gray-50 p-3 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            CAMBIAR CONTRASE&ntilde;A
          </button>
        </form>
      </div>
    </div>
  );
}
