"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Estado para controlar si el sidebar está abierto o cerrado en móvil
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menu = [
    { name: "Inicio", href: "/dashboard" },
    { name: "Cobradores", href: "/dashboard/cobradores" },
    { name: "Rutas", href: "/dashboard/rutas" },
    { name: "Clientes", href: "/dashboard/clientes" },
    { name: "Prioridad", href: "/dashboard/prioridad" },
    { name: "Préstamos", href: "/dashboard/prestamos" },
    { name: "Monitoreo", href: "/dashboard/monitoreo" },
    { name: "Cambiar Contraseña", href: "/dashboard/cambio-clave" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* 1. Overlay oscuro: Aparece en móvil cuando el menú está abierto para poder hacer clic fuera y cerrarlo */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar (Barra Lateral) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-400">MENU</h2>
          {/* Botón X para cerrar en móvil */}
          <button 
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {menu.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)} // Cierra el menú automáticamente al hacer clic en un enlace (útil en móvil)
              className={`block px-4 py-2 rounded-md transition-colors ${
                pathname === item.href ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 3. Contenido Principal */}
      {/* min-w-0 es súper importante aquí para que las tablas no desborden la pantalla */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center px-4 md:px-8 shadow-sm">
          {/* Botón Hamburguesa (solo visible en móvil) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 mr-4 text-gray-600 hover:bg-gray-100 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-xl font-semibold text-gray-700 truncate">Panel de Administración</h1>
        </header>

        {/* Área donde cargan las páginas */}
        {/* Padding reducido en móvil (p-4) y normal en escritorio (md:p-8) */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}