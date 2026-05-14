"use client"; 

import { eliminarCobrador } from "../actions";

export default function BotonEliminar({ id }: { id: string }) {
  return (
    <form action={eliminarCobrador} onSubmit={(e) => {
      if(!confirm("¿Estás seguro de eliminar a este cobrador?")) {
        e.preventDefault();
      }
    }}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="text-red-600 hover:text-red-800 text-xs font-bold uppercase tracking-tighter"
      >
        Borrar
      </button>
    </form>
  );
}