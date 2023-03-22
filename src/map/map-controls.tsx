// Map controls:
// Existing Mapbox controls at top left: mapbox-gl-geocoder, mapbox-gl-draw, NavigationControl (Zoom in-out)
// + custom-built Style-Switcher at top left
// + ScaleControl at bottom left

import * as React from 'react'

import { useCallback } from 'react'
import { NavigationControl, ScaleControl } from 'react-map-gl'

import { drawPolygonStyles } from '../theme'
import MapboxStyleSwitcher from './mapbox-style-switcher'
import DrawControl from './draw-control'
import GeocoderControl from './geocoder-control'
import CustomOverlay from './custom-overlay'
import PropTypes from 'prop-types'

import bbox from '@turf/bbox'
import { kml } from '@tmcw/togeojson'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { Slider } from '@mui/material'

KmlInput.propTypes = {
  mapRef: PropTypes.any,
  setDrawFeatures: PropTypes.func,
}

function KmlInput(props): React.ReactElement {
  function handleKMLUpload(event): void {
    event.preventDefault()
    const kmlFile = event.target.files[0]
    console.log('kmlFile info', kmlFile)
    console.log('props in handleKMLUpload', props)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const kmlContent: string = e.target?.result as string
      const xmlDoc = new DOMParser().parseFromString(kmlContent, 'text/xml')
      const geojsonFeatures = kml(xmlDoc)
      console.log('geojsonFeatures from kml', geojsonFeatures)

      // Zoom on imported kml
      const bounds = bbox(geojsonFeatures)
      const [minLng, minLat, maxLng, maxLat] = bounds
      console.log('mapRef', props)
      props.mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: 150,
          duration: 1000,
          center: [0.5 * (minLng + maxLng), 0.5 * (minLat + maxLat)],
        }
      )

      // Can be imported but not edited because not added to the draw features component
      console.log('props in onload', props)
      props.setDrawFeatures([{ ...geojsonFeatures.features[0], id: 'imported_kml_feature' }])
      // Not useful
      // props.map.fire("draw.create", {
      //   features: [{...geojsonFeatures.features[0], id: 'imported_kml_feature'}]
      // });
    }
    reader.readAsText(event.target.files[0], 'UTF-8')
  }

  return (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
      <input
        id="kmlUploadInput"
        type="file"
        onChange={(e) => {
          handleKMLUpload(e)
        }}
        style={{ pointerEvents: 'auto', display: 'none' }}
      />
      <button
        type="button"
        title="Upload KML AOI"
        onClick={() => {
          document.getElementById('kmlUploadInput')?.click()
        }}
      >
        <span className="mapboxgl-ctrl-icon" style={{ padding: '7px' }}>
          <FontAwesomeIcon icon={faUpload} />{' '}
        </span>
      </button>
    </div>
  )
}

MapControls.propTypes = {
  mapRef: PropTypes.any,
  setDrawFeatures: PropTypes.func,
  mapboxAccessToken: PropTypes.string,
  theme: PropTypes.any,
  setBasemapStyle: PropTypes.func,
  themePaletteMode: PropTypes.string,
  setThemePaletteMode: PropTypes.func,
  rasterOpacity: PropTypes.number,
  setRasterOpacity: PropTypes.func,
}

function MapControls(props): React.ReactElement {
  const onDrawCreate = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])
  const onDrawUpdate = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])

  const onDrawDelete = useCallback((e) => {
    props.setDrawFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        delete newFeatures[f.id]
      }
      return newFeatures
    })
  }, [])

  return (
    <>
      <GeocoderControl mapboxAccessToken={props.mapboxAccessToken} position="top-left" flyTo={{ speed: 2.5 }} mapRef={props.mapRef} />
      <DrawControl
        // modes={modes}
        position="top-left"
        displayControlsDefault={false} // false
        controls={{
          polygon: true,
          trash: true,
          line_string: false,
          // @ts-expect-error
          rectangle: true,
          test: true,
        }}
        onCreate={onDrawCreate}
        onUpdate={onDrawUpdate}
        onDelete={onDrawDelete}
        styles={drawPolygonStyles(props.theme)}
        setDrawFeatures={props.setDrawFeatures}
      />
      <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
        <KmlInput setDrawFeatures={props.setDrawFeatures} mapRef={props.mapRef} />
      </CustomOverlay>
      <NavigationControl showCompass={false} position="top-left" />
      <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
        <MapboxStyleSwitcher setBasemapStyle={props.setBasemapStyle} mapboxAccessToken={props.mapboxAccessToken} />
      </CustomOverlay>

      <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
        <div
          className="mapboxgl-ctrl mapboxgl-ctrl-group"
          style={{
            height: '100px',
            paddingTop: '10px',
            paddingBottom: '10px',
          }}
        >
          <Slider
            min={0}
            max={1}
            step={0.01}
            size={'small'}
            orientation={'vertical'}
            valueLabelDisplay={'auto'}
            value={props.rasterOpacity}
            onChange={(event: Event, newValue: number | number[]) => props.setRasterOpacity(newValue)}
            valueLabelFormat={(value) => `Imagery Opacity: ${(value * 100).toFixed(0)}%`}
            // Imagery Opacity:
            // color={'#000'}
            sx={{
              filter: props.themePaletteMode === 'dark' ? 'invert(100%) brightness(100%) contrast(100%);' : '',
              '& input[type="range"]': {
                WebkitAppearance: 'slider-vertical',
              },
            }}
          />
        </div>
      </CustomOverlay>

      <ScaleControl
        unit={'metric'}
        // position="top-left"
        style={{ clear: 'none' }}
      />

      {/* Control Theme Mode Dark vs Light */}
      <CustomOverlay position="top-left" style={{ pointerEvents: 'all' }}>
        <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
          <button type="button" title={`Set ${props.themePaletteMode === 'dark' ? 'Light' : 'Dark'} Mode`} onClick={() => props.setThemePaletteMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))}>
            <span className="mapboxgl-ctrl-icon" style={{ padding: '7px' }}>
              <FontAwesomeIcon icon={props.themePaletteMode === 'dark' ? faSun : faMoon} />{' '}
            </span>
          </button>
        </div>
      </CustomOverlay>
    </>
  )
}

export default React.memo(MapControls)
