# Carrera de Jinetes - Baraja Española

Juego de la carrera de caballos con baraja española de 40 cartas, hecho en HTML, CSS y JavaScript sin dependencias. Funciona offline (service worker) y se instala como app (manifest).

Hay dos versiones que comparten la misma lógica y las mismas cartas:

| Ruta | Versión |
|------|---------|
| `./` | Clásica: el look original del juego, corregido y responsivo. |
| `./waynyan/` | Waynyan: estilo gemu404.cl, fuentes pixel locales, paneles en chaflán, iconos SVG y color de acento heredado del home. |

## Reglas

1. Se separan los 4 caballos (los 11) y se ponen en la salida: Oros, Copas, Espadas y Bastos.
2. Se reparten cartas boca abajo como vallas a lo largo de la pista (5, 7 o 9).
3. Se saca una carta del mazo: el caballo de ese palo avanza 1 casilla.
4. Cuando todos los caballos alcanzan o pasan una valla, esa carta se da vuelta y el caballo de su palo retrocede 1 casilla.
5. Gana el primero que cruza la meta. Si llega a la meta gana al tiro, aunque se dé vuelta una valla en esa misma jugada.

Opcional en ajustes: regla "primero", donde la valla se da vuelta apenas un caballo la pisa.

## Apuestas y modo fiesta

- Fichas de 10 a 500, all-in y limpiar. Paga 4x. El saldo se guarda en `localStorage` (`jinetes_bankroll`).
- Las apuestas se consumen al terminar la carrera. Reiniciar a mitad de carrera devuelve las fichas.
- La recarga de 500 fichas solo está disponible cuando quedaste sin fichas.
- Modo fiesta: jugadores locales con caballo y reto. Al final se muestra quién gana y qué reto le toca al resto.

## Controles

- Carta a carta o automático con velocidad 1x, 2x, 3x y 4x (turbo).
- Teclado: Espacio o Enter saca carta, Escape cierra el panel abierto.
- Reiniciar pide un segundo toque para confirmar (sin diálogos del navegador).

## Archivos

```
index.html            versión clásica
style.css             estilos clásicos
deck.js               mazo y render de cartas (un SVG por carta)
game.js               lógica compartida
audio.js              sonidos con Web Audio API
sw.js                 service worker (cubre ambas versiones)
manifest.webmanifest  manifest de la clásica
icon.svg
galeria.html          galería de las 40 cartas para revisar el render
waynyan/
  index.html          versión waynyan
  waynyan.css
  waynyan.js          segmentos de ajustes e iconos de palo
  manifest.webmanifest
  icon.svg
  galeria.html
  fonts/              Press Start 2P y VT323 (woff2, licencia OFL)
```

## Cartas

Cada carta es un único SVG con `viewBox` 200x300, sin gradientes ni ids, así se ve nítida a cualquier tamaño y en pantallas de alta densidad. Incluye la orla con las pintas tradicionales (Oros sin corte, Copas 1, Espadas 2, Bastos 3), índice en dos esquinas, pintas del 2 al 7, as grande, figuras dibujadas (sota, caballo y rey) y reverso.

## Color de acento (waynyan)

La versión waynyan no tiene selector de color. Al cargar lee el acento que guardó el home de gemu404.cl en `localStorage` (mismo origen) y lo aplica a `--accent`. Si no encuentra nada usa cian `#00e5ff`. También escucha el evento `storage`, así que si se cambia el acento en otra pestaña se actualiza sola. La lista de claves que revisa está al inicio de `waynyan/index.html`.

## Probar en local

Abrir `index.html` funciona directo, pero el service worker necesita un servidor:

```
python3 -m http.server 8080
```

y entrar a `http://localhost:8080/` o `http://localhost:8080/waynyan/`.

## Despliegue

Todas las rutas son relativas, así que la carpeta se puede servir desde cualquier subruta, por ejemplo `/srv/gemu404/jinetes/`. Al publicar una versión nueva hay que subir `VERSION` en `sw.js` para que se renueve la cache.

## Créditos

Hecho por GeMu. Fuentes Press Start 2P (CodeMan38) y VT323 (Peter Hull), licencia SIL Open Font License, incluida en `waynyan/fonts/OFL.txt`.
