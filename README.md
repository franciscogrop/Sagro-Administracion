# Sagro SRL - Administración limpia

Esta versión arranca de cero y no depende de la planilla vieja. También borra del navegador las claves locales usadas por las versiones anteriores de prueba.

## Cómo usarla

Abrir `index.html` en el navegador.

La app guarda los datos en el navegador, en almacenamiento local. Para llevar una copia, usar `Exportar respaldo`.

## Flujo sugerido

1. Cargar cada hecho como una `Nueva operación`.
2. Usar `pendiente` para facturas, ventas o compromisos todavía no cobrados/pagados.
3. Usar `realizado` cuando ya afectó caja o banco.
4. Registrar cheques aparte cuando haya valores físicos o diferidos.
5. Registrar liquidaciones de cereal/hacienda en su módulo, y también cargar la operación de venta si debe entrar al tablero.
6. Usar `Socios` para aportes y retiros, especialmente cuando intervenga Mariano Saluzzio.

## Plan de cuentas

La app trae un plan simple por actividad:

- Finanzas
- Agricultura
- Ganadería
- Estructura
- Impuestos
- Socios

Se pueden agregar cuentas nuevas desde `Plan cuentas`.

## Datos de ejemplo

El botón `Cargar ejemplos` sirve solo para probar y usa datos ficticios, no tomados de la empresa ni de la planilla real.

Cuando quieran empezar en serio, usar `Empezar limpio`.
