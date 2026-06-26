"use client";

import { useState } from "react";
import { crearCliente } from "../../actions"; 

export default function FormularioCliente({ rutas }: { rutas: any[] }) {
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [cargandoGPS, setCargandoGPS] = useState(false);

  const capturarUbicacion = () => {
    if (!navigator.geolocation) return alert("Tu navegador no soporta GPS");
    
    setCargandoGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toString(),
          lng: pos.coords.longitude.toString()
        });
        setCargandoGPS(false);
      },
      (err) => {
        alert("Error al obtener ubicación. Asegúrate de dar permisos.");
        setCargandoGPS(false);
      }
    );
  };

  return (
    <form action={crearCliente} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Nombre Completo / Negocio</label>
          <input name="name" type="text" required placeholder="Ej. Tienda La Bendición" className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Cédula</label>
          <input name="cedula" type="text" placeholder="Ej. 001-000000-0000A" className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Celular</label>
          <input name="celular" type="tel" placeholder="Ej. 8888 8888" className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Teléfono</label>
          <input name="phone" type="tel" placeholder="300 123 4567" className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Ruta de Cobro</label>
          <select name="routeId" required className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
            <option value="">Selecciona una ruta...</option>
            {rutas.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Dirección Exacta</label>
          <input name="address" type="text" required placeholder="Calle 10 #20-30..." className="w-full bg-gray-50 p-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>

        {/* SECCIÓN GPS: El valor diferencial para inversionistas */}
        <div className="md:col-span-2 bg-blue-50 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-600 uppercase">Punto de Cobro Geográfico</span>
            <button 
              type="button" 
              onClick={capturarUbicacion}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {cargandoGPS ? "Buscando..." : "📍 Capturar mi ubicación actual"}
            </button>
          </div>
          <div className="flex gap-4">
            <input name="lat" value={coords.lat} readOnly placeholder="Latitud" className="w-1/2 bg-white/50 p-3 rounded-xl text-xs font-mono" />
            <input name="lng" value={coords.lng} readOnly placeholder="Longitud" className="w-1/2 bg-white/50 p-3 rounded-xl text-xs font-mono" />
          </div>
          <p className="text-[10px] text-blue-400 italic">* Captura la ubicación mientras estás en el local del cliente para mayor precisión.</p>
        </div>
      </div>

      <div className="pt-4">
        <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98]">
          GUARDAR CLIENTE Y PUNTO DE COBRO
        </button>
      </div>
    </form>
  );
}