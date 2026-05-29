"use client";

import { useActionState } from "react";
import { registrarPagoCuota } from "../../actions";

export default function FormularioPago({ cuotaHoy, loanId }: { cuotaHoy: any, loanId: string }) {
  // 'state' es donde llegará el mensaje de error [cite: 132]
  const [state, formAction, isPending] = useActionState(registrarPagoCuota, null);

  return (
    <form action={formAction} className="space-y-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-gray-800 text-center uppercase text-xs tracking-widest">Registrar Cobro</h3>
      
      {/* 🚀 AQUÍ APARECERÁ EL MENSAJE SI INTENTA COBRAR DOS VECES */}
      {state?.error && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-red-700 text-xs font-black text-center animate-bounce">
          {state.error}
        </div>
      )}

      <input type="hidden" name="loanId" value={loanId} />
      <input type="hidden" name="installmentId" value={cuotaHoy?.id} />
      
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase mb-1 ml-1">Monto Recibido</label>
        <input 
          type="number" 
          name="amount" 
          defaultValue={cuotaHoy?.amountDue} 
          className="w-full text-3xl font-black text-center bg-slate-50 rounded-2xl p-5 border-none outline-none focus:ring-2 focus:ring-blue-500"
          required 
        />
      </div>

      <button 
        type="submit" 
        disabled={isPending}
        className={`w-full font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 ${
          isPending ? 'bg-gray-400' : 'bg-slate-900 text-white'
        }`}
      >
        {isPending ? "PROCESANDO..." : "CONFIRMAR PAGO ✅"}
      </button>
    </form>
  );
}