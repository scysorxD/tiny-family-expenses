# Especificación completa - App de gastos familiares compartidos

## 1. Objetivo del documento

Este documento define al 100% el alcance funcional, técnico y de UX para construir una app móvil Android usando **Angular + Ionic + Capacitor + Supabase**.

El objetivo es que este documento pueda ser entregado a Codex, GitHub Copilot u otra herramienta de generación de código para implementar la aplicación con la menor ambigüedad posible.

---

# 2. Resumen del producto

La app permite administrar gastos familiares compartidos dentro de una o varias **salas**.

Caso principal:

- Una pareja convive con los padres de uno de ellos.
- Los gastos de los padres son compartidos por varios hermanos.
- Actualmente los gastos se escriben en un grupo de WhatsApp, por ejemplo:
  - `Medicina papá 30000`
  - `Taxi 20000`
  - `Cena 40000`
- A fin de mes una persona suma manualmente todo y les cobra a los hermanos.

La app reemplaza ese proceso manual.

La app debe permitir:

- Crear una sala de gastos, por ejemplo `Gastos padres`.
- Invitar usuarios reales que pueden cargar gastos.
- Cargar gastos rápidamente con categoría, monto, beneficiario, fecha y descripción opcional.
- Definir beneficiarios internos, por ejemplo `Mamá`, `Papá` o ambos.
- Definir pagantes internos, por ejemplo `Hermano 1`, `Hermano 2`, `Mi esposa`.
- Sumar automáticamente los gastos por mes.
- Cerrar un mes.
- Calcular cuánto debe pagar cada pagante.
- Generar un mensaje editable para cobrar.
- Copiar o compartir ese mensaje por cualquier app.
- Guardar el mensaje final enviado.
- Marcar qué pagantes ya pagaron.
- Ver qué meses están abiertos, cerrados, parcialmente cobrados o cobrados al 100%.
- Usar la app de forma rápida, simple y con pocos clicks.
- Guardar gastos localmente primero y sincronizarlos luego con Supabase.

---

# 3. Principios del producto

## 3.1 Simplicidad antes que inteligencia

La app no debe depender de texto libre ni de interpretación automática de frases.

No se debe implementar inicialmente una entrada tipo chat como:

```text
medicina para papa que me costo 30000 y lo compre en farmacity
```

En su lugar, la carga debe ser estructurada, rápida y con pocos campos.

El flujo ideal es:

```text
Abrir app
Tocar + Gasto
Seleccionar categoría
Ingresar monto
Guardar
```

## 3.2 La pantalla principal debe estar orientada a cargar gastos

El dashboard no debe ser la pantalla principal.

La acción más importante es cargar gastos de forma rápida.

Al abrir la app, si el usuario ya usó una sala previamente, debe entrar directamente a la última sala utilizada.

## 3.3 Los pagantes no son usuarios de la app

Los pagantes son solo datos internos de la sala.

Ejemplo:

- Hermano 1
- Hermano 2
- Mi esposa

Estos no tienen login, no reciben invitación y no ven la sala.

Sirven solo para calcular cuánto debe pagar cada uno y marcar si pagaron o no.

## 3.4 Los beneficiarios tampoco son usuarios de la app

Los beneficiarios son las personas a quienes aplica el gasto.

Ejemplo:

- Mamá
- Papá

Un gasto puede aplicar a:

- Mamá
- Papá
- Ambos

Si la sala tiene un solo beneficiario, el selector de beneficiario no debe mostrarse porque siempre aplica a esa persona.

## 3.5 Offline simple, no estilo WhatsApp completo

La app debe guardar siempre local primero.

Después debe intentar sincronizar cuando:

- La app está abierta.
- La app vuelve al foreground.
- Hay conexión disponible.
- El usuario toca un botón de sincronizar manualmente.

No se requiere en MVP que sincronice con la app totalmente cerrada como WhatsApp.

---

# 4. Glosario de conceptos

## 4.1 Sala

Una sala representa un grupo de gastos.

Ejemplos:

- `Gastos padres`
- `Abuelos`
- `Mascotas familiares`
- `Vacaciones familiares`

Cada sala tiene sus propias categorías, beneficiarios, pagantes, usuarios invitados y períodos mensuales.

## 4.2 Usuario de sala

Persona real que usa la app y tiene acceso a una sala.

Roles:

- `admin`
- `guest`

## 4.3 Admin

Usuario con control total de la sala.

Puede:

- Cargar gastos.
- Editar gastos.
- Eliminar gastos lógicamente.
- Crear categorías.
- Editar categorías.
- Desactivar categorías.
- Cerrar meses.
- Reabrir meses.
- Generar mensajes de cobro.
- Editar mensajes de cobro antes de guardarlos.
- Copiar o compartir mensajes.
- Marcar pagantes como pagados.
- Configurar sala.
- Invitar usuarios.

## 4.4 Invitado / Guest

Usuario con acceso limitado.

Puede:

- Cargar gastos.
- Ver gastos de la sala.
- Crear categorías.
- Editar categorías.
- Desactivar categorías.
- Editar gastos mientras el mes está abierto.

No puede:

- Cerrar meses.
- Reabrir meses.
- Marcar pagantes como pagados.
- Configurar pagantes.
- Configurar sala.
- Invitar usuarios.

## 4.5 Beneficiario

Persona a quien aplica el gasto.

Ejemplo:

- Mamá
- Papá

Un gasto puede aplicar a uno o más beneficiarios.

En UI se debe mostrar:

```text
[Ambos] [Mamá] [Papá]
```

Si hay dos beneficiarios, `Ambos` debe ser la opción default.

Internamente, si se elige `Ambos`, el gasto se relaciona con ambos beneficiarios.

## 4.6 Pagante

Persona que debe pagar una parte del total mensual.

Ejemplo:

- Hermano 1
- Hermano 2
- Mi esposa

No tiene acceso a la app. Es solo un registro interno.

Sirve para:

- Calcular división mensual.
- Marcar si pagó.
- Ver estados de cobro.

## 4.7 Categoría

Tipo de gasto.

Ejemplos:

- Medicina
- Transporte
- Alimentación
- Supermercado
- Ropa
- Cuidado personal
- Servicios
- Otros

Las categorías pueden crearse, editarse y desactivarse.

No se puede eliminar una categoría que ya tenga gastos asociados.

## 4.8 Período

Representa un mes dentro de una sala.

Ejemplo:

- Mayo 2026
- Junio 2026

Internamente se recomienda usar `month_key` con formato:

```text
YYYY-MM
```

Ejemplo:

```text
2026-05
```

Estados posibles:

- `open`
- `closed`
- `partially_paid`
- `paid`

---

# 5. Alcance del MVP

## 5.1 Incluido en MVP

El MVP debe incluir:

- Login básico con Supabase Auth.
- Crear sala.
- Invitar usuarios a sala.
- Roles `admin` y `guest`.
- Crear beneficiarios.
- Crear pagantes.
- Crear categorías.
- Editar categorías.
- Desactivar categorías.
- Sugerir categorías más usadas al cargar gasto.
- Cargar gasto.
- Guardar gasto local primero.
- Sincronizar gasto con Supabase.
- Ver gastos del mes actual.
- Ver total del mes.
- Ver gastos agrupados por categoría.
- Cambiar fecha del gasto.
- Bloquear carga en meses cerrados.
- Cerrar mes.
- Reabrir mes solo admin.
- Calcular total del mes.
- Calcular monto por pagante.
- Generar mensaje de cobro.
- Editar mensaje de cobro.
- Copiar mensaje.
- Compartir mensaje usando el share nativo del dispositivo.
- Guardar mensaje final.
- Marcar pagante como pagado.
- Ver estado de cobro del mes.
- Recordar última sala abierta por usuario.
- Sincronización manual.
- Indicador de gastos pendientes de sincronizar.

## 5.2 No incluido en MVP

No incluir inicialmente:

- OCR de tickets.
- Lectura automática de WhatsApp.
- Envío automático por WhatsApp.
- Push notifications.
- Background sync garantizado con app cerrada.
- Roles de solo lectura.
- Acceso de pagantes a la app.
- División por porcentajes.
- División desigual por gasto.
- Exportación a PDF.
- Exportación a Excel.
- Multi-moneda avanzada.
- Realtime obligatorio.
- Dashboard muy avanzado.

---

# 6. Stack técnico recomendado

## 6.1 Frontend móvil

Usar:

- Angular
- Ionic
- Capacitor
- TypeScript

Objetivo inicial:

- Android app.

Posible futuro:

- PWA.
- iOS.

## 6.2 Backend

Usar:

- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Supabase Storage opcional para futuros comprobantes

## 6.3 Local storage / offline

Usar una capa local para guardar datos antes de sincronizar.

Opciones:

- SQLite vía Capacitor plugin.
- Ionic Storage como alternativa más simple.

Recomendación:

- Para MVP, usar almacenamiento local con una cola de sincronización.
- Si se quiere una base local más robusta, usar SQLite.

---

# 7. Arquitectura general

## 7.1 Principio local-first simple

Cuando el usuario crea un gasto:

1. El gasto se guarda localmente.
2. Se muestra inmediatamente en la UI.
3. Queda con estado `pending_sync`.
4. La app intenta sincronizarlo con Supabase.
5. Si se sincroniza correctamente, queda como `synced`.
6. Si falla, queda como `pending_sync` o `sync_failed`.

Nunca se debe bloquear al usuario esperando internet.

## 7.2 Flujo de sincronización

La app debe intentar sincronizar:

- Al iniciar la app.
- Al entrar a una sala.
- Al volver del background.
- Al detectar conexión.
- Al tocar `Sincronizar ahora`.
- Cada cierto intervalo mientras la app está abierta, por ejemplo cada 30 o 60 segundos.

## 7.3 No garantizar envío con app cerrada

No es requisito del MVP que la sincronización ocurra cuando la app está totalmente cerrada.

La app debe mostrar claramente si hay pendientes:

```text
2 gastos pendientes de sincronizar
```

---

# 8. Pantallas principales

## 8.1 Login

Debe permitir:

- Login con email/password.
- Registro con email/password.
- Recuperar contraseña, opcional en MVP.

## 8.2 Home / lista de salas

Debe mostrar las salas del usuario.

Ejemplo:

```text
Gastos padres
Mayo 2026
Total actual: $90.000
Estado: Abierto
Pendientes de sync: 0
```

Acciones:

- Entrar a sala.
- Crear sala.
- Aceptar invitación, si aplica.

Regla:

- Si el usuario tiene una última sala abierta guardada, al abrir la app debe entrar directamente a esa sala.
- Desde dentro de una sala debe existir una forma de volver a la lista de salas.

## 8.3 Pantalla principal de sala

Esta es la pantalla más importante.

Debe estar optimizada para cargar gastos rápido.

Contenido sugerido:

```text
Gastos padres
Mayo 2026
Total actual: $90.000
Estado: Abierto

[+ Agregar gasto]

Últimos gastos:
- Medicina / Papá / $30.000
- Taxi / Mamá / $20.000
- Comida / Ambos / $40.000

Accesos:
Resumen | Cobros | Categorías | Configuración
```

El botón `+ Agregar gasto` debe ser muy visible.

Idealmente usar un Floating Action Button.

## 8.4 Modal / pantalla de nuevo gasto

Debe abrirse rápido.

Campos:

1. Categoría.
2. Monto.
3. Beneficiario, si aplica.
4. Fecha.
5. Descripción opcional.

### 8.4.1 Categoría

Debe permitir seleccionar categoría desde dropdown, lista o chips.

Requisito importante:

- La app debe sugerir primero las categorías más usadas dentro de esa sala.

Comportamiento:

- Mostrar al inicio 3 a 5 categorías más usadas.
- Debajo permitir abrir dropdown completo.
- Permitir buscar categoría.
- Permitir crear categoría nueva desde el flujo si no existe.

Ejemplo UI:

```text
Categoría
Sugeridas:
[Medicina] [Taxi] [Comida]

Todas las categorías:
[Seleccionar...]
```

Si se crea una nueva categoría desde el modal:

- Debe guardarse en la sala.
- Debe seleccionarse automáticamente para el gasto actual.

### 8.4.2 Monto

Campo obligatorio.

Reglas:

- Debe aceptar números positivos.
- Debe aceptar separador de miles visual, pero guardar número decimal.
- No permitir monto cero.
- No permitir monto negativo.

Ejemplos válidos:

```text
30000
30.000
30000,50
```

Guardar internamente como decimal/numeric.

### 8.4.3 Beneficiario

Si la sala tiene un solo beneficiario activo:

- No mostrar selector.
- Usar automáticamente ese beneficiario.

Si la sala tiene dos o más beneficiarios activos:

- Mostrar opciones.
- Si hay exactamente dos beneficiarios, mostrar opción `Ambos` por defecto.

Ejemplo:

```text
Aplica a:
[Ambos] [Mamá] [Papá]
```

Si el usuario elige `Ambos`, internamente asociar el gasto a ambos beneficiarios.

### 8.4.4 Fecha

Default:

- Fecha actual.

Comportamiento:

- Mostrar `Hoy` como valor inicial.
- Permitir cambiar fecha tocando el campo.
- La fecha define el `month_key` del gasto.

Si el usuario elige una fecha perteneciente a un mes cerrado:

- No permitir guardar normalmente.
- Mostrar mensaje:

```text
Ese mes ya está cerrado. No se pueden agregar gastos a un mes cerrado.
```

Si el usuario es admin, ofrecer:

```text
Reabrir mes
```

Si el usuario no es admin:

```text
Pedile al administrador que reabra el mes o cargá el gasto en un mes abierto.
```

### 8.4.5 Descripción

Campo opcional.

Puede quedar vacío.

Sirve para aclaraciones específicas del gasto.

Ejemplos:

- `Farmacity`
- `Control médico`
- `Taxi ida al médico`

No debe ser requerida.

## 8.5 Resumen mensual

Debe mostrar:

```text
Mayo 2026
Total: $90.000
Estado: Abierto

Por categoría:
Medicina: $30.000
Transporte: $20.000
Comida: $40.000

Por beneficiario:
Mamá: $40.000
Papá: $30.000
Ambos: $20.000
```

Notas:

- La agrupación por beneficiario puede mostrar gastos asociados a cada beneficiario.
- Si un gasto aplica a ambos, puede aparecer en una sección `Ambos` o contarse para ambos según diseño. Para MVP, mostrar como `Ambos` para evitar duplicar montos visualmente.

## 8.6 Cierre de mes

Solo admin.

Desde el resumen mensual debe existir botón:

```text
Cerrar mes
```

Al cerrar:

- Sumar gastos activos no eliminados del mes.
- Calcular cantidad de pagantes activos.
- Dividir total entre pagantes activos.
- Congelar cálculo.
- Crear estado de pago por cada pagante.
- Generar mensaje editable.
- Cambiar estado del período.

Si no hay pagantes activos:

- No permitir cerrar.
- Mostrar error:

```text
No hay pagantes configurados para esta sala.
```

Si no hay gastos:

- Permitir cerrar o pedir confirmación.
- Mensaje sugerido:

```text
Este mes no tiene gastos. ¿Querés cerrarlo igual?
```

## 8.7 Mensaje de cobro

Luego del cierre, la app debe generar un mensaje editable.

Debe haber dos modos de mensaje:

### 8.7.1 Con detalle

Ejemplo:

```text
Gastos de mayo 2026

Total: $90.000
Dividido entre 3: $30.000 cada uno

Detalle:
- Medicina: $30.000
- Transporte: $20.000
- Comida: $40.000

Me transfieren $30.000 cada uno.
```

### 8.7.2 Sin detalle

Ejemplo:

```text
Gastos de mayo 2026

Total: $90.000
Dividido entre 3: $30.000 cada uno.

Me transfieren $30.000 cada uno.
```

La sala debe tener configuración:

```text
include_detail_in_message: true/false
```

Pero el admin puede cambiar si incluye detalle justo antes de generar/copiar el mensaje.

## 8.8 Edición del mensaje de cobro

El mensaje generado debe mostrarse en un textarea editable.

El admin puede modificar cualquier texto.

Ejemplo:

- Total real: `$79.997`
- El admin edita y pone `$80.000`

Esto debe estar permitido.

Guardar separadamente:

- Cálculo real del sistema.
- Mensaje final editado.

Campos recomendados:

```text
system_total
system_amount_per_payer
final_message
message_generated_at
message_updated_at
```

## 8.9 Compartir / copiar mensaje

Acciones:

- `Copiar mensaje`
- `Compartir mensaje`

`Compartir mensaje` debe usar el share nativo del dispositivo para permitir enviar por:

- WhatsApp
- Telegram
- Email
- SMS
- Cualquier app compatible

No se debe integrar directamente con la API de WhatsApp en MVP.

## 8.10 Cobros

Pantalla para ver pagantes del período.

Ejemplo:

```text
Mayo 2026
Total: $90.000
Cada uno: $30.000

Pagantes:
Hermano 1 - Pendiente - $30.000
Hermano 2 - Pagado - $30.000
Mi esposa - Pagado - $30.000
```

Acciones admin:

- Marcar como pagado.
- Marcar como pendiente.

Si todos están pagados:

- El período pasa a `paid`.

Si algunos están pagados y otros pendientes:

- El período pasa a `partially_paid`.

Si ninguno está pagado:

- El período queda `closed`.

## 8.11 Categorías

Pantalla para administrar categorías.

Acciones:

- Crear categoría.
- Editar nombre.
- Desactivar categoría.
- Reactivar categoría.
- Eliminar solo si no tiene uso.

Reglas:

- No permitir dos categorías activas con el mismo nombre dentro de la misma sala.
- Categorías con uso no se eliminan físicamente.
- Categorías desactivadas no aparecen en el formulario de nuevo gasto.
- Categorías desactivadas sí aparecen en gastos históricos.

## 8.12 Configuración de sala

Solo admin.

Debe permitir:

- Cambiar nombre de sala.
- Cambiar moneda.
- Configurar si el mensaje incluye detalle por defecto.
- Administrar usuarios de sala.
- Administrar beneficiarios.
- Administrar pagantes.
- Archivar sala.

---

# 9. Reglas de negocio detalladas

## 9.1 Gasto obligatorio

Para crear un gasto se requiere:

- Sala.
- Categoría activa.
- Monto mayor a cero.
- Fecha.
- Al menos un beneficiario activo.
- Usuario creador con acceso a la sala.

Descripción es opcional.

## 9.2 Mes del gasto

El mes del gasto se determina por la fecha del gasto.

Ejemplo:

```text
expense_date = 2026-05-31
month_key = 2026-05
```

## 9.3 Mes cerrado

No se pueden crear gastos en un mes cerrado.

No se pueden editar gastos de un mes cerrado.

No se pueden eliminar gastos de un mes cerrado.

Solo admin puede reabrir el mes.

## 9.4 Reapertura de mes

Si un admin reabre un mes:

- El período vuelve a `open`.
- Se pueden agregar gastos.
- Se pueden editar gastos.
- Se pueden eliminar gastos lógicamente.
- Al cerrar nuevamente, se recalculan los totales.

Guardar auditoría:

- Quién reabrió.
- Fecha de reapertura.

## 9.5 Categorías usadas

Si una categoría tiene al menos un gasto asociado:

- No se puede eliminar físicamente.
- Solo se puede desactivar.

Si una categoría no tiene uso:

- Se puede eliminar físicamente.

## 9.6 Categorías más usadas

La app debe calcular las categorías más usadas por sala.

Criterio recomendado para sugerencias:

1. Contar gastos no eliminados por categoría dentro de la sala.
2. Priorizar gastos de los últimos 90 días.
3. Si no hay suficientes datos, usar el total histórico.
4. Mostrar máximo 3 a 5 categorías sugeridas.

Orden sugerido:

```text
Más cantidad de usos recientes
Luego más cantidad de usos históricos
Luego orden alfabético
```

Ejemplo:

Si en la sala se usaron:

- Medicina 20 veces
- Taxi 12 veces
- Comida 8 veces
- Ropa 1 vez

Al cargar gasto, mostrar primero:

```text
[Medicina] [Taxi] [Comida]
```

## 9.7 Pagantes activos

Al cerrar un mes se deben usar solo pagantes activos.

El cálculo queda congelado.

Si después se agrega o elimina un pagante, no debe afectar meses ya cerrados.

## 9.8 Cálculo del monto por pagante

MVP:

```text
total del mes / cantidad de pagantes activos
```

Ejemplo:

```text
90000 / 3 = 30000
```

Si el resultado tiene decimales, guardar el valor exacto.

No redondear automáticamente el cálculo interno.

El admin puede redondear manualmente en el mensaje editable.

## 9.9 Mensaje final

El mensaje final editado por el admin debe quedar guardado.

Esto permite saber qué texto se envió realmente.

## 9.10 Última edición gana

Para MVP, si dos usuarios editan el mismo gasto:

- Gana la última edición sincronizada.
- Guardar `updated_by` y `updated_at`.

Opcional futuro:

- Tabla de auditoría completa.

## 9.11 Eliminación lógica

Los gastos no deben borrarse físicamente.

Usar:

```text
deleted_at
deleted_by
```

Los gastos eliminados no suman en totales.

---

# 10. Modelo de datos Supabase/Postgres

## 10.1 profiles

Extensión del usuario autenticado.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

## 10.2 rooms

```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'ARS',
  include_detail_in_message boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  archived_at timestamptz
);
```

## 10.3 room_users

```sql
create table room_users (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'guest')),
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);
```

## 10.4 beneficiaries

```sql
create table beneficiaries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.5 payers

```sql
create table payers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.6 categories

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, name)
);
```

## 10.7 periods

```sql
create table periods (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  month_key text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'partially_paid', 'paid')),
  system_total numeric(14,2),
  system_amount_per_payer numeric(14,2),
  payer_count integer,
  final_message text,
  message_generated_at timestamptz,
  message_updated_at timestamptz,
  closed_by uuid references profiles(id),
  closed_at timestamptz,
  reopened_by uuid references profiles(id),
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(room_id, month_key)
);
```

## 10.8 expenses

```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  category_id uuid not null references categories(id),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  expense_date date not null,
  month_key text not null,
  created_by uuid not null references profiles(id),
  updated_by uuid references profiles(id),
  deleted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
```

## 10.9 expense_beneficiaries

```sql
create table expense_beneficiaries (
  expense_id uuid not null references expenses(id) on delete cascade,
  beneficiary_id uuid not null references beneficiaries(id),
  primary key (expense_id, beneficiary_id)
);
```

## 10.10 period_payer_status

```sql
create table period_payer_status (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  payer_id uuid not null references payers(id),
  amount_due numeric(14,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  marked_paid_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(period_id, payer_id)
);
```

## 10.11 user_preferences

```sql
create table user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_room_id uuid references rooms(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
```

## 10.12 room_invitations

```sql
create table room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'guest')),
  token text not null unique,
  invited_by uuid not null references profiles(id),
  accepted_by uuid references profiles(id),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
```

---

# 11. Índices recomendados

```sql
create index idx_room_users_user_id on room_users(user_id);
create index idx_room_users_room_id on room_users(room_id);

create index idx_expenses_room_month on expenses(room_id, month_key);
create index idx_expenses_room_date on expenses(room_id, expense_date);
create index idx_expenses_category on expenses(category_id);
create index idx_expenses_created_by on expenses(created_by);
create index idx_expenses_deleted_at on expenses(deleted_at);

create index idx_categories_room_active on categories(room_id, is_active);
create index idx_beneficiaries_room_active on beneficiaries(room_id, is_active);
create index idx_payers_room_active on payers(room_id, is_active);

create index idx_periods_room_month on periods(room_id, month_key);
create index idx_period_payer_status_period on period_payer_status(period_id);
```

---

# 12. Seguridad y permisos

## 12.1 Reglas generales

- Un usuario solo puede ver salas donde existe en `room_users`.
- Un usuario solo puede ver gastos de salas donde es miembro.
- Solo admin puede cerrar/reabrir mes.
- Solo admin puede modificar pagantes.
- Solo admin puede modificar beneficiarios, salvo que se decida permitir guest en futuro.
- Admin y guest pueden crear/editar/desactivar categorías.
- Admin y guest pueden cargar gastos.
- No permitir acciones sobre salas archivadas.

## 12.2 Validaciones backend

No confiar solo en frontend.

Backend/Supabase debe impedir:

- Insertar gasto en mes cerrado.
- Editar gasto en mes cerrado.
- Eliminar gasto en mes cerrado.
- Eliminar categoría con gastos asociados.
- Acceder a sala no autorizada.
- Cerrar mes sin ser admin.
- Marcar pagante como pagado sin ser admin.

---

# 13. Funciones/RPC recomendadas en Supabase

Para simplificar lógica crítica, crear funciones SQL/RPC.

## 13.1 close_period

Input:

```text
room_id
month_key
include_detail boolean
```

Responsabilidades:

1. Validar que el usuario es admin.
2. Validar que la sala existe.
3. Validar que hay pagantes activos.
4. Sumar gastos no eliminados del mes.
5. Calcular monto por pagante.
6. Crear o actualizar período.
7. Crear registros en `period_payer_status`.
8. Guardar total, cantidad de pagantes y monto por pagante.
9. Cambiar estado a `closed`.
10. Retornar datos para generar mensaje.

## 13.2 reopen_period

Input:

```text
room_id
month_key
```

Responsabilidades:

1. Validar admin.
2. Cambiar período a `open`.
3. Guardar `reopened_by` y `reopened_at`.

## 13.3 mark_payer_paid

Input:

```text
period_id
payer_id
paid boolean
```

Responsabilidades:

1. Validar admin.
2. Marcar pagante como pagado o pendiente.
3. Actualizar estado del período:
   - todos pending => `closed`
   - algunos paid => `partially_paid`
   - todos paid => `paid`

## 13.4 get_suggested_categories

Input:

```text
room_id
limit
```

Responsabilidades:

1. Buscar categorías activas.
2. Contar usos recientes.
3. Retornar las más usadas.

Criterio:

- Priorizar últimos 90 días.
- Luego total histórico.
- Máximo 3 a 5.

---

# 14. Offline y sincronización

## 14.1 Estados locales

Cada entidad local sincronizable debe tener estado:

```text
pending_sync
syncing
synced
sync_failed
conflict
```

Para MVP, aplicar principalmente a gastos y categorías nuevas.

## 14.2 Tabla/colección local sync_queue

Guardar operaciones pendientes.

Campos sugeridos:

```text
id local uuid
entity_type: expense | category | etc
operation: create | update | delete
payload json
created_at
last_attempt_at
attempt_count
status
error_message
```

## 14.3 Creación de gasto offline

Flujo:

1. Usuario crea gasto.
2. App valida localmente lo básico.
3. App guarda gasto local con `pending_sync`.
4. App agrega operación a `sync_queue`.
5. UI muestra el gasto inmediatamente.
6. App intenta sincronizar.
7. Si Supabase acepta, actualizar estado a `synced`.
8. Si falla por conexión, mantener `pending_sync`.
9. Si falla por regla de negocio, marcar `conflict`.

## 14.4 Conflicto: mes cerrado

Caso:

- Usuario offline carga gasto en mayo.
- Otro usuario cierra mayo.
- Usuario vuelve online.
- Sync intenta subir gasto.
- Backend rechaza porque mayo está cerrado.

Mostrar:

```text
No se pudo sincronizar este gasto porque mayo 2026 ya está cerrado.
```

Opciones:

- Mover al mes actual.
- Mantener pendiente.
- Descartar.

Si usuario es admin, también:

- Reabrir mes.

## 14.5 Conflicto: categoría desactivada

Si una categoría fue desactivada pero el gasto offline la usa:

- Permitir sincronizar si la categoría existe.
- No bloquear por estar desactivada, porque el gasto fue creado antes o durante el período offline.

## 14.6 Sincronización al abrir app

Al abrir la app:

1. Cargar datos locales.
2. Mostrar última sala.
3. Intentar sincronizar cola pendiente.
4. Descargar cambios recientes de Supabase.
5. Actualizar UI.

## 14.7 Indicadores de sync

Mostrar en UI:

```text
Sincronizado
1 gasto pendiente
Error de sincronización
```

En cada gasto pendiente, mostrar un pequeño icono.

No bloquear al usuario.

---

# 15. UX detallada para carga rápida

## 15.1 Prioridad

La carga debe tomar pocos segundos.

Orden visual recomendado:

1. Categoría.
2. Monto.
3. Beneficiario.
4. Guardar.
5. Fecha y descripción como opciones secundarias.

## 15.2 Formulario recomendado

```text
Nuevo gasto

Categoría
[Sugerida 1] [Sugerida 2] [Sugerida 3]
[Ver todas]

Monto
$ __________

Aplica a
[Ambos] [Mamá] [Papá]

Fecha: Hoy
Descripción opcional

[Guardar]
```

## 15.3 Categorías sugeridas

Las categorías sugeridas deben aparecer como botones/chips grandes.

Si el usuario toca una sugerida, queda seleccionada.

Si necesita otra:

- Toca `Ver todas`.
- Aparece dropdown/lista/buscador.

## 15.4 Guardar rápido

El botón Guardar debe estar fijo abajo o muy visible.

Después de guardar:

- Cerrar modal.
- Mostrar gasto en la lista.
- Mostrar toast:

```text
Gasto guardado
```

Si está pendiente de sync:

```text
Gasto guardado. Pendiente de sincronizar.
```

## 15.5 Carga consecutiva

Opcional útil:

Después de guardar, ofrecer:

```text
Guardar y cargar otro
```

No requerido en MVP, pero recomendable.

---

# 16. Dashboard / estadísticas

## 16.1 Dashboard básico MVP

Mostrar:

- Total del mes actual.
- Total por categoría.
- Promedio mensual.
- Meses pendientes de cobro.
- Estado de los últimos meses.

## 16.2 Promedio mensual

El promedio mensual debe calcularse usando solo meses con datos.

Ejemplo:

- Si hay un solo mes con datos: promedio = total de ese mes.
- Si hay 12 meses con datos: promedio = suma de esos 12 meses / 12.

No incluir meses sin datos.

## 16.3 Meses pendientes

Mostrar períodos con estado:

- `closed`
- `partially_paid`

Estos indican que hay algo pendiente de cobro o pago.

---

# 17. Estados de período

## 17.1 open

Mes abierto.

Permite:

- Crear gastos.
- Editar gastos.
- Eliminar gastos lógicamente.

## 17.2 closed

Mes cerrado.

No permite:

- Crear gastos.
- Editar gastos.
- Eliminar gastos.

Permite:

- Generar/editar mensaje de cobro.
- Marcar pagantes como pagados.
- Reabrir, solo admin.

## 17.3 partially_paid

Mes cerrado con algunos pagantes pagados y otros pendientes.

## 17.4 paid

Mes cerrado y todos los pagantes están pagados.

---

# 18. Mensajes de error y validación

## 18.1 Monto inválido

```text
Ingresá un monto mayor a cero.
```

## 18.2 Categoría requerida

```text
Seleccioná una categoría.
```

## 18.3 Beneficiario requerido

```text
Seleccioná a quién aplica el gasto.
```

## 18.4 Mes cerrado

```text
Este mes ya está cerrado. No se pueden agregar gastos.
```

## 18.5 Sin permisos

```text
No tenés permisos para realizar esta acción.
```

## 18.6 Sin conexión

```text
Sin conexión. El gasto quedó guardado y se sincronizará después.
```

## 18.7 Error de sync

```text
No se pudo sincronizar. Tocá para ver detalles.
```

---

# 19. Criterios de aceptación

## 19.1 Crear sala

Dado un usuario autenticado,
cuando crea una sala,
entonces queda como admin de esa sala.

## 19.2 Última sala

Dado un usuario que ya abrió una sala,
cuando vuelve a abrir la app,
entonces entra directamente a la última sala usada.

## 19.3 Crear gasto simple

Dado un usuario miembro de una sala abierta,
cuando selecciona categoría, monto y beneficiario,
entonces el gasto se guarda localmente y aparece inmediatamente en la lista.

## 19.4 Gasto sin descripción

Dado un usuario creando gasto,
cuando deja descripción vacía,
entonces el gasto se guarda correctamente.

## 19.5 Categorías sugeridas

Dado que una sala tiene categorías usadas previamente,
cuando el usuario abre nuevo gasto,
entonces ve primero las categorías más usadas.

## 19.6 Categoría con uso

Dado que una categoría tiene gastos asociados,
cuando el usuario intenta eliminarla,
entonces la app no permite eliminarla y ofrece desactivarla.

## 19.7 Mes cerrado

Dado un mes cerrado,
cuando el usuario intenta cargar un gasto con fecha de ese mes,
entonces la app no permite guardar el gasto.

## 19.8 Cierre de mes

Dado un admin y un mes abierto con gastos,
cuando cierra el mes,
entonces la app calcula total, monto por pagante y crea estados de pago.

## 19.9 Mensaje editable

Dado un mes cerrado,
cuando la app genera mensaje de cobro,
entonces el admin puede editar el texto antes de copiarlo o compartirlo.

## 19.10 Mensaje guardado

Dado que el admin editó el mensaje,
cuando guarda o comparte,
entonces el texto final queda guardado en el período.

## 19.11 Marcar pagante pagado

Dado un período cerrado,
cuando el admin marca un pagante como pagado,
entonces se actualiza el estado de ese pagante.

## 19.12 Período pagado

Dado un período donde todos los pagantes están pagados,
cuando se actualiza el último pagante,
entonces el período cambia a estado `paid`.

## 19.13 Offline básico

Dado un usuario sin conexión,
cuando carga un gasto,
entonces el gasto queda local con estado pendiente de sincronización.

## 19.14 Sync al reconectar

Dado un gasto pendiente,
cuando la app tiene conexión,
entonces intenta sincronizarlo con Supabase.

## 19.15 Conflicto por mes cerrado

Dado un gasto pendiente de sync para un mes que fue cerrado,
cuando la app intenta sincronizar,
entonces marca conflicto y muestra opciones al usuario.

---

# 20. Estructura sugerida del proyecto Angular/Ionic

```text
src/app/
  core/
    auth/
    guards/
    interceptors/
    models/
    services/
  features/
    rooms/
      pages/
      components/
      services/
    expenses/
      pages/
      components/
      services/
    categories/
      pages/
      components/
      services/
    periods/
      pages/
      components/
      services/
    dashboard/
      pages/
      services/
  shared/
    components/
    pipes/
    utils/
  data/
    local/
    remote/
    sync/
```

## 20.1 Servicios recomendados

```text
AuthService
RoomService
ExpenseService
CategoryService
BeneficiaryService
PayerService
PeriodService
DashboardService
LocalDatabaseService
SyncQueueService
NetworkService
ShareService
```

## 20.2 Modelos TypeScript recomendados

```ts
export type RoomRole = 'admin' | 'guest';
export type PeriodStatus = 'open' | 'closed' | 'partially_paid' | 'paid';
export type SyncStatus = 'pending_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict';

export interface Room {
  id: string;
  name: string;
  currency: string;
  includeDetailInMessage: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface Category {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Beneficiary {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Payer {
  id: string;
  roomId: string;
  name: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  roomId: string;
  categoryId: string;
  amount: number;
  description?: string;
  expenseDate: string;
  monthKey: string;
  beneficiaryIds: string[];
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  syncStatus?: SyncStatus;
}

export interface Period {
  id: string;
  roomId: string;
  monthKey: string;
  status: PeriodStatus;
  systemTotal?: number;
  systemAmountPerPayer?: number;
  payerCount?: number;
  finalMessage?: string;
  closedBy?: string;
  closedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
}
```

---

# 21. Formato de mensaje de cobro

Crear función frontend para generar mensaje default.

Input:

```text
roomName
monthLabel
total
payerCount
amountPerPayer
categoryBreakdown
includeDetail
```

Output con detalle:

```text
Gastos de {monthLabel}

Total: {totalFormatted}
Dividido entre {payerCount}: {amountPerPayerFormatted} cada uno

Detalle:
- {categoryName}: {amountFormatted}
- {categoryName}: {amountFormatted}

Me transfieren {amountPerPayerFormatted} cada uno.
```

Output sin detalle:

```text
Gastos de {monthLabel}

Total: {totalFormatted}
Dividido entre {payerCount}: {amountPerPayerFormatted} cada uno.

Me transfieren {amountPerPayerFormatted} cada uno.
```

El texto debe ser editable antes de guardar/copiar/compartir.

---

# 22. Recomendaciones de implementación para Codex

## 22.1 Construir por etapas

Implementar en este orden:

1. Crear proyecto Ionic Angular.
2. Configurar Supabase.
3. Crear modelos TypeScript.
4. Crear esquema SQL.
5. Implementar Auth.
6. Implementar salas.
7. Implementar categorías.
8. Implementar beneficiarios.
9. Implementar pagantes.
10. Implementar gastos online.
11. Implementar resumen mensual.
12. Implementar cierre de mes.
13. Implementar mensaje editable.
14. Implementar cobros.
15. Implementar local storage.
16. Implementar sync queue.
17. Implementar conflictos básicos.
18. Mejorar UX.

## 22.2 No sobre-ingenierizar al inicio

No implementar:

- Background sync complejo.
- Push notifications.
- OCR.
- Realtime obligatorio.
- División avanzada.

## 22.3 Prioridad UX

La app debe sentirse rápida.

El flujo de carga de gasto debe ser el centro.

---

# 23. Backlog futuro

Ideas futuras no MVP:

- OCR de tickets.
- Adjuntar fotos de comprobantes.
- Exportar PDF mensual.
- Exportar Excel.
- División por porcentajes.
- División por gasto.
- Realtime entre dispositivos.
- Push cuando alguien cierra mes.
- Recordatorios de pago.
- Reporte anual.
- Filtros avanzados.
- Gráficos por categoría.
- Modo oscuro.
- Widgets Android para carga rápida.
- Atajos desde home screen.
- Plantillas rápidas de gastos.
- Historial completo de auditoría.

---

# 24. Definición final del MVP

El MVP final debe permitir que un usuario pueda:

1. Crear una sala `Gastos padres`.
2. Configurar beneficiarios `Mamá` y `Papá`.
3. Configurar pagantes `Hermano 1`, `Hermano 2`, `Mi esposa`.
4. Crear categorías como `Medicina`, `Taxi`, `Comida`.
5. Invitar a otro usuario como guest.
6. Abrir la app y entrar directo a la última sala.
7. Tocar `+ Gasto`.
8. Elegir una categoría sugerida.
9. Escribir monto.
10. Dejar beneficiario default `Ambos` o elegir `Mamá`/`Papá`.
11. Guardar.
12. Ver total mensual actualizado.
13. Cerrar el mes como admin.
14. Generar mensaje editable.
15. Copiar o compartir el mensaje.
16. Guardar el mensaje final.
17. Marcar qué pagantes pagaron.
18. Ver si el mes quedó cobrado al 100%.
19. Cargar gastos offline y sincronizarlos al volver a abrir/conectar.

---

# 25. Notas finales

La app debe evitar generar conflictos familiares dando acceso de lectura a pagantes externos.

Por eso:

- No existe rol viewer.
- Los pagantes no acceden a la app.
- El admin decide qué mensaje enviar.
- El mensaje puede incluir o no detalle.
- El mensaje se puede editar manualmente.

El producto debe enfocarse en ahorrar tiempo, evitar errores de suma y hacer simple el cierre mensual.

