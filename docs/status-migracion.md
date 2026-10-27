# Matriz de Estado de la Migración: Sobre La Mesa 2026

Este documento refleja el estado en tiempo real de la migración módulo por módulo desde el sistema legacy Laravel 5.1 (`/Users/carlosrodriguez/development/projects/php7/slm`) hacia la nueva arquitectura en TypeScript y React (`sobrelamesa2026/`).

---

## 1. Dashboard de Avance Global

| Métrica | Valor | Porcentaje |
|---|:---:|:---:|
| **Módulos Totales Identificados** | 16 | 100% |
| **Módulos Completados (Core / Infra / Layout)** | 3 | 18.75% |
| **Módulos En Progreso** | 3 | 18.75% |
| **Módulos Pendientes** | 10 | 62.5% |

```
Avance Global: [█████░░░░░░░░░░░░░░░] 25%
```

---

## 2. Matriz de Módulos: Legacy vs Nueva Arquitectura

| # | Módulo | Controladores y Vistas Legacy (`php7/slm`) | Backend (`backend/src/modules/`) | Frontend React (`slm/src/`) | Base de Datos / Migraciones | Estado | Prioridad |
|:---:|---|---|---|---|---|:---:|:---:|
| **01** | **Infraestructura & Migraciones** | N/A (Docker y artisan legacy) | `migrator.ts` + `npm run migrate` | N/A | `_migrations` table activa | ✅ **Completado** | Crítica |
| **02** | **Autenticación (Auth)** | `AuthController.php`, `LoginController.php`, vistas login | `src/modules/auth/` (JWT, login, refresh) | `modules/auth/` (Login view, context) | `0001_add_hashed_refresh_token_to_users.sql` | 🔄 **En Progreso** | Crítica |
| **03** | **Layout Shell (`new_private`)** | `new_private.blade.php`, `sidebar.blade.php`, `navbar.blade.php`, `modern_admin.css` | N/A | `layouts/PrivateLayout.jsx`, `components/Sidebar.jsx`, `components/Navbar.jsx`, `modern_admin.css` | N/A | ✅ **Completado** | Alta |
| **04** | **Usuarios & Permisos** | `Admin/UsuarioController.php`, `User.php`, `Permissions.php`, `UserPermissions.php` | Parcial en Auth | `modules/auth/` | `users`, `permissions`, `user_permissions` | ⏳ **Pendiente** | Alta |
| **05** | **Productos & Catálogo** | `Admin/ProductoController.php`, `Producto.php`, `CategoriaProducto.php`, `SubCategoriaProducto.php` | `src/modules/products/` (CRUD inicial) | `modules/products/` (Vista inicial) | Tablas `producto`, `categoria_producto`, `subcategoria_producto` | 🔄 **En Progreso** | Alta |
| **06** | **Inventario por Día (Disponibilidad)** | `Admin/InventarioDiaController.php`, vistas `admin/inventario_dia/` | ⏳ Pendiente | ⏳ Pendiente | Cálculo de disponibilidad por rango de fechas | ⏳ **Pendiente** | Alta |
| **07** | **Clientes & Directorio** | `Admin/ClienteController.php`, `Cliente.php`, `PersonaFisica.php`, `TipoCliente.php` | ⏳ Pendiente | ⏳ Pendiente | Tablas `clientes`, `persona_fisica`, `tipo_cliente` | ⏳ **Pendiente** | Alta |
| **08** | **Lugares / Salones (Venues)** | `Admin/LugarController.php`, `Lugar.php`, vistas `admin/lugar/` | ⏳ Pendiente | ⏳ Pendiente | Tabla `lugar` | ⏳ **Pendiente** | Media |
| **09** | **Cotizaciones & Eventos (Core)** | `Admin/EventoController.php`, `Evento.php`, `DetalleEvento.php`, `DetalleEventoContent.php` | `src/modules/events/`, `src/modules/events_details/` | `modules/events/` (Listado y vista básica) | Tablas `evento`, `detalle_evento`, `detalle_evento_content` | 🔄 **En Progreso** | Crítica |
| **10** | **Eventos en Curso & Almacén** | `Admin/EventoController@get_event_almacen_prueba`, vistas `admin/almacen/` | ⏳ Pendiente | ⏳ Pendiente | Estados de almacén, checklist de salida y retorno | ⏳ **Pendiente** | Alta |
| **11** | **Eventos por Cliente** | `Admin/EventosClienteController.php`, vistas `admin/eventos_cliente/` | ⏳ Pendiente | ⏳ Pendiente | Agrupación histórica de eventos por cliente | ⏳ **Pendiente** | Media |
| **12** | **Logística & Transportes** | `Admin/LogisticaController.php`, vistas `admin/logistica/` | ⏳ Pendiente | ⏳ Pendiente | Programación de camionetas, chóferes y rutas | ⏳ **Pendiente** | Media |
| **13** | **Ingresos & Finanzas** | `Admin/EventoController@ingresos_test`, `IngresoEvento.php`, `HistorialIngresos.php` | ⏳ Pendiente | ⏳ Pendiente | Tablas `ingreso_evento`, `historial_ingresos` | ⏳ **Pendiente** | Alta |
| **14** | **Agenda & Calendario** | `Admin/CalendarioController.php`, vistas `admin/calendario/` | ⏳ Pendiente | ⏳ Pendiente | Eventos en calendario (montajes, eventos, desmontajes) | ⏳ **Pendiente** | Media |
| **15** | **Reportes & Estadísticas** | `Admin/ReportesController.php`, vistas `admin/reportes/` (29 vistas) | ⏳ Pendiente | ⏳ Pendiente | Reportes de ventas, comisiones, pérdidas, cancelaciones | ⏳ **Pendiente** | Baja |
| **16** | **Notificaciones Tahoe & Config** | `Admin/NotificationController.php`, `Notification.php`, `Empresa.php`, `Politicas.php` | ⏳ Pendiente | `modules/notifications/` (Esqueleto) | Tablas `notification`, `empresa`, `politicas` | ⏳ **Pendiente** | Baja |

---

## 3. Detalle de Estado y Tareas por Módulo

### 01. Infraestructura & Migraciones
- [x] Configuración de Docker Compose (`mysql:8.0`, `backend`, `frontend`).
- [x] Corrección de puertos independientes (MySQL en 3312 externo, 3306 interno).
- [x] Creación de `backend/src/database/migrator.ts` con soporte `.sql` y `.ts`.
- [x] Creación de migración inicial `0001_add_hashed_refresh_token_to_users.sql`.
- [x] Eliminación de carpeta `docker/` y desacoplamiento de la BD de Docker.
- [x] Script `pnpm run hash:passwords` para migrar contraseñas `pwd` a `password` (bcrypt).

### 02. Autenticación (Auth)
- [x] Endpoints base de login `/api/auth/login`.
- [x] Hashing bcrypt verificado con usuarios de la base de datos real.
- [x] Tokens JWT generados (`accessToken` y `refreshToken`).
- [ ] Implementar endpoint de renovación de tokens `/api/auth/refresh-token`.
- [ ] Implementar middleware de validación de permisos por rol en rutas protegidas.

### 03. Layout Shell (`new_private`)
- [x] Adaptar `slm/src/layouts/PrivateLayout.jsx` al diseño exacto de `new_private.blade.php`:
  - [x] **Sidebar:** Gradiente `#1a2035` a `#11162a`, ancho 260px con modo mini colapsable a 60px y persistencia en localStorage.
  - [x] **Navbar:** Altura 60px sticky, fondo blanco `#ffffff`, toggle para sidebar mini y mobile, avatar y dropdown.
  - [x] **Canvas:** Fondo `#f5f4f4ff` con padding 24px (`p-24`).
  - [x] **Dependencia de iconos:** Instalado `bootstrap-icons` con mapeo 1:1 de los iconos legacy.
  - [x] **Estilos de diseño:** Creado `slm/src/styles/modern_admin.css` con clases `.table-custom`, `.filter-section`, `.card-dashboard`.
  - [ ] **Notificaciones:** Integrar contenedor flotante con estilo macOS Tahoe.

### 04. Usuarios & Permisos
- [ ] Endpoints para CRUD de usuarios (`GET`, `POST`, `PUT`, `DELETE /api/users`).
- [ ] Asignación de roles (`tipo_usuario`) y permisos granulares (`user_permissions`).
- [ ] Vista React de administración de usuarios con tabla flotante y modal de edición.

### 05. Productos & Catálogo
- [x] Endpoints iniciales de consulta en `/api/products`.
- [ ] Incorporar paginación, filtros por categoría y búsqueda con debounce.
- [ ] Integrar el visor de imágenes premium (`.premium-zoom-overlay`) en el listado de productos.
- [ ] Modal de creación y edición de productos con carga/gestión de imagen.

### 06. Inventario por Día (Disponibilidad)
- [ ] Servicio de cálculo de stock disponible restando productos comprometidos en eventos confirmados.
- [ ] Endpoint `/api/inventory/availability?date_start=X&date_end=Y`.
- [ ] Vista de calendario o matriz de disponibilidad diaria.

### 07. Clientes & Directorio
- [ ] Endpoints `/api/clients` (soporte persona física y moral, teléfonos y correos).
- [ ] Vista React con tarjetas de cliente, buscador rápido y modal de registro.
- [ ] Historial de cotizaciones y eventos asociados por cliente.

### 08. Lugares / Salones (Venues)
- [ ] Endpoints `/api/places` (nombre, dirección, contacto, capacidad, notas).
- [ ] Selector rápido de lugares dentro de la creación de eventos.

### 09. Cotizaciones & Eventos (Core del Negocio)
- [x] Endpoints completos de eventos y cotizaciones en `/api/events` (`catalogs`, `event/:id`, `save-quote`, `add-comment`).
- [x] Editor completo de cotización (`/events/new`, `/events/edit/:id`) idéntico a la vista legacy:
  - [x] Búsqueda predictiva `SearchableSelect` para clientes (+5,600 registros), agentes, tipos de evento y domicilios.
  - [x] Catálogo F2 con búsqueda paginada y disponibilidad en tiempo real por rango de fechas.
  - [x] Notificaciones Toast (`top-end`) y confirmaciones SweetAlert2 (eliminando alertas inline y `alert()` nativos).
  - [x] Cálculo reactivo de totales, descuentos, lavado/desinfección y enlace público con token hash.
  - [x] Asignación automática del agente logueado en cotizaciones nuevas.
- [ ] Transición de estados de evento (Cotización ➡️ Confirmado ➡️ En Almacén ➡️ Finalizado).
- [ ] Generación de PDF de cotización imprimible para el cliente.

### 10. Almacén & Eventos en Curso
- [ ] Vista de bodega para eventos que se montan en el día o semana corriente.
- [ ] Checklist digital de salida de material y retorno a almacén.
- [ ] Registro de mermas, roturas o faltantes al finalizar el evento.

### 11. Eventos por Cliente
- [ ] Vista consolidada de eventos por cliente para el equipo de ventas.
- [ ] Métricas de recurrencia y facturación por cliente.

### 12. Logística & Transportes
- [ ] Asignación de vehículos y chóferes a eventos.
- [ ] Hoja de ruta para equipo de montaje y desmontaje.

### 13. Ingresos & Finanzas
- [ ] Registro de anticipos y abonos a eventos.
- [ ] Cálculo de saldo restante y alertas de eventos próximos sin liquidar.
- [ ] Generación de comprobante de ingreso.

### 14. Agenda & Calendario
- [ ] Componente FullCalendar en React configurado con vistas mes, semana y día.
- [ ] Codificación por colores según el estado del evento (Cotización, Confirmado, Montaje).

### 15. Reportes & Analítica
- [ ] Reporte de ventas por período y por vendedor.
- [ ] Reporte de rotación de inventario (productos más y menos rentados).
- [ ] Exportación a formato Excel y PDF.

### 16. Notificaciones & Configuración
- [ ] Centro de notificaciones estilo macOS Tahoe con cards apiladas y blur.
- [ ] Módulo de configuración con datos fiscales de la empresa y políticas comerciales.
