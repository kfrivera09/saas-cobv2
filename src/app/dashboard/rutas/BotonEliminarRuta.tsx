"use client"; // 👈
import { eliminarRuta } from "../actions";

export default function BotonEliminarRuta({ id, tieneClientes }: { id: string, tieneClientes: boolean }) {
  const manejarEliminacion = async (e: React.FormEvent) => {
    if (tieneClientes) {
      alert("No puedes eliminar esta ruta porque tiene clientes asignados. Primero mueve los clientes a otra ruta.");
      e.preventDefault();
      return;
    }

    if (!confirm("¿Estás seguro de eliminar esta ruta?")) {
      e.preventDefault();
    }
  };

  return (
    <form action={eliminarRuta} onSubmit={manejarEliminacion}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="text-red-600 hover:text-red-800 text-xs font-black uppercase transition-colors"
      >
        Borrar
      </button>
    </form>
  );
}