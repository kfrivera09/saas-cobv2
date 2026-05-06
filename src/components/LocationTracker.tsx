"use client";

import { useEffect } from "react";
import { registrarUbicacion } from "../app/cobrador/actions";

export default function LocationTracker() {
  useEffect(() => {
    const enviar = () => {
      console.log("🛰️ Iniciando ciclo de GPS...");

      if (!navigator.geolocation) {
        console.error("❌ Geolocation no soportada");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`📍 Coordenadas capturadas: ${latitude}, ${longitude}`);
          
          try {
            // Llamada a la Server Action
            await registrarUbicacion(latitude, longitude);
            console.log("✅ Servidor respondió correctamente");
          } catch (error) {
            console.error("❌ Error al enviar al servidor:", error);
          }
        },
        (error) => {
          console.error("❌ Error de GPS detalle:", error.message);
          // Si ves este alert, el problema es el permiso del navegador
          if (error.code === 1) alert("Por favor, permite el acceso al GPS en el candado de la barra de direcciones.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    enviar();
    const interval = setInterval(enviar, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  return null;
}