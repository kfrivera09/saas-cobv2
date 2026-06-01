// src/middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  // Define aquí las rutas que deseas proteger.
  // El asterisco (*) asegura que todas las subrutas también estén protegidas.
  matcher: [
    "/dashboard/:path*",
    "/cobrador/:path*"
  ]
};