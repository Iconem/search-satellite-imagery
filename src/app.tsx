import * as React from 'react';
import {useState} from 'react';
import {render} from 'react-dom';
import Map, {useMap, MapRef} from 'react-map-gl';
import type GeoJSON from 'geojson';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import Split from 'react-split'

// Custom Components and theme
import ControlPanel from './control-panel/control-panel';
import TimelineComponent from './control-panel/timeline-component';
import MapControls from './map/map-controls';
import FeaturesSourceAndLayer from './map/features-source-and-layer';
import {theme} from './theme';

import sample_results from './sample_results_up42_head_maxar.json'


export default function App() {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN; 
  const mapRef = React.useRef<MapRef>();

  const [drawFeatures, setDrawFeatures] = useState({});
  // const [searchResults, setSearchResults] = React.useState(null);
  const [searchResults, setSearchResults] = React.useState(sample_results);
  const [footprintFeatures, setFootprintFeatures] = useState<null | GeoJSON.FeatureCollection>(null);
  // const [selectedFeature, setSelectedFeature] = useState<null | GeoJSON.Feature>(null);
  const [basemapStyle, setBasemapStyle] = useState("satellite-streets-v11");
  
  // Support for split pane: react-split-pane only supports react v16 so switching to react-resizable-panels instead. https://github.com/tomkp/react-split-pane/issues/713

  
  return (
    <>
        <style>
            {`
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
  `}
        </style>
      <Map
        initialViewState={{
          // longitude: 0,
          // latitude: 20,
          // zoom: 2,
          longitude: 2.335936,
          latitude: 48.8616927,
          zoom: 10
        }}
        ref={mapRef}
        hash={true}
        mapStyle={`mapbox://styles/mapbox/${basemapStyle}`}
        mapboxAccessToken={MAPBOX_TOKEN}
        renderWorldCopies = {false}
        dragRotate= {false}
        // bounds= {[-180, -80, 180, 80]} // overrides longitude, latitude, zoom
        // fitBoundsOptions={{padding: 150}}
        // onStyleLoad={this.onMapLoad}
      >
        <MapControls 
          mapboxAccessToken={MAPBOX_TOKEN} 
          setDrawFeatures={setDrawFeatures} 
          setBasemapStyle={setBasemapStyle}
          mapRef={mapRef}
        />
        <FeaturesSourceAndLayer features={footprintFeatures} lineLayer={true} fillLayer={true} id={'footprintFeatures'}/>
        <FeaturesSourceAndLayer features={
          // Object.values(drawFeatures)[0]
          {
            type: 'FeatureCollection', 
            features: Object.values(drawFeatures)
          }
          } lineLayer={true} fillLayer={true} id={'aoiFeatures'} />

      </Map>

      <div style={{
        position: 'absolute', 
        zIndex: 100,
        top: '3%',
        bottom: '3%',
        left: '1%',
        right: '1%', 
        pointerEvents: 'none',
      }} > 
      <Split
        sizes={[75, 25]}
        minSize={100}
        expandToMin={false}
        gutterSize={10}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
        className="split"
        style={{height: '100%'}}
      >
        <TimelineComponent 
          searchResults={searchResults}  
          footprintFeatures={footprintFeatures} 
          setFootprintFeatures={setFootprintFeatures} 
        />
        <ControlPanel 
          polygons={Object.values(drawFeatures)} 
          setFootprintFeatures={setFootprintFeatures} 
          // setSelectedFeature={setSelectedFeature} 
          searchResults={searchResults} 
          setSearchResults={setSearchResults} 
        />
      </Split>
      </div>

      
    </>
  );
}

export function renderToDom(container) {
  render(
    <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
  container);
}
