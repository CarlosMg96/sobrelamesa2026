# Sobre La Mesa (SLM) - Reglas de Sistema de Diseño y UI Homogeneizada

Este documento establece las directrices de diseño, estructura y clases reutilizables obligatorias para todas las vistas y módulos de Sobre La Mesa 2026.

---

## 1. Principios Fundamentales

1. **Cero Elementos Flotantes Sin Contenedor**:
   - Toda información estructurada (tablas, formularios, listados, estadísticas) debe habitar dentro de tarjetas delimitadas (`.slm-table-card`, `.card-dashboard`, `.filter-section`).
   - Los títulos de columna (`thead`) jamás deben flotar libres en el fondo de la página; siempre deben poseer su barra de fondo y línea divisoria integrada en el contenedor.

2. **Doble Tema 100% Homogéneo (Light & Dark)**:
   - Toda propiedad visual debe basarse en variables CSS semánticas (`var(--slm-*)`) o en selectores con soporte explícito `[data-theme="dark"]`.
   - Prohibido el uso de clases utilitarias con colores forzados como `bg-white`, `bg-light` o `text-dark` en componentes que no contemplen el modo oscuro.

---

## 2. Estándar de Tablas (`.slm-table-card` y `.table-custom`)

Cualquier vista con tablas (Cotizaciones, Agenda, Inventario, Usuarios, Reportes, etc.) debe seguir esta estructura exacta:

```jsx
<div className="slm-table-card">
  <div className="table-responsive">
    <table className="table table-custom">
      <thead>
        <tr>
          <th className="text-center" style={{ width: '10%' }}>Folio</th>
          <th className="text-center" style={{ width: '10%' }}>Estatus</th>
          <th className="text-start ps-3" style={{ width: '20%' }}>Cliente / Empresa</th>
          <th className="text-start ps-3" style={{ width: '15%' }}>Responsable</th>
          <th className="text-center" style={{ width: '12%' }}>Pago</th>
          <th className="text-center" style={{ width: '10%' }}>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="text-center align-middle">...</td>
          <td className="text-center align-middle">...</td>
          <td className="text-start ps-3 align-middle">...</td>
          <td className="text-start ps-3 align-middle">...</td>
          <td className="text-center align-middle">...</td>
          <td className="text-center align-middle">...</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Reglas de Alineación de Columnas:
- **Centrado (`text-center`)**:
  - Folios / IDs numéricos.
  - Badges de estatus (Venta, Inventario, Pagos, Logística).
  - Botones y menú de acciones.
- **Alineado a la Izquierda con Espaciado (`text-start ps-3`)**:
  - Nombres de Clientes y Empresas.
  - Table Solvers / Agentes / Usuarios.
  - Fechas con metadatos contextuales (día de la semana, horarios).
  - Direcciones y Ubicaciones de entrega/recolección.

---

## 3. Barras de Filtros y Búsqueda (`.filter-section`)

Todos los paneles de filtrado deben estructurarse en tarjetas con filas semánticas:

1. **Fila 1 (`.slm-filter-top-row`)**: Barra de búsqueda redondeada (`.slm-search-pill-container`), botones de estado destacados (ej. *Por Autorizar*) y selector de ordenación.
2. **Fila 2 (`.slm-filter-row`)**: Filtros categóricos (Fecha, Solvers, Estatus, Inventario, Logística) usando `.slm-pill-select`.
3. **Fila 3 (`.slm-filter-row`)**: Filtros secundarios o financieros con su etiqueta en mayúsculas (`.slm-finance-label`).

```jsx
<div className="filter-section">
  {/* Fila superior de búsqueda */}
  <div className="slm-filter-top-row">
    <div className="slm-search-pill-container">
      <i className="bi bi-search text-muted ms-3"></i>
      <input type="text" className="slm-pill-input border-0 flex-grow-1" placeholder="Buscar..." />
      <button className="btn btn-primary rounded-pill px-3 m-1">Buscar</button>
    </div>
  </div>

  {/* Fila de filtros categóricos */}
  <div className="slm-filter-row">
    <div className="slm-filter-label"><i className="bi bi-funnel-fill"></i> FILTROS:</div>
    <select className="slm-pill-select">...</select>
  </div>
</div>
```

---

## 4. Badges y Estatus Semánticos (`.badge-custom`)

Utilizar siempre las clases semánticas normalizadas para estatus:

| Estatus | Clase CSS | Color Base (Light) | Color Base (Dark) |
| :--- | :--- | :--- | :--- |
| **Cotizado** | `.badge-cotizado` | `#e2e8f0` / `#475569` | `#334155` / `#e2e8f0` |
| **Confirmado** | `.badge-confirmado` | `#0d6efd` (Azul) | `#2563eb` |
| **Autorizado** | `.badge-autorizado` | `#4f46e5` (Índigo) | `#4338ca` |
| **Disponible / Pagado** | `.badge-disponible`, `.badge-paid` | `#d1fae5` / `#065f46` (Verde suave) | `rgba(16, 185, 129, 0.2)` / `#34d399` |
| **Sobrevendido / Cancelado** | `.badge-sobrevendido`, `.badge-cancelado` | `#fee2e2` / `#991b1b` (Rojo suave) | `rgba(239, 68, 68, 0.2)` / `#f87171` |
| **Pendiente / Abonos** | `.badge-abonos`, `.badge-warning` | `#fef3c7` / `#92400e` (Ámbar) | `rgba(245, 158, 11, 0.2)` / `#fbbf24` |
| **Outline Variants** | `.badge-outline-danger`, etc. | Bordes de 1.5px con esquinas píldora `rounded-pill` |

---

## 5. Tarjetas y Modales (`.card-dashboard`, `.modal-content`)

- Bordes redondeados: `16px` (`border-radius: 16px`).
- Cabecera: `background-color: transparent` y borde inferior sutil `1px solid var(--slm-card-border)`.
- En modo oscuro, los modales utilizan `#1e293b` con sombra pronunciada `0 25px 50px -12px rgba(0, 0, 0, 0.7)` y botón de cierre invertido (`filter: invert(1)`).
