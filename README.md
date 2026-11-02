# 🏇 Carrera de Jinetes - Baraja Española

Juego interactivo en **HTML5, CSS3 y JavaScript puro (Vanilla)** del célebre juego de mesa tradicional con **baraja española de 40 cartas**.

---

## 🎯 ¿Cómo se juega?

### 1. La Pista y los Corredores
* **4 Jinetes en Salida:** Se separan los 4 Caballos (11s) de la baraja y se colocan en la línea de salida:
  * 🟡 **Oros** (*El Relámpago Dorado*)
  * 🔴 **Copas** (*El Furia Carmesí*)
  * 🔵 **Espadas** (*El Filo Plateado*)
  * 🟢 **Bastos** (*El Trueno Verde*)
* **Las Vallas (Obstáculos):** Se reparten cartas boca abajo a lo largo de la pista (5, 7 o 9 vallas según configuración).

### 2. Dinámica de la Carrera
* Se extraen cartas una por una del mazo.
* El caballo del palo de la carta extraída **avanza 1 casilla** hacia la meta.

### 3. ¡La Regla de las Vallas (Giro Dramático)!
* Cuando **todos los caballos** alcanzan o superan una valla, la carta boca abajo de esa valla **se da vuelta**.
* 💥 **Penalización:** ¡El caballo del mismo palo que la carta revelada **tropezó con el obstáculo y retrocede 1 casilla**!

### 4. Ganador
* El primer jinete en cruzar la línea de meta gana la carrera.

---

## ✨ Características del Proyecto

- 🃏 **Baraja Española Vectorial Auténtica:** Cartas y palos diseñados en SVG nítido, con orlas y "pintas" tradicionales (0 cortes en Oros, 1 en Copas, 2 en Espadas, 3 en Bastos).
- 🔊 **Efectos de Sonido 100% Procedurales:** Sintetizados con **Web Audio API** sin librerías externas (corneta de hipódromo, cascos al galope, volteo de cartas, tropiezos y fanfarria de victoria).
- 💰 **Sistema de Apuestas con Fichas de Casino:** Multiplicador 4.0x, selector de fichas ($10 a $500), botón All-in y persistencia de bankroll en `localStorage`.
- 🍻 **Modo Fiesta / Amigos:** Permite añadir nombres de jugadores locales, asignarles un caballo y definir retos o castigos para los perdedores.
- ⚙️ **Modos de Carrera:**
  - **Paso a paso (Manual):** Sacar carta una a una para vivir la tensión entre amigos.
  - **Carrera Automática:** Con selector de velocidad (1x, 2x, 3x y Turbo).
- 🎙️ **Relator en Vivo:** Ticker estilo transmisión de turf con comentarios dinámicos en tiempo real.
- 🎊 **Efecto Victoria:** Podio con medallas (1º al 4º puesto) y lluvia de confeti en canvas.

---

## 🚀 Cómo abrir el juego

Simplemente abre el archivo `index.html` en cualquier navegador web moderno (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari, Brave):

```
C:\Users\GeMu\DEV\carrera-de-jinetes\index.html
```
No requiere servidores, ni `npm install`, ni conexión a internet: funciona 100% offline.
