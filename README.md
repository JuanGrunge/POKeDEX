# PokeDEX v0.6

Proyecto web estatico tipo Pokedex con interfaz retro y busqueda de Pokemon usando PokeAPI.

## Estructura
- `index.html` pagina principal
- `css/styles.css` estilos
- `js/app.js` logica y consumo de API
- `img/` recursos estaticos (reservado)

## Uso
Abrir `index.html` en el navegador o servir con un servidor estatico.

## Tutorial rapido
### Desktop
- Mouse: clic en A/B para cambiar vista INFO/STATS, SELECT para confirmar, D-pad para navegar lista (arriba/abajo) y cambiar pagina (izq/der).
- Teclado: flechas arriba/abajo para mover seleccion, izquierda/derecha para cambiar pagina, barra espaciadora para confirmar, teclas A/B para cambiar vista.
- Busqueda: escribe en SEARCH y presiona ENTER o el boton SEARCH.

### Movil portrait
- Navegacion principal con botonera tactil: D-pad arriba/abajo mueve seleccion, izq/der cambia pagina, SELECT confirma, A/B cambian vista.
- Busqueda: toca SEARCH, escribe y confirma con ENTER o boton SEARCH.
- Todo se muestra en una sola columna (viewer arriba, browser abajo, controles al final).

### Movil landscape
- Interfaz en panel unico: controles a la izquierda, viewer al centro, browser a la derecha.
- Tocar D-pad y botones A/B/SELECT funciona igual que en desktop.

## Dependencias externas
- PokeAPI: https://pokeapi.co/
- Google Fonts (Press Start 2P, VT323)

## Notas
- No requiere build.
- Listo para deploy estatico (GitHub Pages, Netlify, etc.).
