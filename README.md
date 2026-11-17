# CFO · Finanzas personales

CFO es una PWA de demostración para registrar ingresos y gastos desde el iPhone. Usá exclusivamente datos ficticios. Los cambios se guardan en el navegador, con almacenamiento local provisional.

## Probar en la computadora

Con Node.js 22.12 o posterior, abrí una terminal en la carpeta `cfo` y ejecutá lo siguiente.

```sh
npm ci
npm run dev
```

Abrí la dirección que muestra Vite, normalmente `http://localhost:5173`. Para detener el servidor, presioná Ctrl+C.

Para probar la versión que incluye el modo sin conexión, ejecutá estos comandos y abrí `http://localhost:4173`.

```sh
npm run build
npm run preview
```

Abrí la página una vez con conexión para cargar los recursos. Después simulá el modo sin conexión desde las herramientas del navegador y recargá. Cada dirección y puerto tiene su propio almacenamiento.

## Probar desde un iPhone

1. En una computadora con el proyecto, conectada al mismo Wi-Fi que el iPhone, ejecutá `npm run dev -- --host 0.0.0.0`.
2. En Safari, abrí la dirección que Vite muestra como **Network**. Por ejemplo, `http://192.168.1.20:5173`. Ese modo permite recorrer la interfaz y guardar movimientos ficticios.
3. Para comprobar la PWA completa, serví la carpeta `dist` desde un origen local HTTPS con un certificado que el iPhone reconozca como válido. La IP local por HTTP permite ver la interfaz, pero Safari requiere un contexto seguro para el service worker.
4. Con esa dirección HTTPS abierta en Safari, tocá **Compartir → Agregar a pantalla de inicio**. Activá **Abrir como app web** si aparece, tocá **Agregar** e iniciá CFO desde su ícono. Abrila primero con conexión antes de probar el modo sin conexión.

## Qué probar

- En **Inicio**, compará las tarjetas de UYU y USD. Los ingresos y gastos corresponden al mes actual. El saldo incluye el saldo inicial y todos los movimientos registrados de esa moneda.
- Registrá un gasto de prueba en USD y comprobá que el saldo en UYU no cambie. Editalo o borralo en **Movimientos**.
- En **Categorías**, creá una categoría y elegila al registrar un gasto o ingreso. Podés renombrar categorías usadas y borrar las que todavía no tienen movimientos.
- En **Cuentas**, revisá los saldos de las cuentas ficticias. Recargá para verificar que tus cambios persistan.

## Decisiones técnicas

- **React y TypeScript** permiten reutilizar las tarjetas, el listado y los formularios. TypeScript verifica que el código use de forma coherente tipos como moneda, cuenta y movimiento.
- **Vite** ofrece el servidor de desarrollo y genera los archivos optimizados en `dist`. El manifest define el nombre, los iconos y la vista independiente. El service worker guarda los archivos de la interfaz para volver a abrirla sin conexión. Si se cambia la interfaz en una versión futura, actualizá la versión de caché en `public/sw.js`.
- **CSS mobile-first** usa tipografía del sistema, áreas seguras y navegación inferior para facilitar el uso con una mano.
- **Importes en centésimos enteros** evitan los errores habituales de sumar decimales. La cuenta determina la moneda de cada movimiento y cada resumen se calcula por separado.
- **Modelo extensible** representa una transferencia futura con una salida y una entrada, que pueden tener importes distintos. El saldo de las cuentas puede contabilizar ambas partes y el resumen mensual excluye las transferencias. El tipo de cuenta admite una tarjeta de crédito para una fase posterior.
- **Almacenamiento local versionado** mantiene los cambios de la demo en el navegador donde se registraron. Antes de ingresar finanzas reales, quedan pendientes autenticación, base de datos segura, autorización por usuario, respaldos y exportación de datos.

## Comprobaciones

`npm run check` verifica TypeScript. `npm run build` verifica TypeScript y compila la PWA.
