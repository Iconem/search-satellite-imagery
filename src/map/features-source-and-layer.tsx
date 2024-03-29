// Simple Mapbox Source and Layer

import * as React from 'react'
import { Source, Layer } from 'react-map-gl'
import { lighten, darken } from '@mui/material/styles'
import PropTypes from 'prop-types'

FeaturesSourceAndLayer.propTypes = {
  features: PropTypes.any,
  lineLayer: PropTypes.bool,
  fillLayer: PropTypes.bool,
  id: PropTypes.string,
  theme: PropTypes.any,
}
function FeaturesSourceAndLayer(props): React.ReactElement {
  const theme = props.theme
  // console.log('FeaturesSourceAndLayer', props.features)
  return (
    <Source type="geojson" data={props.features}>
      {props.lineLayer && (
        <Layer
          {...{
            id: `features-line-${props.id as string}`,
            type: 'line',
            paint: {
              'line-color': lighten(theme.palette.primary.main, 0.5),
              'line-opacity': 1,
              'line-width': 3,
              'line-dasharray': [2, 1],
            },
          }}
        />
      )}
      {props.fillLayer && (
        <Layer
          {...{
            id: `features-fill-${props.id as string}`,
            type: 'fill',
            paint: {
              'fill-color': lighten(theme.palette.primary.main, 0.5),
              'fill-opacity': 0.5,
            },
            stroke: {
              color: darken(theme.palette.primary.main, 0.5),
              opacity: 1,
              'stroke-width': 3,
              width: 3,
            },
          }}
        />
      )}
    </Source>
  )
}

export default React.memo(FeaturesSourceAndLayer)
