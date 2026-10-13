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

### Marketplace de ofertas, postulación y turnos estables/recurrentes
- La familia puede reservar un cuidador directamente (`(family)/book/[patientId].tsx`, sin precio) o publicar una oferta abierta (`(family)/offer/[patientId].tsx`, puntual o recurrente, con monto y unidad de cobro).
- **El cuidador se postula, la familia elige** (cambio importante, ver actualización 2026-10-13 abajo): el cuidador ya NO queda asignado de inmediato al aceptar una oferta. Se postula (`(caregiver)/offers.tsx`, pestaña "Disponibles" → botón "Postularme"), y la familia revisa a los postulantes (`(family)/offers.tsx` → `(family)/offer-applicants/[offerId].tsx`) viendo su rating, insignias de reputación y comentarios, y elige quién se queda con el turno.
- Al elegir, para ofertas recurrentes le aparece al cuidador elegido en **"Turnos estables"** (`StableShiftsSection.tsx`) — cada día que corresponda, presiona "Iniciar turno de hoy" y se crea el turno de esa jornada.
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

- **Backoffice web para la administración de la empresa** — ver sección dedicada abajo con el plan para cuando se quiera construir.
- Mapa real (si se resuelve el tema de la tarjeta de crédito en GCP).
- Notificaciones push reales entre dispositivos (hoy son documentos de Firestore + un aviso local en el propio teléfono mientras la app está abierta/en segundo plano — ver actualización 2026-10-13; un push que llegue con la app cerrada requiere FCM + un backend o Cloud Function, lo cual en Firebase requiere plan Blaze/tarjeta de crédito).
- Botón para que el cuidador retire una postulación pendiente (la regla de Firestore ya lo permite — `allow delete` en `shiftOffers/{id}/applications/{caregiverUid}` — falta solo el botón en la UI).

## Actualización 2026-10-13 (segunda pasada) — postulación con revisión, notificaciones, reputación con insignias

Pedido del usuario: que la familia revise y elija al cuidador en vez de que quede asignado de inmediato al postularse; que existan notificaciones de verdad; captura de errores en toda la app (antes varias operaciones fallaban en silencio); y un sistema de evaluación con etiquetas de comportamiento (amabilidad, puntualidad, etc.) visible cuando un cuidador se postula. El backoffice se deja documentado pero no se construyó (decisión explícita: "podemos desarrollarlo después").

### Postulación con revisión de la familia (el cambio de fondo)
Antes, `(caregiver)/offers.tsx` ponía `shiftOffers.status = 'asignada'` apenas el cuidador tocaba "Aceptar", y además para turnos puntuales creaba el `shift` en el mismo paso — sin que la familia interviniera. Eso es lo que probablemente generaba el problema que describió el usuario (quedaba "aceptado" pero después la lectura/escritura fallaba en algún punto sin avisar nada, porque no había manejo de errores en ningún lado de ese flujo).

Rediseño:
- Nueva subcolección `shiftOffers/{offerId}/applications/{caregiverUid}` (tipo `OfferApplication` en `src/types/models.ts`): el cuidador crea su propia postulación (`status: 'pendiente'`), nunca toca el documento de la oferta.
- `(caregiver)/offers.tsx`: pestañas "Disponibles" (postularme) y "Mis postulaciones" (ver si quedó `pendiente` / `elegido` / `rechazado`).
- `(family)/offers.tsx` ("Mis ofertas", nuevo tab de familia) lista las ofertas publicadas con el conteo de postulantes en vivo.
- `(family)/offer-applicants/[offerId].tsx` (nuevo): la familia ve cada postulante con su `CaregiverReputationCard` (estrellas, insignias de reputación más frecuentes, último comentario) y un botón "Elegir a este cuidador". Al elegir: la oferta pasa a `asignada`, se crea el `shift` (si es puntual), y se notifica a todos los postulantes (elegido vs. no elegido).
- `firestore.rules`: se eliminó la regla que dejaba a cualquier cuidador poner `status: 'asignada'` por su cuenta; se agregaron las reglas de `applications` (crear la propia, leer la familia dueña de la oferta o el propio cuidador, actualizar solo la familia y solo el campo `status`, eliminar solo el propio cuidador mientras esté `pendiente`). No hizo falta tocar las reglas de `shifts` — la familia ya podía crear turnos para su propio paciente.
- Nuevos índices en `firestore.indexes.json`: `applications` (COLLECTION_GROUP, `caregiverUid`+`appliedAt`, para "Mis postulaciones") y `ratings` (`caregiverUid`+`createdAt`, para la reputación).

### Notificaciones
- Antes **solo existía la pantalla de notificaciones para el cuidador** — la familia nunca tuvo bell ni pantalla, aunque `notifyFamily()` sí escribía documentos para ellos. Se agregó `(family)/notifications.tsx` + `NotificationBell` en el home de familia (antes faltaba por completo).
- Se extrajo la lógica común a `src/lib/useNotifications.ts` (hook) + `src/components/NotificationsList.tsx` (presentación), para no duplicar código entre ambos roles.
- **Avisos locales en el teléfono** (`src/lib/notifications.ts`, paquete `expo-notifications`): cuando llega una notificación nueva sin leer, además de aparecer en la campanita, se muestra como notificación nativa del sistema (banner), igual que cualquier app. Se activa automáticamente desde `AuthContext.tsx` para cualquier usuario autenticado, sin importar en qué pantalla esté.
  - **Limitación importante y honesta**: esto funciona mientras la app está abierta o en segundo plano (el proceso de JS sigue vivo). No es un push real que llegue con la app completamente cerrada — eso requiere un token FCM + un servidor o Cloud Function que lo dispare, y en Firebase eso exige el plan Blaze (tarjeta de crédito), que es justo la restricción que este proyecto ha evitado desde el principio. Si en algún momento se acepta pagar por Blaze, el siguiente paso sería una Cloud Function `onCreate` sobre `notifications/{id}` que llame a la Admin SDK de FCM.

### Captura de errores
Antes, casi ninguna escritura a Firestore tenía `catch` — si la regla de seguridad rechazaba la operación (por ejemplo, por datos que cambiaron entre medio), la promesa fallaba sin que nada se mostrara en pantalla. Se agregó `src/lib/errors.ts` (`reportError(title, error)`, con mensajes en español distinguiendo "sin permiso"/"sin conexión"/otro) y se envolvió en `try/catch` todas las acciones que escriben datos: iniciar turno, check-in GPS, signos vitales, administrar medicamento, agregar nota, finalizar turno (`(caregiver)/shift/[id].tsx`), postularse y elegir cuidador (ofertas), reservar turno directo, publicar oferta, enviar evaluación (`RatingPrompt.tsx`), iniciar turno estable del día (`StableShiftsSection.tsx`).

### Reputación con insignias de comportamiento
- `Rating.tags?: RatingTag[]` (`amabilidad`, `puntualidad`, `limpieza`, `empatia`, `orden`, `buen_trato`, `responsabilidad`, `comunicacion` — ver `src/lib/ratingTags.ts`). La familia los elige como chips al evaluar un turno completado (`RatingPrompt.tsx`), junto con las estrellas y el comentario de siempre (eso ya existía).
- `CaregiverReputationCard.tsx` (nuevo, reutilizable): dado un `caregiverUid`, muestra las estrellas, las 3 insignias más frecuentes de sus últimas evaluaciones, y el comentario más reciente. Se usa en la pantalla de postulantes de la familia y en el propio perfil del cuidador (`(caregiver)/profile.tsx`).
- No se tocó `firestore.rules` para esto — la regla de `ratings.create` ya no restringía qué campos adicionales se podían guardar.
- **Pendiente obvio y fácil**: mostrar esta misma tarjeta en la lista de cuidadores de la reserva directa (`(family)/book/[patientId].tsx`), hoy solo muestra estrellas simples. Se dejó fuera para no multiplicar listeners de Firestore en una lista que puede tener muchos cuidadores — es la misma lógica, solo falta reemplazar el `StarRatingDisplay` por `CaregiverReputationCard` ahí si se quiere.

### Backoffice (plan para más adelante, no construido)
El usuario pidió "casi un monitoreo en línea": cuántos pacientes, cuántos cuidadores, cómo se comportan, gestionar solicitudes de familias. No se construyó porque es una superficie de app distinta (un panel web, con su propio login de administrador), pero es importante dejar claro que **no requiere plan Blaze ni backend**: se puede hacer como una segunda app (web, React/Vite por ejemplo) que:
1. Usa el mismo proyecto Firebase (`cuidary`) con el SDK de cliente (igual que esta app).
2. Agrega un rol `admin` a `users/{uid}.role` (o un custom claim) y una regla nueva en `firestore.rules` que le dé lectura total (`allow read: if isSignedIn() && isAdmin();`) — no hay que tocar nada de lo que ya existe.
3. Pantallas de solo lectura (o acciones puntuales) sobre las colecciones que ya existen: cuántos `patients`, `users` por rol, `shifts` por estado, `shiftOffers` abiertas/asignadas, `ratings` recientes para detectar cuidadores con mal desempeño.
4. Todo esto es Firestore puro — nada de Cloud Functions ni servidores, así que sigue siendo gratis en el plan Spark.

Cuando se quiera retomar esto, lo más simple es partir un proyecto Expo/web o Vite nuevo (fuera de este repo de la app móvil) que apunte al mismo `google-services.json`/config de Firebase.

### APK y rama de git
- Se generó un nuevo APK standalone (perfil `preview`) con todos los cambios de esta pasada — revisar el mensaje de Claude en la conversación para el link de descarga directa (no caduca pronto, y no requiere cuenta de Expo para instalarlo en otro teléfono; solo activar "instalar apps de orígenes desconocidos" en Android).
- Todo este trabajo se subió a una rama nueva (no a `main`) para poder revisarlo antes de fusionar: `2026-10-13-ofertas-postulacion-notificaciones-reputacion`.
