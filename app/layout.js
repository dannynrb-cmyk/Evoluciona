import RegisterSW from "../components/RegisterSW";

export const metadata = {
  title: "Evoluciona",
  description: "Sistema inteligente de planificación de actividades y turnos.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Evoluciona",
  },
};

export const viewport = {
  themeColor: "#1B6E58",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
