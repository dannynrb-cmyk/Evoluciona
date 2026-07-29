export const metadata = {
  title: "Evoluciona",
  description: "Sistema inteligente de planificación de actividades y turnos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
