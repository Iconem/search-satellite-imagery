// Map controls:
// Existing Mapbox controls at top left: mapbox-gl-geocoder, mapbox-gl-draw, NavigationControl (Zoom in-out)
// + custom-built Style-Switcher at top left
// + ScaleControl at bottom left

import * as React from 'react';

import {useState, useCallback} from 'react';
import {NavigationControl, ScaleControl, MapRef} from 'react-map-gl';

import {draw_polygon_styles} from '../theme';
import MapboxStyleSwitcher from './mapbox-style-switcher';
import DrawControl from './draw-control';
import GeocoderControl from './geocoder-control';
import CustomOverlay from './custom-overlay';



import { v4 as uuidv4 } from 'uuid';
import bbox from '@turf/bbox';
import { kml } from "@tmcw/togeojson";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {  faUpload, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import {Slider} from '@mui/material';


function KML_input(props) {
  function handleKMLUpload(event) {
    event.preventDefault()
    const kml_file = event.target.files[0]
    console.log('kml_file info', kml_file)
    console.log('props in handleKMLUpload', props)
    const reader = new FileReader();
    reader.onload = async (e) => { 
      const kml_content = e.target.result
      const xmlDoc = new DOMParser()
        .parseFromString(kml_content as string, 'text/xml');
      const geojson_features = kml(xmlDoc)
      console.log('geojson_features from kml', geojson_features)

      // Zoom on imported kml
      const bounds = bbox(geojson_features)
      const [minLng, minLat, maxLng, maxLat] = bounds
      console.log('mapRef', props)
      props.mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {padding: 150, duration: 1000}
      );

      // Can be imported but not edited because not added to the draw features component
      console.log('props in onload', props)
      props.setDrawFeatures(
        [{...geojson_features.features[0], id: 'imported_kml_feature'}]
      )
      // Not useful
      // props.map.fire("draw.create", {
      //   features: [{...geojson_features.features[0], id: 'imported_kml_feature'}]
      // });

    };
    reader.readAsText(event.target.files[0], 'UTF-8')
  }

  return (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
    <input id="kmlUploadInput" type="file" onChange={e => handleKMLUpload(e)} style={{ pointerEvents: 'auto', display: 'none'  }} />
    <button type="button" title="Upload KML AOI" onClick={() => {document.getElementById('kmlUploadInput').click()}} >
      <span className="mapboxgl-ctrl-icon" style={{padding: '7px'}} ><FontAwesomeIcon icon={faUpload} /> </span>
    </button>
  </div>

    
  )
}

function MapControls(props) {
  const onDrawCreate = useCallback(e => {
    // console.log('this', this)
    // console.log('this', this.addFeatures)
    props.setDrawFeatures(currFeatures => {
      const newFeatures = {...currFeatures};
      // console.log(newFeatures, e.features)
      for (const f of e.features) {
        newFeatures[f.id] = f;
        // console.log('draw f', f)
      }
      // console.log('draw newFeatures', newFeatures)
      return newFeatures;
    });
  }, []);
  const onDrawUpdate = useCallback(e => {
    props.setDrawFeatures(currFeatures => {
      const newFeatures = {...currFeatures};
      // console.log(newFeatures, e.features)
      for (const f of e.features) {
        newFeatures[f.id] = f;
        // console.log('draw f', f)
      }
      // console.log('draw newFeatures', newFeatures)
      return newFeatures;
    });
  }, []);

  const onDrawDelete = useCallback(e => {
    props.setDrawFeatures(currFeatures => {
      const newFeatures = {...currFeatures};
      for (const f of e.features) {
        delete newFeatures[f.id];
      }
      return newFeatures;
    });
  }, []);

  return (
    <>
      <GeocoderControl 
        mapboxAccessToken={props.mapboxAccessToken} 
        position="top-left"
        flyTo={{speed: 2.5}} 
      />
      <DrawControl
        // modes={modes}
        position="top-left"
        displayControlsDefault={false} // false
        controls={{
          polygon: true,
          trash: true, 
          line_string: false,
          // @ts-ignore
          rectangle: true,
          test: true
        }}
        onCreate={onDrawCreate}
        onUpdate={onDrawUpdate}
        onDelete={onDrawDelete}
        styles= {draw_polygon_styles(props.theme)}
      />
      <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
        <KML_input setDrawFeatures={props.setDrawFeatures} mapRef={props.mapRef}/>
      </CustomOverlay>
      <NavigationControl 
        showCompass= {false}
        position="top-left" 
      />
      <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
        <MapboxStyleSwitcher 
          setBasemapStyle={props.setBasemapStyle}
          mapboxAccessToken={props.mapboxAccessToken} 
        />
      </CustomOverlay>

      <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
        <div 
          className="mapboxgl-ctrl mapboxgl-ctrl-group" 
          style={{
            height: '100px',
            paddingTop: '10px',
            paddingBottom: '10px',
          }}
        >
          <Slider
              min= {0} max= {1} step= {0.01}
              size= {'small'}
              orientation= {'vertical'}
              valueLabelDisplay= {'auto'}
              value={props.rasterOpacity}
              onChange={(event: Event, newValue: number | number[]) => props.setRasterOpacity(newValue)}
              valueLabelFormat={value => `Imagery Opacity: ${(value*100).toFixed(0)}%`}
              // Imagery Opacity: 
              // color={'#000'}
              sx={{
                '& input[type="range"]': {
                  WebkitAppearance: 'slider-vertical',
                },
              }}
            />
        </div>
      </CustomOverlay>


      <ScaleControl 
        unit={"metric"}
        // position="top-left"
        style={{clear: 'none'}}
      />

      {/* Control Theme Mode Dark vs Light */}
      <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
      <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button type="button" title={`Set ${props.themePaletteMode == 'dark' ? 'Light' : 'Dark'} Mode`} onClick={() => props.setThemePaletteMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))} >
          <span className="mapboxgl-ctrl-icon" style={{padding: '7px'}} ><FontAwesomeIcon icon={props.themePaletteMode == 'dark' ? faSun : faMoon} /> </span>
        </button>
        </div>
      </CustomOverlay>
    </>
  );
}

export default React.memo(MapControls);
