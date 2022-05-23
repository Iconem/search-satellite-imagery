// Map controls:
// Existing Mapbox controls at top left: mapbox-gl-geocoder, mapbox-gl-draw, NavigationControl (Zoom in-out)
// + custom-built Style-Switcher at top left
// + ScaleControl at bottom left

import * as React from 'react';
import {useState, useCallback} from 'react';
import {NavigationControl, ScaleControl} from 'react-map-gl';

import {theme, draw_polygon_styles} from '../theme';
import MapboxStyleSwitcher from './mapbox-style-switcher';
import DrawControl from './draw-control';
import GeocoderControl from './geocoder-control';
import CustomOverlay from './custom-overlay';

function MapControls(props) {
  const onDrawUpdate = useCallback(e => {
    props.setDrawFeatures(currFeatures => {
      const newFeatures = {...currFeatures};
      // console.log(newFeatures, e.features)
      for (const f of e.features) {
        newFeatures[f.id] = f;
      }
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
      <ScaleControl unit={"metric"}/>
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
          rectangle: true
        }}
        onCreate={onDrawUpdate}
        onUpdate={onDrawUpdate}
        onDelete={onDrawDelete}
        styles= {draw_polygon_styles}
      />
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

      {/* <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
        <MapboxDrawRectangleControl 
          setBasemapStyle={props.setBasemapStyle}
        />
      </CustomOverlay> */}
    </>
  );
}

export default React.memo(MapControls);
