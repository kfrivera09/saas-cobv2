"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ¡ESTA ES LA LÍNEA MÁGICA QUE EVITA EL '?' Y LA RECARGA!

    // Llamamos a NextAuth para que envíe los datos al backend
    // Dentro de tu función de Login (ejemplo rápido)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // Desactivamos el redirect automático para mandarlo nosotros
    });

    if (result?.ok) {
      // Obtenemos la sesión para ver el rol
      const res = await fetch("/api/auth/session");
      const session = await res.json();

      if (session?.user?.role === "ADMIN") {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/cobrador";
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      {/* Aquí le decimos al formulario que use nuestra función al darle Entrar */}
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-center">SaaS Cobranzas</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cobranzas.com"
              className="w-full rounded border p-2 mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              className="w-full rounded border p-2 mt-1"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 py-2 text-white rounded hover:bg-blue-700 transition-colors">
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}