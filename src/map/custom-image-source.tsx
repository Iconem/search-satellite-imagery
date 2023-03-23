// Simple Mapbox Source and Layer for Raster or TMS Source

import * as React from 'react'
import { Source, Layer } from 'react-map-gl'
import { Providers } from '../archive-apis/search-utilities'
import PropTypes from 'prop-types'

// import rewind from '@turf/rewind';
// import simplify from '@turf/simplify';
// import {polygon} from '@turf/helpers';
// import * as turf from "@turf/turf";
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import { getCoords } from '@turf/invariant'
import { polygon } from '@turf/helpers'

CustomImageSource.propTypes = {
  feature: PropTypes.any,
  rasterOpacity: PropTypes.number,
}

function CustomImageSource(props): React.ReactElement {
  const useTMSSource = [Providers.HEADAEROSPACE, Providers.SKYFI, Providers.OAM].includes(props.feature?.properties?.providerPlatform)

  // BUG DURING TREE SHAKING WITH other conditional if with same div types and different ids
  let coordinates
  const footprintBbox = [-180, -90, 180, 90]
  if (props.feature?.geometry?.coordinates?.length === 1) {
    coordinates = props.feature.geometry?.coordinates[0]

    // Depending on the providers, we will not use the same coordinates for the raster overlay. Arlula, we can pass directly the footprint coordinates
    if (props.feature.providerPlatform !== Providers.ARLULA) {
      if (!Array.isArray(coordinates)) {
        return <></>
      }

      let footprintPolygon = polygon(props.feature.geometry?.coordinates)
      // footprintPolygon = simplify(footprintPolygon, {tolerance: 0.01, highQuality: false});
      // footprintPolygon = rewind(footprintPolygon);
      const footprintBbox = bbox(footprintPolygon)
      footprintPolygon = bboxPolygon(footprintBbox)
      // BBOX is the easiest way to get the aoi footprint cooordinates sorted in the right order (needs from NW, clockwise)
      // Can also simplify the footprint to get a 4-coords polygon rather than 20-ish
      coordinates = getCoords(footprintPolygon)[0].slice(0, 4).reverse()
      // coordinates = footprintPolygon.geometry.coordinates[0].slice(0,4).reverse()
    }
  } else {
    coordinates = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]
  }

  if (props.feature?.properties?.preview_uri && props.rasterOpacity > 0) {
    // console.log('existing feature for custom imagery source', props.feature.properties.providerProperties.previewUriTiles, props.feature.properties.preview_uri, props.rasterOpacity, 'useTMSSource', useTMSSource)
    const previewUriTiles = props.feature?.properties?.providerProperties?.preview_uri_tiles || null
    return (
      <>
        {useTMSSource && previewUriTiles?.url && (
          <Source
            id="map-source-tms"
            type="raster"
            tiles={[
              previewUriTiles?.url || '',
              // previewUriTiles?.url?.replaceAll('.png', '.jpg') || ''
            ]}
            tileSize={previewUriTiles?.tileSize || 256}
            scheme={previewUriTiles?.scheme || 'xyz'}
            bounds={footprintBbox}
            minzoom={previewUriTiles?.minzoom || 1}
            maxzoom={previewUriTiles?.maxzoom || 20}
            key={props.feature?.properties?.id}
          />
        )}
        {!useTMSSource && props.feature.properties.preview_uri && (
          <Source
            id="map-source-raster"
            type="image"
            url={(useTMSSource ? '' : props.feature.properties.preview_uri) || ''}
            coordinates={coordinates.slice(0, 4)}
            key={props.feature?.properties?.id}
            // url={''}
            // coordinates={[[0,0],[0,0],[0,0],[0,0]]}
          />
        )}
        <Layer id="overlay" source={useTMSSource ? 'map-source-tms' : 'map-source-raster'} type="raster" paint={{ 'raster-opacity': props.rasterOpacity }} minzoom={0} maxzoom={22} key={`use-tms-source-${+useTMSSource}`} />
      </>
    )
  }
  // In all other cases
  return <></>
}

export default React.memo(CustomImageSource)
