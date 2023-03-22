// Simple component made to switch the mapbox basemap style from sat to streets etc

import * as React from 'react'
import { useMap } from 'react-map-gl'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMap } from '@fortawesome/free-solid-svg-icons'
import { ImageList, ImageListItem } from '@mui/material'
import ClickAwayListener from '@mui/base/ClickAwayListener'
import PropTypes from 'prop-types'

MapboxStyleSwitcher.propTypes = {
  setBasemapStyle: PropTypes.func,
  mapboxAccessToken: PropTypes.string,
}

function MapboxStyleSwitcher(props): React.ReactElement {
  const [styleSwitcherOpen, setStyleSwitcherOpen] = React.useState(false)
  const { current: map } = useMap()
  const [bearing, pitch] = [0, 0]
  const [width, height] = [128, 128]
  // Static API url map definition and example
  // https://api.mapbox.com/styles/v1/mapbox/{styleId}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}|{bbox}|{auto}/{width}x{height}{@2x}
  // https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.337798,37.810550,9.67,0.00,0.00/1000x600@2x?access_token=pk.
  const centerLng = map?.getCenter()?.lng ?? 0
  const centerLat = map?.getCenter()?.lat ?? 0
  const centerZoom = Math.max(1, (map?.getZoom() ?? 1) - 2)
  const staticMapUrls = [
    'satellite-streets-v11',
    'streets-v11',
    'dark-v10',
    'satellite-v9',
    // 'light-v10'
  ].map((styleId) => ({
    styleId,
    url: `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/${centerLng},${centerLat},${centerZoom},${bearing},${pitch}/${width}x${height}@2x?access_token=${props.mapboxAccessToken as string}&attribution=false`, // {@2x}
  }))
  return !styleSwitcherOpen ? (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
      <button
        type="button"
        title="Switch Basemap Style"
        onClick={() => {
          setStyleSwitcherOpen(!styleSwitcherOpen)
        }}
      >
        <span className="mapboxgl-ctrl-icon" style={{ padding: '7px' }}>
          <FontAwesomeIcon icon={faMap} />{' '}
        </span>
      </button>
    </div>
  ) : (
    <div className={'mapboxgl-ctrl mapboxgl-ctrl-group'}>
      {/* <ImageList sx={{ width: 500, height: 450 }} cols={3} rowHeight={164}> */}
      <ClickAwayListener
        onClickAway={() => {
          setStyleSwitcherOpen(false)
        }}
      >
        <ImageList
          cols={4}
          sx={{ m: '2px' }}
          // onMouseLeave= {() => setStyleSwitcherOpen(false)}
        >
          {staticMapUrls.map((item) => (
            <ImageListItem key={item.styleId} sx={{ cursor: 'pointer', width: '96px', filter: 'invert(100%) brightness(100%) contrast(100%)' }}>
              <img
                src={item.url}
                alt={item.styleId}
                loading="lazy"
                onClick={(e) => {
                  props.setBasemapStyle(item.styleId)
                  setStyleSwitcherOpen(false)
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      </ClickAwayListener>
    </div>
  )
}

export default React.memo(MapboxStyleSwitcher)
