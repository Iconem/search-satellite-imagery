import * as React from 'react';
import {useState} from 'react';
import {render} from 'react-dom';
import Map, {useMap} from 'react-map-gl';
import type GeoJSON from 'geojson';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

// Custom Components and theme
import ControlPanel from './control-panel/control-panel';
import MapControls from './map/map-controls';
import FeaturesSourceAndLayer from './map/features-source-and-layer';
import {theme} from './theme';

export default function App() {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN; 

  const [drawFeatures, setDrawFeatures] = useState({});
  const [footprintFeatures, setFootprintFeatures] = useState<null | GeoJSON.FeatureCollection>(null);
  const [basemapStyle, setBasemapStyle] = useState("satellite-streets-v11");
  
  return (
    <>
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2
        }}
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
        />
        <FeaturesSourceAndLayer features={footprintFeatures} lineLayer={true} fillLayer={true} />

      </Map>
      <ControlPanel 
        polygons={Object.values(drawFeatures)} 
        setFootprintFeatures={setFootprintFeatures} 
      />
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
