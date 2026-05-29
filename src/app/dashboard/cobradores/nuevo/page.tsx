import { crearCobrador } from "../../actions";
import Link from "next/link";

export default function NuevoCobradorPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Cobrador</h2>
        <Link 
          href="/dashboard/cobradores" 
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Volver atrás
        </Link>
      </div>

      <form action={crearCobrador} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        
        {/* Campo Nombre */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nombre Completo
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Ej. Juan Pérez"
            className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 p-4 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Campo Correo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Correo Electrónico (Usuario)
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="cobrador@empresa.com"
            className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 p-4 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Campo Contraseña */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Contraseña de acceso
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder="Asigna una contraseña segura"
            className="w-full bg-gray-50 text-gray-900 placeholder:text-gray-400 p-4 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Botón de Enviar */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors mt-4"
        >
          Guardar Cobrador
        </button>

      </form>
    </div>
  );
}