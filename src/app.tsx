import * as React from 'react'
import { render } from 'react-dom'
import Map, { type MapRef } from 'react-map-gl'
import type GeoJSON from 'geojson'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Split from 'react-split'

// Custom Components and theme
// import { createTheme, lighten, darken } from '@mui/material/styles';
import { getDesignTokens } from './theme'
import ControlPanel from './control-panel/control-panel'
import TimelineComponent from './control-panel/timeline-component'
import MapControls from './map/map-controls'
import CustomImageSource from './map/custom-image-source'
import FeaturesSourceAndLayer from './map/features-source-and-layer'
import { useLocalStorage } from './utilities'

function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>()
  React.useEffect(() => {
    ref.current = value
  })
  return ref.current
}

const defaultViewStateNaturalearth = {
  longitude: 53.75,
  latitude: 0.13,
  zoom: 2.35,
}
// const defaultViewStateMercator = {
//   longitude: 28.75,
//   latitude: 33.34,
//   zoom: 2.5,
// }

// Font-awesome when tree-shaking not working
// import {
//   faTwitter, faGithub,
// } from '@fortawesome/free-brands-svg-icons'
// import {
//   faChevronDown, faChevronUp, faCheck, faSatelliteDish,
//   faDownload, faDrawPolygon, faSliders, faEarthEurope,
//   faCalendarDay,
//   faChevronRight, faSatellite,
//   faCloudSun, faSquarePollHorizontal, faBolt, faVectorSquare,
//   faCropSimple, faGear, faTableCellsLarge,
//   faUpload, faSun, faMoon,
//   faMap, faLayerGroup,
//  } from '@fortawesome/free-solid-svg-icons'

// import { library } from '@fortawesome/fontawesome-svg-core'
// // import { fas } from '@fortawesome/free-solid-svg-icons'

// library.add(
//   faTwitter, faGithub,

//   faChevronDown, faChevronUp, faCheck, faSatelliteDish,
//   faDownload, faDrawPolygon, faSliders, faEarthEurope,
//   faCalendarDay,
//   faChevronRight, faSatellite,
//   faCloudSun, faSquarePollHorizontal, faBolt, faVectorSquare,
//   faCropSimple, faGear, faTableCellsLarge,
//   faUpload, faSun, faMoon,
//   faMap, faLayerGroup
// )

const App: React.FC = (props) => {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN
  const mapRef = React.useRef<MapRef>()

  // Default version of state
  // const [searchResults, setSearchResults] = React.useState(sample_results);
  // const [searchResults, setSearchResults] = React.useState(null);
  // const [basemapStyle, setBasemapStyle] = React.useState("satellite-streets-v11");
  // const [drawFeatures, setDrawFeatures] = useLocalStorage('drawFeatures', {});
  const [drawFeatures, setDrawFeatures] = React.useState({})
  // Local Storage Version of some state params
  const [searchResults, setSearchResults] = useLocalStorage('searchResults', null)
  const [basemapStyle, setBasemapStyle]: [string, any] = useLocalStorage('UI_map_basemapStyle', 'satellite-streets-v11')
  const [rasterOpacity, setRasterOpacity] = useLocalStorage('UI_rasterOpacity', 0.8)
  const [splitPanelSizesPercent, setSplitPanelSizesPercent] = useLocalStorage('UI_splitPanelSizesPercent', [75, 25])
  const [viewState, setViewState] = useLocalStorage('UI_map_viewState', defaultViewStateNaturalearth, false)

  // Edit map center when split panel modified
  const prevSplitPanelSizesPercent = usePrevious(splitPanelSizesPercent)
  React.useEffect(() => {
    if (prevSplitPanelSizesPercent !== splitPanelSizesPercent) {
      // const moveRatio = window.innerWidth * (splitPanelSizesPercent - prevSplitPanelSizesPercent)
      const moveRatio = prevSplitPanelSizesPercent ? (window.innerWidth * (splitPanelSizesPercent[1] - prevSplitPanelSizesPercent[1])) / 100 : 0
      const currentBounds = mapRef.current?.getBounds()
      const boundsCenter = currentBounds?.getCenter()
      if (boundsCenter) {
        // console.log('SPLIT MOVED, width', window.innerWidth, prevSplitPanelSizesPercent, splitPanelSizesPercent, 'ratio', moveRatio, 'currentBounds', currentBounds)
        mapRef?.current?.fitBounds(currentBounds, {
          padding: { top: 0, bottom: 0, left: 0, right: moveRatio },
          center: [boundsCenter.lng, boundsCenter.lat],
        })
      }
    } else {
      // console.log('Split did not move')
    }
  }, [splitPanelSizesPercent])

  const [footprintFeatures, setFootprintFeatures] = React.useState<null | GeoJSON.FeatureCollection>(null)
  // const [selectedFeature, setSelectedFeature] = useState<null | GeoJSON.Feature>(null);

  return (
    <>
      <style>
        {`

/* Split pane style and gutter */
.split {
  display: flex;
  flex-direction: row;
}

.gutter {
  /*background-color: #eee;*/
  background-repeat: no-repeat;
  background-position: 50%;
  pointer-events: auto;
}

.gutter.gutter-horizontal {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
  cursor: col-resize;
}

/* Display Controls at bottom-left horizontally sequentially, so never hidden by timeline */
.mapboxgl-ctrl-bottom-left > .mapboxgl-ctrl {
  clear: none;
}

/* Vertical Slider Fix in mapbox control */
.mapboxgl-ctrl.mapboxgl-ctrl-group .MuiSlider-valueLabelOpen {
  transform:translateX(65%) translateY(25%) scale(1);
}
.mapboxgl-ctrl.mapboxgl-ctrl-group .MuiSlider-valueLabel:before {
  bottom: 50%;
  left: 0;
}

          `}
      </style>

      {props.themePaletteMode === 'dark' && (
        <style>
          {`
          .mapboxgl-ctrl-top-left {
            filter: invert(100%) brightness(100%) contrast(100%);
          }
          `}
        </style>
      )}

      <Map
        // Either use this controlled state
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        // Or uncontrolled below
        // initialViewState={{
        //   longitude: 2.335936,
        //   latitude: 48.8616927,
        //   zoom: 10
        // }}
        ref={mapRef}
        hash={true}
        mapStyle={`mapbox://styles/mapbox/${basemapStyle || 'satellite-streets-v12'}`}
        mapboxAccessToken={MAPBOX_TOKEN}
        renderWorldCopies={false}
        dragRotate={false}
        projection={'naturalEarth'} // globe mercator naturalEarth equalEarth  // TODO: eventually make projection controllable

        // bounds= {[-180, -80, 180, 80]} // overrides longitude, latitude, zoom
        // fitBoundsOptions={{padding: 150}}
        // onStyleLoad={this.onMapLoad}
      >
        <MapControls theme={props.theme} mapboxAccessToken={MAPBOX_TOKEN} setDrawFeatures={setDrawFeatures} setBasemapStyle={setBasemapStyle} mapRef={mapRef} rasterOpacity={rasterOpacity} setRasterOpacity={setRasterOpacity} themePaletteMode={props.themePaletteMode} setThemePaletteMode={props.setThemePaletteMode} />
        <FeaturesSourceAndLayer theme={props.theme} features={footprintFeatures} lineLayer={true} fillLayer={true} id={'footprintFeatures'} />
        {/* 
        <FeaturesSourceAndLayer features={
          // Object.values(drawFeatures)[0]
          {
            type: 'FeatureCollection', 
            features: Object.values(drawFeatures)
          }
          } lineLayer={true} fillLayer={true} id={'aoiFeatures'} 
        /> 
        */}

        {/* Image Source and Layer can be placed on map via TMS or raster overlay if coordinates given in correct order */}
        <CustomImageSource feature={footprintFeatures} rasterOpacity={rasterOpacity} />

        {/* Layer ordering can be controlled via the beforeId prop set to point to empty layers, but would require some more logic here */}
      </Map>

      <div
        style={{
          position: 'absolute',
          zIndex: 100,
          top: '3%',
          bottom: '3%',
          left: '1%',
          right: '1%',
          // margin: '10px',
          // marginBottom: '40px',
          pointerEvents: 'none',
        }}
      >
        <Split
          sizes={splitPanelSizesPercent}
          minSize={100}
          expandToMin={false}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          className="split"
          style={{ height: '100%' }}
          onDragEnd={function (sizes) {
            setSplitPanelSizesPercent(sizes)
          }}
        >
          <TimelineComponent theme={props.theme} searchResults={searchResults} footprintFeatures={footprintFeatures} setFootprintFeatures={setFootprintFeatures} />
          <ControlPanel
            theme={props.theme}
            polygons={Object.values(drawFeatures)}
            setFootprintFeatures={setFootprintFeatures}
            footprintFeatures={footprintFeatures}
            // setSelectedFeature={setSelectedFeature}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            rasterOpacity={rasterOpacity}
            setRasterOpacity={setRasterOpacity}
            mapRef={mapRef}
          />
        </Split>
      </div>
    </>
  )
}

function ThemedApp(): React.ReactElement {
  const [themePaletteMode, setThemePaletteMode] = useLocalStorage('UI_app_themePaletteMode', 'dark')
  const theme = createTheme(getDesignTokens(themePaletteMode))
  // const theme = React.useMemo(() => createTheme(a), [themePaletteMode]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App theme={theme} themePaletteMode={themePaletteMode} setThemePaletteMode={setThemePaletteMode} />
    </ThemeProvider>
  )
}

function renderToDom(container): void {
  render(<ThemedApp />, container)
}

export { App, ThemedApp, renderToDom }
