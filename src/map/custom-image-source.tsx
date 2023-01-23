// Simple Mapbox Source and Layer for Raster or TMS Source

import * as React from 'react';
import {Source, Layer} from 'react-map-gl';
import { Providers } from '../archive-apis/search-utilities';

// import rewind from '@turf/rewind';
// import simplify from '@turf/simplify';
// import {polygon} from '@turf/helpers';
import * as turf from "@turf/turf";

function CustomImageSource(props) {
  // console.log('CustomImageSource', props.feature)
  const use_tms_source = props.feature?.properties?.providerPlatform == Providers.HEADAEROSPACE

  // BUG DURING TREE SHAKING WITH other conditional if with same div types and different ids
  let coordinates;
  let footprint_bbox = [-180, -90, 180, 90]
  if (props.feature?.geometry?.coordinates?.length == 1) {
    coordinates = props.feature.geometry?.coordinates[0]
    if (!Array.isArray(coordinates)) {
      return <></>
    }
    
    let footprintPolygon = turf.polygon(props.feature.geometry?.coordinates)
    // footprintPolygon = simplify(footprintPolygon, {tolerance: 0.01, highQuality: false});
    // footprintPolygon = rewind(footprintPolygon);
    footprint_bbox = turf.bbox(footprintPolygon)
    footprintPolygon = turf.bboxPolygon(footprint_bbox);
    // BBOX is the easiest way to get the aoi footprint cooordinates sorted in the right order (needs from NW, clockwise)
    // Can also simplify the footprint to get a 4-coords polygon rather than 20-ish
    coordinates = turf.getCoords(footprintPolygon)[0].slice(0,4).reverse()
    // coordinates = footprintPolygon.geometry.coordinates[0].slice(0,4).reverse()
    // console.log('coordinates', coordinates, props.feature.properties.preview_uri, use_tms_source)
  } else {
    coordinates = [[0,0],[0,0],[0,0],[0,0]]
  }

  if (props.feature?.properties?.preview_uri && props.rasterOpacity > 0) {
    console.log('existing feature for custom imagery source', props.feature.properties.providerProperties.preview_uri_tiles, props.feature.properties.preview_uri, props.rasterOpacity, 'use_tms_source', use_tms_source)
    return (
      <>
        {(use_tms_source) && <Source
            id="map-source-tms"
            type="raster"
            tiles={[props.feature?.properties?.providerProperties?.preview_uri_tiles?.url || '']}
            tileSize={256}
            scheme={'xyz'}
            bounds= {footprint_bbox} /* [sw.lng, sw.lat, ne.lng, ne.lat] */ 
            minzoom={props.feature?.properties?.providerProperties?.preview_uri_tiles?.minzoom || 1 }
            maxzoom={props.feature?.properties?.providerProperties?.preview_uri_tiles?.maxzoom || 20}
            key={props.feature?.properties?.id}
        />}
        {(!use_tms_source) && <Source
            id="map-source-raster"
            type="image"
            url={(use_tms_source ? '' : props.feature.properties.preview_uri) || ''}
            coordinates={coordinates}
            key={props.feature?.properties?.id}
            // url={''}
            // coordinates={[[0,0],[0,0],[0,0],[0,0]]}
        />}
        <Layer
          id="overlay"
          source={use_tms_source ? "map-source-tms" : "map-source-raster"}
          type="raster"
          paint={{ "raster-opacity": props.rasterOpacity }}
          minzoom= {0}
          maxzoom= {22}
          key={`use-tms-source-${use_tms_source}`}
        /> 
      </>
    );
  }
  // In all other cases
  return <></>
}

export default React.memo(CustomImageSource);
