"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menu = [
    { name: "Inicio", href: "/dashboard" },
    { name: "Cobradores", href: "/dashboard/cobradores" },
    { name: "Rutas", href: "/dashboard/rutas" },
    { name: "Clientes", href: "/dashboard/clientes" },
    { name: "Préstamos", href: "/dashboard/prestamos" },
    { name: "Monitoreo", href: "/dashboard/monitoreo" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (Barra Lateral) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-blue-400">Cobranzas VIP</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menu.map((item) => (
            <Link
              key={item.name}
              href={item.href}
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

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-700">Panel de Administración</h1>
        </header>

        {/* Área donde cargan las páginas */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}