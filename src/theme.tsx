import { lighten, darken } from '@mui/material/styles'
import { blue, grey } from '@mui/material/colors'
import darkScrollbar from '@mui/material/darkScrollbar'

// A custom theme for this app
const getDesignTokens = (themePaletteMode): any => ({
  spacing: 2,
  palette: {
    mode: themePaletteMode, // dark or light
    primary: {
      // main: red[500],
      main: blue.A400,
    },

    ...(themePaletteMode === 'light'
      ? {
          // No additional settings
        }
      : {
          background: {
            default: darken(blue[900], 0.8),
            paper: darken(blue[900], 0.8),
          },
        }),
    /*
    secondary: {
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    */
  },
  typography: {
    htmlFontSize: 18,
    fontFamily: ['Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          ...darkScrollbar(
            themePaletteMode === 'light'
              ? {
                  track: grey[200],
                  thumb: grey[400],
                  active: grey[400],
                }
              : undefined
          ),
          // scrollbarWidth for Firefox
          scrollbarWidth: 'thin',
        },
      },
    },

    MuiInputLabel: {
      defaultProps: {
        margin: 'dense',
      },
    },
    MuiListItem: {
      defaultProps: {
        dense: true,
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        margin: 'dense',
      },
    },
    MuiSlider: {
      defaultProps: {
        // size: 'small',
        // step: 1,
        // valueLabelDisplay: "auto"
        margin: '10px',
      },
    },
    // MuiGridPanel: {
    //   root: {
    //     marginLeft: 8,
    //   },
    //   paper: {
    //     maxWidth: '99vw',
    //     overflowX: 'auto',
    //   }
    // },
    // MuiGridItem: {
    //   defaultProps: {
    //     // paddingLeft: 0,
    //   },
    // },
  },
})

// mapbox-gl-draw styles:
// https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/EXAMPLES.md
const drawPolygonStyles = (theme): any => [
  // ACTIVE (being drawn)
  // line stroke
  {
    id: 'gl-draw-line',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': theme.palette.primary.main, // "#D20C0C",
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },
  // polygon fill
  {
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    paint: {
      'fill-color': theme.palette.primary.main, // "#D20C0C",
      'fill-outline-color': theme.palette.primary.main, // "#D20C0C",
      'fill-opacity': 0.1,
    },
  },
  // polygon mid points
  {
    id: 'gl-draw-polygon-midpoint',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 3,
      'circle-color': lighten(theme.palette.primary.main, 0.5), // '#fbb03b'
    },
  },
  // polygon outline stroke
  // This doesn't style the first edge of the polygon, which uses the line stroke styling instead
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': theme.palette.primary.main, // "#D20C0C",
      'line-dasharray': [0.2, 2],
      'line-width': 2,
    },
  },
  // vertex point halos
  {
    id: 'gl-draw-polygon-and-line-vertex-halo-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 5,
      'circle-color': '#FFF',
    },
  },
  // vertex points
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
    paint: {
      'circle-radius': 3,
      'circle-color': theme.palette.primary.main, // "#D20C0C",
    },
  },

  // INACTIVE (static, already drawn)
  // line stroke
  {
    id: 'gl-draw-line-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#000',
      'line-width': 3,
    },
  },
  // polygon fill
  {
    id: 'gl-draw-polygon-fill-static',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
    paint: {
      'fill-color': '#000',
      'fill-outline-color': '#000',
      'fill-opacity': 0.1,
    },
  },
  // polygon outline
  {
    id: 'gl-draw-polygon-stroke-static',
    type: 'line',
    filter: ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'static']],
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#000',
      'line-width': 3,
    },
  },
]

export { getDesignTokens, drawPolygonStyles }
