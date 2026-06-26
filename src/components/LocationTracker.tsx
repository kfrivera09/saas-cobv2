"use client";

import { useEffect, useRef } from "react";
import { registrarUbicacion } from "../app/cobrador/actions";

export default function LocationTracker() {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("❌ Geolocation no soportada");
      return;
    }

    const enviar = async (lat: number, lng: number) => {
      try {
        await registrarUbicacion(lat, lng);
      } catch (error) {
        console.error("❌ Error al enviar ubicación:", error);
      }
    };

    const exito = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      enviar(latitude, longitude);
    };

    const error = (err: GeolocationPositionError) => {
      if (err.code === 1) {
        alert("Por favor, permite el acceso al GPS en el candado de la barra de direcciones.");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      exito,
      error,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return null;
}
