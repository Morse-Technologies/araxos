# Araxos Field · prototipo de interfaz

Consola de aprobación y app móvil de Araxos Field sobre una API simulada. Sin backend: los datos viven en
memoria y se reinician al recargar.

## Arrancar

```sh
pnpm install
pnpm dev            # http://localhost:3000
```

| Ruta | Qué es |
|---|---|
| `/queue` | Bandeja de notas; `/queue/n-482` es la revisión en tres columnas, `/queue/n-482/diff` el diff contra Odoo |
| `/history`, `/history/audit` | Notas cerradas y registro de auditoría encadenado |
| `/admin/*` | Conectores, tipos de acción, vocabulario, usuarios y ajustes |
| `/m` | App móvil (en escritorio se muestra dentro de un marco de teléfono): grabar, revisar, modo coche, historial |

Parámetros útiles: `?fast` quita la latencia simulada; `?as=u-rosa` cambia la persona que firma en la consola.

Atajos de la consola: `⌘K` paleta, `J`/`K` moverse por la bandeja, `A` aprobar, `R` rechazar, `E` editar.

## Comprobaciones

```sh
pnpm typecheck && pnpm lint && pnpm test
pnpm e2e            # Playwright; usa micrófono falso de Chromium. CHROME_PATH=/ruta/a/chrome si no hay navegador de Playwright
pnpm build
```

`pnpm shots <url> <carpeta>` hace capturas claras y oscuras de escritorio y teléfono.

## Diseño

- Liquid Glass propio en utilidades de Tailwind (`glass`, `glass-strong`, `glass-clear`, `glass-float`) y el
  componente `Glass`, que añade refracción con `feDisplacementMap` en Chromium. Safari y Firefox reciben
  cristal esmerilado. Con «Reducir transparencia», modo sol o alto contraste todo pasa a superficies sólidas.
- Esquinas squircle con `corner-shape` y un `clip-path` de superelipse como alternativa.
- Movimiento descrito en [MOTION.md](MOTION.md).
- Textos en castellano en `src/lib/i18n/es.ts`, preparados para añadir otros idiomas.
