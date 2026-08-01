# Cómo actualizar Los Anillos de Chile

Ya no se edita código. Se edita **texto plano**, como escribir un mail.
Hay dos archivos:

- `notas.txt`      → acá se publica (lo vas a editar seguido)
- `categorias.txt` → la lista de disciplinas y sus fotos fijas (rara vez se toca)

## Sobre las fotos

Cada categoría tiene **una sola foto fija** (definida en `categorias.txt`),
que se usa como cabecera de esa página y como miniatura en la portada.
Las notas individuales **no llevan foto propia** — así evitamos tener
que subir una foto distinta cada vez que publicas, y el sitio queda
más simple y más estable.

Si en algún momento quieres cambiar la foto de una categoría, edita
la ruta en `categorias.txt` y sube la foto nueva a `img/`.

## Publicar una nota nueva

1. Abre `notas.txt`.
2. Copia una nota completa que ya esté ahí (desde `categoria:` hasta
   justo antes del `====` siguiente).
3. Pégala donde quieras del archivo — el orden en que la escribas no
   importa, el sitio ordena las notas solo por la fecha.
4. Cambia los datos:

   ```
   categoria: voleibol
   fecha: 2026-08-04
   etiqueta: Nota principal · Vóleibol femenino
   titulo: Un título nuevo
   bajada: Un resumen de una o dos frases.
   firma: Redacción Los Anillos de Chile
   portada: no
   texto:
   Acá escribes el cuerpo de la nota. Deja una línea en blanco entre
   cada párrafo, así como en este ejemplo.

   Este sería el segundo párrafo.

   ### Y esto un subtítulo dentro de la nota

   > Y esto una frase destacada / cita grande.

   ! Dato: y esto un recuadro con un dato destacado.
   ```

5. Guarda y sube los cambios a GitHub (o al hosting que estés usando).
   Listo — no hay que tocar nada más, ni subir fotos.

La nota aparece sola, arriba de las demás de su categoría (por fecha).
Si la marcas con `portada: si`, además pasa a ser la protagonista de
la portada del sitio (deja solo una nota en `si` a la vez; la foto que
se muestra ahí es la fija de esa categoría).

## Agregar una categoría/disciplina nueva

1. Abre `categorias.txt` y agrega una línea nueva:
   `rugby | Rugby | #2E5D3C | rugby.html | img/rugby.jpg`
   (identificador | nombre visible | color | archivo .html | foto fija)
2. Sube la foto de esa categoría a `img/` con el nombre que usaste ahí.
3. Duplica un archivo .html de categoría existente (por ejemplo
   `triatlon.html`), y renómbralo (`rugby.html`).
4. Dentro de ese archivo nuevo, cambia solo esta línea, al final:
   `LosAnillos.renderCategoryPage("triatlon")` → `LosAnillos.renderCategoryPage("rugby")`
5. Agrega al menos una nota en `notas.txt` con `categoria: rugby`.

El menú, el pie de página y la portada se actualizan solos.

## Importante: cómo probarlo

Estos dos archivos (`notas.txt` y `categorias.txt`) se cargan por
internet, así que **no vas a ver los cambios si abres el .html
directamente haciendo doble clic** en tu computador (el navegador
bloquea esa carga por seguridad). Para ver los cambios:

- Súbelos a tu hosting y mira la página ya publicada, o
- Si quieres previsualizar antes de subir, corre un servidor local
  (por ejemplo, con Python: `python3 -m http.server`, y abre
  `http://localhost:8000` en el navegador).

## Estructura del sitio

```
index.html          portada (se arma sola)
editorial.html       página de la categoría Editorial
voleibol.html        página de la categoría Vóleibol
basquetbol.html      página de la categoría Básquetbol
triatlon.html        página de la categoría Triatlón
atletismo.html       página de la categoría Atletismo
breves.html          página de la categoría Breves
notas.txt            ← EDITAS ESTO para publicar
categorias.txt       ← fotos fijas y lista de disciplinas
site.js              motor que arma las páginas (no tocar)
styles.css           estilos visuales del sitio (no tocar)
img/                 fotos fijas de cada categoría (5-6 fotos en total)
descargas/           PDF de la revista digital
```
