// Simple component made to switch the mapbox basemap style from sat to streets etc

import * as React from 'react';
import { useMap } from 'react-map-gl';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMap } from '@fortawesome/free-solid-svg-icons';
import { Button, ImageList, ImageListItem } from '@mui/material';
import ClickAwayListener from '@mui/base/ClickAwayListener';

function MapboxStyleSwitcher(props) {
  const [styleSwitcherOpen, setStyleSwitcherOpen] = React.useState(false);
  const { current: map } = useMap();
  const [bearing, pitch] = [0, 0];
  const [width, height] = [128, 128];
  // Static API url map definition and example
  // https://api.mapbox.com/styles/v1/mapbox/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}|{bbox}|{auto}/{width}x{height}{@2x}
  // https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-122.337798,37.810550,9.67,0.00,0.00/1000x600@2x?access_token=pk.
  const staticMapUrls = [
    'satellite-streets-v11',
    'streets-v11',
    'dark-v10',
    'satellite-v9',
    // 'light-v10'
  ].map((style_id) => ({
    style_id,
    url: `https://api.mapbox.com/styles/v1/mapbox/${style_id}/static` + `/${map.getCenter().lng},${map.getCenter().lat},${Math.max(1, map.getZoom() - 2)},${bearing},${pitch}` + `/${width}x${height}@2x?access_token=${props.mapboxAccessToken}&attribution=false`, // {@2x}
  }));
  return !styleSwitcherOpen ? (
    <div className="mapboxgl-ctrl mapboxgl-ctrl-group">
      <button
        type="button"
        title="Switch Basemap Style"
        onClick={() => {
          setStyleSwitcherOpen(!styleSwitcherOpen);
        }}
      >
        <span className="mapboxgl-ctrl-icon" style={{ padding: '7px' }}>
          <FontAwesomeIcon icon={faMap} />{' '}
        </span>
      </button>
    </div>
  ) : (
    <div className={'mapboxgl-ctrl mapboxgl-ctrl-group'} style={{ filter: 'invert(100%) brightness(100%) contrast(100%)' }}>
      {/* <ImageList sx={{ width: 500, height: 450 }} cols={3} rowHeight={164}> */}
      <ClickAwayListener onClickAway={() => { setStyleSwitcherOpen(false); }}>
        <ImageList
          cols={4}
          sx={{ m: '2px' }}
          // onMouseLeave= {() => setStyleSwitcherOpen(false)}
        >
          {staticMapUrls.map((item) => (
            <ImageListItem key={item.style_id} sx={{ cursor: 'pointer', width: '96px' }}>
              <img
                src={item.url}
                alt={item.style_id}
                loading="lazy"
                onClick={(e) => {
                  props.setBasemapStyle(item.style_id);
                  setStyleSwitcherOpen(false);
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      </ClickAwayListener>
    </div>
  );
}

export default React.memo(MapboxStyleSwitcher);
