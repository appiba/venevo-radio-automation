# Venevo Radio Automation

Aplicacion web tipo automatizador radial para usar desde GitHub Pages o desde una computadora local. Sirve para:

- Importar archivos de audio desde la computadora.
- Clasificar audios como musica, cuna, ID, cortina, programa o efecto.
- Armar una cola radial.
- Reproducir con Player A / Player B.
- Usar modo manual o automatico.
- Insertar IDs y cunas segun reglas.
- Usar pads rapidos.
- Agregar enlaces de YouTube como fuente externa oficial.
- Cargar una URL de streaming.
- Exportar historial en CSV.

## Como subirlo a GitHub Pages

Sube estos archivos al repositorio:

- `.nojekyll`
- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `README.md`

Luego entra a la pagina publicada por GitHub Pages, por ejemplo:

`https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`

No abras `index.html` directamente como archivo, porque YouTube puede bloquear la identificacion del sitio.

## Como usarlo

1. Pulsa **ACTIVAR AUDIO**.
2. Pulsa **Importar audios**.
3. Selecciona canciones, cunas, IDs o programas desde tu computadora.
4. Cambia el tipo de cada audio si hace falta.
5. Pulsa **Cola** en los audios que quieras programar.
6. Pulsa **Play**.
7. Activa **Automatico** para que el sistema inserte musica, IDs y cunas.

## Uso local opcional

Si algun dia quieres probarlo sin GitHub, abre `INICIAR VENEVO RADIO.cmd`. Eso levanta la app en una direccion local como:

`http://localhost:5173`

Esta opcion no es necesaria cuando ya usas GitHub Pages.

## Fuentes compatibles

- Archivos locales: MP3, WAV, AAC, M4A y OGG.
- Streaming o audio directo: URLs que entregan audio real, no paginas web.
- YouTube: videos o playlists mediante el reproductor oficial insertado.

## Importante

Por seguridad, un sitio web no puede leer toda tu carpeta de musica sin permiso.

Si usas Edge o Chrome desde `localhost` o GitHub Pages, puedes entrar a **Importar** y pulsar **Seleccionar carpeta de esta compu**. Esa computadora autoriza su propia carpeta musical y la app arma la biblioteca local. En ese mismo navegador tambien puede usar **Cargar carpeta guardada** para reconstruir la lista.

GitHub guarda la app, no sube tu musica. Cada computadora que use la app debe autorizar su propia carpeta.

## Siguiente etapa recomendada

La siguiente version deberia agregar:

- App de escritorio para Windows.
- Lectura permanente de carpetas musicales.
- Base de datos local.
- Programacion por dias y horas.
- Control remoto desde celular.
- Salida preparada para OBS o consola virtual.
- Reporte de comerciales por cliente.
