"use client";

import dynamic from "next/dynamic";

// Aquí sí podemos usar ssr: false porque este es un Client Component
const MapaSeguimiento = dynamic(() => import("./MapaSeguimiento"), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold">
      Iniciando Radar GPS...
    </div>
  )
});

interface Punto {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
  subtitulo?: string;
  tipo: "CLIENTE" | "COBRADOR"| "PANICO";
}

export default function DashboardMapWrapper({ puntos, center }: { puntos: Punto[], center: [number, number] }) {
  return (
    <div className="h-[450px] w-full bg-white rounded-[2.5rem] p-4 shadow-xl border border-slate-100 overflow-hidden relative z-0">
      <MapaSeguimiento puntos={puntos} center={center} />
    </div>
  );
}