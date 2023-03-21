// Forked from the react-map-gl geocoder example https://visgl.github.io/react-map-gl/examples/geocoder
// Just removed pin on search result

import { useState } from 'react'
import { useControl, type MarkerProps, type ControlPosition, type MapRef } from 'react-map-gl'
import type * as React from 'react'

import MapboxGeocoder, { type GeocoderOptions } from '@mapbox/mapbox-gl-geocoder'
import PropTypes from 'prop-types'

type GeocoderControlProps = Omit<GeocoderOptions, 'accessToken' | 'mapboxgl' | 'marker'> & {
  mapboxAccessToken: string
  marker?: boolean | Omit<MarkerProps, 'longitude' | 'latitude'>

  position: ControlPosition

  onLoading?: (e: object) => void
  onResults?: (e: object) => void
  onResult?: (e: object) => void
  onError?: (e: object) => void
}

GeocoderControl.propTypes = {
  onError: PropTypes.func,
  onResult: PropTypes.func,
  mapRef: PropTypes.any,
}

export default function GeocoderControl(props): React.ReactComponent {
  // export default function GeocoderControl(props: GeocoderControlProps): React.ReactComponent {
  const [marker, setMarker] = useState(null)

  const geocoder = useControl<MapboxGeocoder>(
    () => {
      const ctrl = new MapboxGeocoder({
        ...props,
        marker: false,
        accessToken: props.mapboxAccessToken,
        flyTo: { duration: 0 },
      })
      //   ctrl.on('loading', props.onLoading);
      //   ctrl.on('results', props.onResults);
      ctrl.on('result', (evt) => {
        console.log('RESULT', evt)
        // props.onResult(evt)
        props.mapRef?.current?.fitBounds(evt?.result?.bbox, {
          padding: 0,
          center: evt?.result?.center,
        })

        const { result } = evt
        const location = result && (result.center || (result.geometry?.type === 'Point' && result.geometry.coordinates))
        // if (location && props.marker) {
        //   setMarker(<Marker {...props.marker} longitude={location[0]} latitude={location[1]} />)
        // } else {
        //   setMarker(null)
        // }
      })
      ctrl.on('error', props.onError)
      return ctrl
    },
    {
      position: props.position,
    }
  )

  if (geocoder._map) {
    if (geocoder.getProximity() !== props.proximity && props.proximity !== undefined) {
      geocoder.setProximity(props.proximity)
    }
    if (geocoder.getRenderFunction() !== props.render && props.render !== undefined) {
      geocoder.setRenderFunction(props.render)
    }
    if (geocoder.getLanguage() !== props.language && props.language !== undefined) {
      geocoder.setLanguage(props.language)
    }
    if (geocoder.getZoom() !== props.zoom && props.zoom !== undefined) {
      geocoder.setZoom(props.zoom)
    }
    if (geocoder.getFlyTo() !== props.flyTo && props.flyTo !== undefined) {
      console.log(props.flyTo)
      geocoder.setFlyTo(props.flyTo)
    }
    if (geocoder.getPlaceholder() !== props.placeholder && props.placeholder !== undefined) {
      geocoder.setPlaceholder(props.placeholder)
    }
    if (geocoder.getCountries() !== props.countries && props.countries !== undefined) {
      geocoder.setCountries(props.countries)
    }
    if (geocoder.getTypes() !== props.types && props.types !== undefined) {
      geocoder.setTypes(props.types)
    }
    if (geocoder.getMinLength() !== props.minLength && props.minLength !== undefined) {
      geocoder.setMinLength(props.minLength)
    }
    if (geocoder.getLimit() !== props.limit && props.limit !== undefined) {
      geocoder.setLimit(props.limit)
    }
    if (geocoder.getFilter() !== props.filter && props.filter !== undefined) {
      geocoder.setFilter(props.filter)
    }
    if (geocoder.getOrigin() !== props.origin && props.origin !== undefined) {
      geocoder.setOrigin(props.origin)
    }
    // Types missing from @types/mapbox__mapbox-gl-geocoder
    // if (geocoder.getAutocomplete() !== props.autocomplete && props.autocomplete !== undefined) {
    //   geocoder.setAutocomplete(props.autocomplete);
    // }
    // if (geocoder.getFuzzyMatch() !== props.fuzzyMatch && props.fuzzyMatch !== undefined) {
    //   geocoder.setFuzzyMatch(props.fuzzyMatch);
    // }
    // if (geocoder.getRouting() !== props.routing && props.routing !== undefined) {
    //   geocoder.setRouting(props.routing);
    // }
    // if (geocoder.getWorldview() !== props.worldview && props.worldview !== undefined) {
    //   geocoder.setWorldview(props.worldview);
    // }
  }
  return marker
}

const noop = (): void => {}

GeocoderControl.defaultProps = {
  marker: true,
  onLoading: noop,
  onResults: noop,
  onResult: noop,
  onError: noop,
}
