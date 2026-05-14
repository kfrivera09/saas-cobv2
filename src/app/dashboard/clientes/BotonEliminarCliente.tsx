"use client";

import { eliminarCliente } from "../actions";

export default function BotonEliminarCliente({ id, tienePrestamos }: { id: string, tienePrestamos: boolean }) {
  const manejarEliminacion = (e: React.FormEvent) => {
    if (tienePrestamos) {
      alert("No puedes eliminar a este cliente porque tiene préstamos asociados. Debes anular o terminar los préstamos primero.");
      e.preventDefault();
      return;
    }

    if (!confirm("¿Estás seguro de eliminar a este cliente? Esta acción es irreversible.")) {
      e.preventDefault();
    }
  };

  return (
    <form action={eliminarCliente} onSubmit={manejarEliminacion}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="text-red-600 hover:text-red-800 text-[10px] font-black uppercase tracking-tighter"
      >
        Borrar
      </button>
    </form>
  );
}