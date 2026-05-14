"use client";

import { anularPrestamo } from "../actions";

export default function BotonAnular({ id }: { id: string }) {
  return (
    <form action={anularPrestamo} onSubmit={(e) => {
      if(!confirm("¿Estás seguro de ANULAR este préstamo? Se detendrán los cobros y el saldo pasará a cero.")) {
        e.preventDefault();
      }
    }}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="text-orange-600 hover:text-orange-800 text-[10px] font-black uppercase tracking-tighter"
      >
        Anular
      </button>
    </form>
  );
}