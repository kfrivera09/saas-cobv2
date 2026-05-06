import "./globals.css";
import { NextAuthProvider } from "./auth-provider"; // Nota el ./ porque están en la misma carpeta

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}