# Cuidary — estado del proyecto (2026-10-13)

App de CareTech (Expo/React Native + Firebase, plan Spark/gratuito) que conecta familias chilenas con cuidadores para adultos mayores. Este documento resume todo lo construido hasta ahora para poder seguir trabajando desde otro computador.

## Cómo levantar el proyecto en un computador nuevo

```bash
git clone https://github.com/jrodrigogonzalezv/cuidary.git
cd cuidary
npm install

# Herramientas necesarias (una vez por máquina):
npm install -g eas-cli            # o usar: npx eas-cli@latest
firebase login                    # cuenta con acceso al proyecto Firebase "cuidary"
eas login                         # cuenta Expo/EAS: jrodrigogonzalezv

# Desarrollo rápido con recarga en vivo (requiere el dev-client instalado en el celular,
# ver build "development" más abajo):
npx expo start --dev-client --tunnel
```

El proyecto ya tiene `google-services.json` y `GoogleService-Info.plist` commiteados (son config de cliente de Firebase, no son secretos — Firebase se protege con las Firestore Security Rules, no ocultando este archivo).

- Firebase project id: **cuidary**
- Android package / iOS bundle id: **cl.cuidary.app**
- Expo/EAS owner: **jrodrigogonzalezv**, EAS projectId en `app.json` → `extra.eas.projectId`

## Comandos clave

```bash
npx tsc --noEmit        # typecheck — debe salir limpio antes de dar algo por terminado
npx expo lint           # lint
npx expo-doctor         # chequeo de dependencias/config (debe dar 21/21)
firebase deploy --project cuidary --only firestore:rules     # publicar reglas
firebase deploy --project cuidary --only firestore:indexes   # publicar índices

# Build de APK instalable, sin depender de red/Metro (JS empaquetado dentro del APK):
eas build --platform android --profile preview --non-interactive

# Build con dev-client (para seguir iterando con recarga en vivo por túnel):
eas build --platform android --profile development --non-interactive
```

## Cuentas de prueba

- `rodrigo@system.cl` → rol **familia**
- `rodrigo@virtual...` (verificar dominio exacto; hay dos cuentas del usuario además de las demo que se borraron) → rol **cuidador**

Si alguna cuenta no entra con el rol esperado, revisar/corregir el campo `role` en `users/{uid}` en Firestore (valores válidos: `'familia' | 'cuidador'`).

## Arquitectura y stack

- **Expo SDK 57** + **Expo Router** (rutas por archivo en `src/app/`, grupos `(auth)`, `(family)`, `(caregiver)`)
- **Firebase** vía `@react-native-firebase/*` (Auth, Firestore) — API modular (`onSnapshot`, `getDoc`, `runTransaction`, etc.)
- **EAS Build** para generar APKs (perfiles `development`, `preview`, `production` en `eas.json`)
- Sin mapas reales de pago (Google Maps requiere tarjeta de crédito en GCP Billing — se intentó y la tarjeta del usuario fue rechazada). El check-in GPS usa geolocalización real (`expo-location`) + reverse geocoding gratuito, pero el **mapa visual es un placeholder animado** (radar + pin, `src/components/GpsMapPreview.tsx`), sin dependencia de red ni de ningún servicio de mapas. Decisión explícita del usuario: "Quedarnos con el radar animado".

## Modelo de datos (Firestore)

Colecciones principales (ver `src/types/models.ts` y `firestore.rules`):

- `users/{uid}` — perfil (`UserRole: 'familia' | 'cuidador'`), teléfono, foto, cuenta bancaria, rating, `workComunas` (zonas de trabajo del cuidador).
- `patients/{patientId}` — paciente/familiar cuidado: nombre, edad, comuna, nivel de dependencia, `photoUrl`, `anamnesis` (historia clínica), `emergencyContacts[]`, `activeShiftId`.
  - `patients/{id}/medications/{medId}` — plan de medicamentos prescritos (lo gestiona la familia).
- `shifts/{shiftId}` — un turno: paciente, cuidador, familia, horario, estado (`programado | activo | completado`), y ahora también `patientPhotoUrl`, `agreedAmount`, `rateUnit` (denormalizados al crear el turno, para poder calcular ganancias sin tener que volver a leer la oferta).
  - `shifts/{id}/vitalSigns`, `/medications`, `/gpsCheckins`, `/bitacoraEntries` (subcolecciones con el registro del turno; `bitacoraEntries` ahora admite `photoUrl` opcional).
- `shiftOffers/{offerId}` — marketplace de ofertas (puntuales o recurrentes/"estables"), con monto y unidad de cobro (`turno | hora | mes`).
- `notifications/{id}`, `ratings/{shiftId}` — notificaciones push-in-app y calificaciones post-turno.

`firestore.rules` tiene helpers (`shift()`, `patient()`, `offer()`) para validaciones cruzadas entre documentos. Reglas ya cubren: lectura de paciente por el cuidador asignado durante el turno activo (para ver anamnesis/contactos de emergencia), creación de turno por el cuidador al aceptar una oferta, aceptación de ofertas abiertas, etc.

## Funcionalidades implementadas

### Autenticación y onboarding
- Login/registro con email+contraseña y Google Sign-In, diseño tipo "card" sobre fondo decorativo (`AuthBackground`), validaciones (email, teléfono chileno, nombre, RUT con checksum módulo 11).
- Teléfono con **pre-formateo en vivo** a `+56 9 XXXX XXXX` (`src/components/PhoneInput.tsx`) en todos los formularios (registro, completar perfil, editar perfil, contactos de emergencia).
- Bug corregido: una condición de carrera en `AuthContext` hacía que, tras iniciar sesión, por un instante `loading=false && profile=null`, lo que mandaba al usuario a "completar perfil" en cada login aunque ya lo tuviera completo (y sobrescribía datos reales). Arreglado seteando `loading=true` inmediatamente al detectar usuario autenticado, antes de suscribirse al perfil.

### Validaciones de formularios
- `src/lib/validators.ts`: teléfono chileno, email, RUT, nombre, edad, rangos numéricos (signos vitales).
- Todos los formularios muestran error inline bajo el campo (`FieldError`) **y además** una `Alert` explícita al guardar que nombra qué campo(s) están mal (no solo el borde rojo).

### Ficha del paciente (familia)
- Foto del paciente (ahora visible también en el listado de pacientes del home de familia, no solo en la ficha).
- **Historia clínica (anamnesis)** y **contactos de emergencia** editables (`PatientHistoryManager.tsx`), visibles también para el cuidador durante el turno activo (para emergencias).
- **Sección "Turnos"** con historial completo de todos los turnos del paciente (programados/activos/completados) — cada uno lleva a una pantalla de solo lectura (`(family)/shift/[id].tsx`) con signos vitales, fármacos administrados, GPS y notas de ESE turno. Esto corrige un bug real: antes esas secciones solo se mostraban mientras `patient.activeShiftId` estaba seteado, así que la familia perdía acceso a todo el historial clínico en cuanto el turno terminaba.
- Bitácora general (`PatientBitacoraList`) con notas del cuidador, ahora también puede incluir **foto adjunta**.

### Check-in GPS estilo Didi
- Al iniciar turno o marcar check-in, se abre un modal (`gps-checkin-confirm.tsx`) con geolocalización real, reverse geocoding (dirección), y confirmación — similar a la UX de Didi/apps de delivery.
- Una vez confirmado, el perfil del turno deja de decir "marcar check-in GPS" y pasa a mostrar "En el lugar, ejecutando el turno" + dirección + lat/lng + hora + el mapa (placeholder animado).
- Puente `src/lib/locationConfirmBridge.ts` para que el modal "devuelva" un valor al llamador (Expo Router no soporta esto nativamente).

### Turno del cuidador
- Avatar del paciente: ahora sí muestra la foto real (antes nunca se pasaba el `photoUrl` al componente `Avatar`, aunque ya estaba disponible).
- Control de signos vitales y fármacos con validación de rangos.
- **Notas del turno con foto**: el cuidador puede adjuntar una foto a cada nota (botón de cámara junto al campo de texto, usando `src/lib/imagePicker.ts`), y esa foto aparece tanto en las notas del turno como en la bitácora general que ve la familia.

### Marketplace de ofertas y turnos estables/recurrentes
- La familia puede reservar un cuidador directamente (`(family)/book/[patientId].tsx`, sin precio) o publicar una oferta abierta (`(family)/offer/[patientId].tsx`, puntual o recurrente, con monto y unidad de cobro).
- El cuidador ve las ofertas abiertas filtradas por sus zonas de trabajo (`(caregiver)/offers.tsx`), y al aceptar una oferta recurrente le aparece en **"Turnos estables"** (`StableShiftsSection.tsx`) — cada día que corresponda, presiona "Iniciar turno de hoy" y se crea el turno de esa jornada.
- **Resumen de ganancias** (`EarningsSummary.tsx`, en el home del cuidador): días trabajados este mes, horas totales, y plata ganada (ya neta de la comisión Cuidary del 12%, ver `src/lib/fees.ts`), calculada a partir de `agreedAmount`/`rateUnit` que ahora se guardan en cada turno al crearlo (antes esa info solo vivía en la oferta y se perdía).
- Comisión de la plataforma: `CUIDARY_FEE_RATE = 0.12` en `src/lib/fees.ts`.

## Decisiones y callejones sin salida (para no repetirlos)

- **Mapas**: se probó `staticmap.openstreetmap.de` (dominio muerto), tiles crudos de `tile.openstreetmap.org` (funcionan en curl de sandbox pero bloquean con 403 desde el dispositivo real por política anti-abuso de OSM), y Google Maps (requiere tarjeta de crédito en GCP Billing — la tarjeta del usuario fue rechazada). Se abandonó la idea de mapa real y se quedó con el placeholder animado. Si en el futuro se consigue una tarjeta válida, el camino más directo es Google Maps vía `expo-maps` (ya se probó instalar/desinstalar sin problemas).
- **Backoffice de administración**: no se construyó (sería una app/panel web aparte, con su propio login de admin). Pero el modelo de datos ya quedó preparado para eso: cada turno guarda cuánto se acordó pagar y bajo qué unidad, así que liquidar sueldos a futuro no requiere rediseñar el esquema.

## Build y despliegue

- **Para iterar rápido sin generar APK en cada cambio**: `npx expo start --dev-client --tunnel` + instalar un build con perfil `development` (dev-client) en el celular una sola vez. Los cambios de JS se recargan solos; solo hay que reinstalar el APK si se agrega una librería nativa nueva.
- **Para un APK standalone** (sin depender de que el celular esté conectado al mismo túnel/red que el computador — el JS queda empaquetado dentro del APK): perfil `preview` o `production` en `eas.json` (ninguno tiene `developmentClient: true`).
- Repo remoto: `https://github.com/jrodrigogonzalezv/cuidary.git`, rama `main`.

## Pendientes / ideas no implementadas

- Backoffice web para la administración de la empresa (liquidaciones, gestión de cuidadores, disputas).
- Mapa real (si se resuelve el tema de la tarjeta de crédito en GCP).
- Notificaciones push nativas (hoy las "notificaciones" son documentos de Firestore leídos dentro de la app, no push real vía FCM/APNs).
