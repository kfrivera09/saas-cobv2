"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// =================================================================
// ICONOS HTML (Estáticos, rápidos y no se despegan con el zoom)
// =================================================================

// 1. Trabajador (Círculo azul con personita)
const iconCobrador = L.divIcon({
  className: "bg-transparent", // Reseteamos la clase de Leaflet
  html: `<div class="flex items-center justify-center w-8 h-8 bg-blue-600 border-2 border-white rounded-full shadow-lg text-lg">👤</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16], // Anclado EXACTAMENTE en el centro matemático (mitad de 32)
  popupAnchor: [0, -16]
});

// 2. Alerta de Pánico (Sirena roja parpadeante)
// Cambiamos 'animate-bounce' por 'animate-pulse' para que no pelee con el Transform de Leaflet
const iconPanico = L.divIcon({
  className: "bg-transparent",
  html: `<div class="flex items-center justify-center w-10 h-10 bg-red-600 border-2 border-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] text-xl animate-pulse">🚨</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20], // Anclado EXACTAMENTE en el centro
  popupAnchor: [0, -20]
});

// 3. Cliente (Punto gris discreto)
const iconCliente = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-4 h-4 bg-slate-400 border-2 border-white rounded-full shadow-sm"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

// Función para seleccionar el icono
const getIcon = (tipo: string) => {
  if (tipo === "COBRADOR") return iconCobrador;
  if (tipo === "PANICO") return iconPanico;
  return iconCliente;
};
 
// Interfaz de tipos
interface Punto {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
  subtitulo?: string;
  tipo: "CLIENTE" | "COBRADOR" | "PANICO";
}

export default function MapaSeguimiento({ puntos, center }: { puntos: Punto[], center: [number, number] }) {
  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      className="h-full w-full rounded-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={getIcon(p.tipo)}>
          <Popup>
            <div className="text-center p-1">
              <p className={`font-black m-0 ${p.tipo === 'PANICO' ? 'text-red-600 text-base' : 'text-slate-800'}`}>
                {p.nombre}
              </p>
              {p.subtitulo && <p className="text-[10px] font-bold text-slate-500 m-0 mt-1">{p.subtitulo}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}