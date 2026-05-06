"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { dispararPanico } from "./actions"; 
import LocationTracker from "../../components/LocationTracker"; // <--- 1. IMPORTAMOS EL RADAR

export default function CobradorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // NUEVA FUNCIÓN: Captura el GPS y dispara la alerta
  const manejarPanico = () => {
    // 1. Confirmación de seguridad para evitar toques accidentales
    if (!confirm("¿ESTÁS EN UNA EMERGENCIA? Se enviará tu ubicación exacta a la central.")) return;

    // 2. Capturamos la ubicación en este preciso momento
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // 3. Enviamos las coordenadas a la base de datos
          await dispararPanico(latitude, longitude);
          alert("🚨 ALERTA ENVIADA. Mantén la calma, la central ha sido notificada.");
        } catch (error) {
          console.error("Error al disparar pánico:", error);
          alert("Error de conexión al enviar la alerta.");
        }
      }, 
      (err) => {
        alert("Error al capturar el GPS. Verifica que tengas la ubicación activada.");
      }, 
      { enableHighAccuracy: true } // Pedimos la máxima precisión posible para emergencias
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      
      {/* 2. EL RADAR GPS: Corre de fondo en todas las páginas del cobrador */}
      <LocationTracker /> 

      <div className="w-full sm:max-w-md bg-white min-h-screen shadow-xl flex flex-col relative">
        
        {/* Header */}
        <header className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            
            {/* BOTÓN DE PÁNICO ACTUALIZADO */}
            <button 
              type="button" 
              onClick={manejarPanico}
              className="bg-red-600 hover:bg-red-700 w-10 h-10 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)] active:scale-90 transition-all"
              title="Emergencia"
            >
              🚨
            </button>

            <h1 className="text-base sm:text-lg font-bold truncate">App Cobrador</h1>
          </div>

          <button 
            onClick={() => signOut({ callbackUrl: "/auth/login" })} 
            className="text-xs bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-600/30 active:bg-red-600 active:text-white transition-all shrink-0"
          >
            Salir
          </button>
        </header>

        {/* Contenido */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        {/* Barra inferior */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <Link href="/cobrador" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/cobrador' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-bold mt-1 uppercase">Inicio</span>
          </Link>
          <Link href="/cobrador/ruta" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/cobrador/ruta' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="text-xl">🗺️</span>
            <span className="text-[10px] font-bold mt-1 uppercase">Mi Ruta</span>
          </Link>
          <Link href="/cobrador/caja" className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/cobrador/caja' ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="text-xl">💵</span>
            <span className="text-[10px] font-bold mt-1 uppercase">Caja</span>
          </Link>
        </nav>
        
      </div>
    </div>
  );
}