# Evoluciona

Sistema inteligente de planificación de actividades y turnos, conectado a Supabase.

## Requisito previo
Ya debiste ejecutar `schema.sql` en el SQL Editor de tu proyecto de Supabase (tablas `personal`, `actividades`, `turnos`, `usuarios`).

## Probar en tu computador

```bash
npm install
cp .env.local.example .env.local   # ya trae tu URL y llave, revísalas
npm run dev
```

Abre http://localhost:3000 — como corre en un navegador real (no en un sandbox de vista previa), la conexión a Supabase funcionará de verdad: crea una actividad, recarga la página, y debe seguir ahí.

## Desplegar en Vercel (para usarlo desde cualquier lugar)

1. Sube esta carpeta a un repositorio de GitHub.
2. Entra a https://vercel.com → **Add New Project** → importa el repositorio.
3. En **Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_KEY`
4. Clic en **Deploy**. En ~1 minuto tendrás una URL pública (`https://evoluciona.vercel.app` o similar) con la app real.

## Pendiente de seguridad antes de usar con datos reales de la institución
Las políticas de la base de datos (RLS) están abiertas para que el prototipo funcione de inmediato. Antes de producción real:
- Activar Supabase Auth (login con correo/contraseña).
- Cambiar las políticas en Supabase para exigir `auth.uid() is not null` en escritura.
- Opcionalmente restringir por rol usando la tabla `usuarios`.
