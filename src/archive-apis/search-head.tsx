// Code for searching Head Aerospace API reverse engineered

import ky from 'ky';
import {shapeIntersection, get_imagery_price, head_constellation_dict, constellation_dict, Providers, head_search_names, providers_dict} from './search-utilities'
import {fitBounds, WebMercatorViewport} from '@math.gl/web-mercator';
import bbox from '@turf/bbox';

/* ------------------- */
/*    HEAD Aerospace   */
/* ------------------- */
// https://headfinder.head-aerospace.eu/sales
// https://catalyst.earth/catalyst-system-files/help/references/gdb_r/gdb2N127.html

const head_limit = 300
const head_base_url = 'https://headfinder.head-aerospace.eu/satcat-db02/'
// const head_satellites_sel = '$SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3$'

const unique = (value, index, self) => self.indexOf(value) === index
const _head_satellites_sel = 
  '$' + 
  providers_dict[Providers.HEADAEROSPACE].map(
    constellation => constellation_dict[constellation]
      .satellites.map(sat => head_search_names[sat])
  )
  .flat()
  .filter(unique)
  .join('$')
  + '$'

  const head_satellites_sel = '$SuperView-NEO$Jilin-GF04$GFMM$SuperView-2$SuperView$EarthScanner-KF1$GaoFen-7$Jilin-GXA$DailyVision1m-JLGF3$Jilin-GF02A/B$GaoFen-2$'

// in https://headfinder.head-aerospace.eu/cat-01/_ML-lib-01.js?2021-12-27
// in https://headfinder.head-aerospace.eu/cat-01/V-073.js?2022-05-11
function crc32(r) {
  for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];
  return(-1^n)>>>0
}
function get_head_price(feature) {
  return get_imagery_price(feature, feature.properties.sensor, head_constellation_dict)
}
const max_abs = (x) => Math.max(...x.map(Math.abs))

const search_head = async (search_settings, apikey='', searchPolygon=null, setters=null) => {
  const polygon_str = JSON.stringify(search_settings.coordinates.map(c => c.slice(0, -1).map(xy => [xy[1], xy[0]])))
  const polygon_coords = (polygon_str.replaceAll('[', '(') as string).replaceAll(']', ')') as string
  // Setup request string for HEAD with hash in get url
  const request_string = `&category=search-browser-01&browserfp=605607837&session=812167136&searchcnt=2&mousemovecnt=818&tilescnt=861&sessionsecs=118&catalogue=PU&catconfigid=HEAD-wc37&aoi=polygon${polygon_coords}&maxscenes=${head_limit}&datestart=${(new Date(search_settings.startDate - 1)).toISOString().substring(0,10)}&dateend=${(new Date(search_settings.endDate - 1)).toISOString().substring(0,10)}&cloudmax=${search_settings.cloudCoverage}&offnadirmax=${max_abs(search_settings.offNadirAngle)}&overlapmin=${search_settings.aoiCoverage}&scenename=&satellites=${head_satellites_sel}&`
  const k17string = request_string.substring(request_string.indexOf('category=') + 9).toLowerCase()

  const head_search_url = `${head_base_url}?req=d01-nl-${request_string}&user=_${crc32(k17string)}&`

  const res_text = await ky.get( head_search_url ).text()
  if (!res_text.includes('ERROR: APP failed')) {
    const payload_str = res_text.substring(
      res_text.indexOf('jsonscenelist=') + 14,
      res_text.lastIndexOf(']') + 1
    )
    const search_results_raw = JSON.parse(payload_str).slice(1)
    
    if (search_results_raw) {
      const search_results_json = format_head_results(search_results_raw, searchPolygon)
      console.log('HEAD Search URL: \n', head_search_url, '\nRAW HEAD search results: \n', search_results_raw, '\nJSON HEAD search results: \n', search_results_json)
      return { search_results_json, }
    }
  }
  console.log('Probable failure in HEAD request, ', head_search_url, ' with res_text', res_text)
  setters.setSnackbarOptions({
    open: true, 
    message: 'Probable failure in HEAD request resulted in error'
  })
  return {
    search_results_json: {
      'features': [],
      'type': 'FeatureCollection'
    }, 
    errorOnFetch: true
  }
}

// Payload for request for invoice: https://api-01.eoproc.com/api-01/?&-xdebug-step-&category=satcat-make-rq-html

const head_tile_url = (r, tileZoom, tileX, tileY, ext) => `https://api-02.eoproc.com/cat-02-tiles/?&sat=${r.sensor}&scdate=${r.datedir}&scid=${tileZoom}-${tileX}-${tileY}-${r.identifier}.${ext}&OK&`

const get_webmercator_tile_idx = (pt, zoom_shift=0) => {
  const lat_rad = pt.latitude * Math.PI / 180
  const zoom = Math.ceil(pt.zoom) + zoom_shift
  const scale = Math.pow(2, zoom)
  const tile_x = Math.floor(scale * ((pt.longitude + 180) / 360))
  const tile_y = Math.floor(scale * (1 - (Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI)) / 2)
  return {
    tile_x, tile_y, zoom
  }
}
const get_webmercator_tile_covering = (polygon, zoom_shift=0) => {
  const bounds = bbox(polygon)
  const [minLng, minLat, maxLng, maxLat] = bounds
  const bounds_fit = fitBounds({
    width: 800,
    height: 800,
    bounds: [
      [minLng, minLat], // southwest bound first
      [maxLng, maxLat]
    ]
  })
  const tile_idx = get_webmercator_tile_idx(bounds_fit, zoom_shift)
  return tile_idx
}

const format_head_results = (head_results_raw, searchPolygon=null) => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  const head_results = {
    'type': 'FeatureCollection',
    'features': head_results_raw.map(r => {
      const feature = {
        'geometry': {
          type: 'Polygon',
          coordinates: [
            r.footprintlon.slice(1).map((lon, idx) => [lon, r.footprintlat[1 + idx]])
          ]
        },
        'properties': { 
          'providerPlatform': Providers.HEADAEROSPACE, 
          'provider': `${Providers.HEADAEROSPACE}/${head_constellation_dict[r.sensor]?.constellation || r.sensor}`,
          'id': r.identifier, 
          'acquisitionDate': r.acquisitiontime.replace(' ', 'T') + '.0003Z', // or new Date(r.datedir).toISOString()
          'resolution': constellation_dict[head_constellation_dict[r.sensor]?.constellation]?.gsd || null, 
          'cloudCoverage': parseFloat(r.cloudcover),
          'constellation': `${head_constellation_dict[r.sensor]?.constellation || r.sensor}`,
          'sensor': r.sensor,
  
          // Other interesting properties on EOS results
          'shapeIntersection': null,
          // 'shapeIntersection': shapeIntersection(feature, searchPolygon),
          'price': null,
          'preview_uri': null,
          'thumbnail_uri': null,
          'providerProperties': {
            'preview_uri_tiles': null,
            'illuminationElevationAngle': r.sunel == -999 ? null : r.sunel,
            'incidenceAngle': r.offnadir == -999 ? null : r.offnadir,
            'azimuthAngle': null,
            'illuminationAzimuthAngle': null,
          },
        },
        'type': 'Feature'
      }
      feature.properties.shapeIntersection = shapeIntersection(feature.geometry, searchPolygon)
      feature.properties.price = get_head_price(feature)
      
      // Set preview uri by tapping into the TMS tiles (no other way, pretty bad)
      const tile_ext = r.sensor.includes('SV') && false ? 'png' : 'jpg'
      let zoom_shift = 1
      if (r.sensor.includes('SV')) {
        // For a few portion of SV images, extension is png
        zoom_shift = 0
      }
      const tile_coords = get_webmercator_tile_covering(feature, zoom_shift)
      feature.properties.preview_uri = head_tile_url(r, tile_coords.zoom, tile_coords.tile_x, tile_coords.tile_y, tile_ext)
      feature.properties.providerProperties.preview_uri_tiles = {
        url: head_tile_url(r, '{z}', '{x}', '{y}', 'png'),
        minzoom : tile_coords.zoom - 2,
        maxzoom : tile_coords.zoom + 2,
      }
      feature.properties.thumbnail_uri = feature.properties.preview_uri

      return feature
    }
    ),
  }
  head_results.features = head_results.features.filter(f => f.properties.sensor !== 'TEST1')
  return head_results
}

// MAP NOT WORKING https://api-02.eoproc.com/cat-02-tiles/?&sat=SV-1&scdate=2021-12-30&scid=13-4148-2816-SV-1-02_PMS_20211230_0_4417815.png&OK&
// WORKING: https://api-02.eoproc.com/cat-02-tiles/?&sat=SV-1&scdate=2022-05-14&scid=12-2073-1407-SV-1-03_PMS_20220514_0_4716909.png&OK&

export default search_head