// Map controls:
// Existing Mapbox controls at top left: mapbox-gl-geocoder, mapbox-gl-draw, NavigationControl (Zoom in-out)
// + custom-built Style-Switcher at top left
// + ScaleControl at bottom left

import * as React from 'react';

import {useState, useCallback} from 'react';
import {NavigationControl, ScaleControl, MapRef} from 'react-map-gl';

import {theme, draw_polygon_styles} from '../theme';
import MapboxStyleSwitcher from './mapbox-style-switcher';
import DrawControl from './draw-control';
import GeocoderControl from './geocoder-control';
import CustomOverlay from './custom-overlay';



import { v4 as uuidv4 } from 'uuid';
import DrawControlBis from './draw-control-bis';
import {fitBounds, WebMercatorViewport} from '@math.gl/web-mercator';
import bbox from '@turf/bbox';
import { kml } from "@tmcw/togeojson";

function KML_input(props) {

  function handleChange(event) {
    const kml_file = event.target.files[0]
    console.log(kml_file)
    const reader = new FileReader();

    console.log('props in handleChange', props)
    
    event.preventDefault()
    reader.onload = async (e) => { 
      const kml_content = e.target.result
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kml_content as string, 'text/xml');
      const geojson_features = kml(xmlDoc)
      console.log(geojson_features)

      // Zoom on imported kml
      const bounds = bbox(geojson_features)
      const [minLng, minLat, maxLng, maxLat] = bounds
      const bounds_fit = fitBounds({
        width: 800,
        height: 800,
        bounds: [
          [minLng, minLat], // southwest bound first
          [maxLng, maxLat]
        ]
      })
      console.log('mapRef', props)

      props.map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {padding: 150, duration: 500}
      );

      // props.setDrawFeatures(
      //   {
      //     type: 'FeaureCollection',
      //     features: [
      //       {
      //         // id: uuidv4(),
      //         type: 'Feature',
      //         geometry: {
      //           coordinates: [geojson_features.features[0].geometry.coordinates[0].map(co => co.slice(0,2))],
      //           type: 'Polygon'
      //         }
      //         // properties: {}
      //       }
      //     ]
      //   }
      // )
      // props.setDrawFeatures(
      //       {
      //         // id: uuidv4(),
      //         type: 'Feature',
      //         geometry: {
      //           coordinates: [geojson_features.features[0].geometry.coordinates[0].map(co => co.slice(0,2))],
      //           type: 'Polygon'
      //         }
      //         // properties: {}
      //       }
      // )
      // props.setDrawFeatures({
      //   type: 'FeatureCollection',
      //   features: [{
      //   id: uuidv4(),
      //   ...geojson_features.features[0]
      // }]})
      console.log('props in onload', props)
      // props.setDrawFeatures(currFeatures => {
      //   const newFeatures = {...currFeatures};
      //   for (const f of geojson_features.features) {
      //     f.id = uuidv4().replaceAll('-', '')
      //     f.properties = {}
      //     newFeatures[f.id] = f;
      //     console.log('load kml f', f)
      //   } 
      //     console.log('load kml newFeatures', newFeatures)
      //   return newFeatures;
      // });


      props.map.fire("draw.create", {
        features: [geojson_features.features[0]]
      });

    };
    reader.readAsText(event.target.files[0], 'UTF-8')


    // fetch("test/data/linestring.kml")
    //   .then(function (response) {
    //     return response.text();
    //   })
    //   .then(function (xml) {
    //     console.log();
    //   });


    // setFile(event.target.files[0])
  }

  return (
    <input id="kmlUploadInput" type="file" onChange={e => handleChange(e)} style={{ pointerEvents: 'auto' }} />
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
        console.log('draw f', f)
      }
      console.log('draw newFeatures', newFeatures)
      return newFeatures;
    });
  }, []);
  const onDrawUpdate = useCallback(e => {
    props.setDrawFeatures(currFeatures => {
      const newFeatures = {...currFeatures};
      // console.log(newFeatures, e.features)
      for (const f of e.features) {
        newFeatures[f.id] = f;
        console.log('draw f', f)
      }
      console.log('draw newFeatures', newFeatures)
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
          rectangle: true,
          test: true
        }}
        onCreate={onDrawCreate}
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
      <CustomOverlay position="top-left" style={{ pointerEvents: "all" }} >
        <KML_input setDrawFeatures={props.setDrawFeatures} mapRef={props.mapRef}/>
        {/*   ref={(ref) => this.upload = ref} style={{ display: 'none' }} /> */}
      </CustomOverlay>

    </>
  );
}

export default React.memo(MapControls);
