// Simple Mapbox Source and Layer

import * as React from 'react';
import {Source, Layer} from 'react-map-gl';
import { Providers } from '../archive-apis/search-utilities';

// import rewind from '@turf/rewind';
// import simplify from '@turf/simplify';
// import {polygon} from '@turf/helpers';
import * as turf from "@turf/turf";

// import turf from '@turf'

function CustomImageSource(props) {
  // console.log('CustomImageSource', props.feature)
  console.log('CustomImageSource')
  console.log('feature', props.feature)

  // BUG DURING TREE SHAKING WITH other conditional if with same div types and different ids
  if (props.feature?.properties?.providerPlatform == Providers.HEADAEROSPACE) {
    console.log(props.feature.properties.providerProperties.preview_uri_tiles)

    return <></>
    return (
      // <Source type="geojson" data={props.feature}>
      <>
      {/*
      <Source
          id="map-source"
          type="image"
          url={''}
          coordinates={[]}
      />
      <Layer
        id="overlay"
        source="map-source"
        type="raster"
        paint={{ "raster-opacity": 0.85 }}
      /> 
      */}
        <Source
            id="map-source-tms"
            type="raster"
            tiles={[props.feature.properties.providerProperties.preview_uri_tiles]}
            tileSize= {256}
        />
        <Layer
          id="overlay-tms"
          source="map-source-tms"
          type="raster"
          paint={{ "raster-opacity": 0.85 }}
          minzoom= {0}
          maxzoom= {22}
        />
      </>
    )
  }

  if (props.feature?.geometry?.coordinates?.length == 1) {
    let coordinates = props.feature.geometry?.coordinates[0]
    if (!Array.isArray(coordinates)) {
      return <></>
    }
    
    console.log('\n\nTURF MAGIC\n\n')
    let footprintPolygon = turf.polygon(props.feature.geometry?.coordinates)
    // footprintPolygon = simplify(footprintPolygon, {tolerance: 0.01, highQuality: false});
    // footprintPolygon = rewind(footprintPolygon);
    footprintPolygon = turf.bboxPolygon(turf.bbox(footprintPolygon));
    console.log(footprintPolygon)
    // BBOX is the easiest way to get the aoi footprint cooordinates sorted in the right order (needs from NW, clockwise)
    // Can also simplify the footprint to get a 4-coords polygon rather than 20-ish
    coordinates = turf.getCoords(footprintPolygon)[0].slice(0,4).reverse()
    // coordinates = footprintPolygon.geometry.coordinates[0].slice(0,4).reverse()
    console.log('coordinates', coordinates, props.feature.properties.preview_uri)

    if (coordinates.length == 4 && props.feature.properties.preview_uri) {
      
      return (
        <>
          <Source
              id="map-source"
              type="image"
              url={props.feature.properties.preview_uri}
              coordinates={coordinates}
              // url={''}
              // coordinates={[[0,0],[0,0],[0,0],[0,0]]}
          />
          <Layer
            id="overlay"
            source="map-source"
            type="raster"
            paint={{ "raster-opacity": 0.85 }}
          />
          {/* 
          <Source
              id="map-source-tms"
              type="raster"
              tiles={[]}
              tileSize= {256}
          />
          <Layer
            id="overlay-tms"
            source="map-source-tms"
            type="raster"
            paint={{ "raster-opacity": 0.85 }}
            minzoom= {0}
            maxzoom= {22}
          /> 
          */}
        </>
      );
    }
  } 
  // In all other cases
  return <></>
}

export default React.memo(CustomImageSource);
