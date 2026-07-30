// Service worker mínimo para Evoluciona.
// A propósito NO cachea nada: los turnos y actividades cambian todo el
// tiempo, así que cachear datos viejos haría más daño que bien. Solo
// existe para que el navegador permita "Instalar" la app en el celular.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Deja pasar todo directo a la red, sin interceptar ni cachear.
  return;
});
