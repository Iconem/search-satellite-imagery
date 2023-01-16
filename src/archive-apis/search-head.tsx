// Code for searching Head Aerospace API reverse engineered

import ky from 'ky';
import {shapeIntersection, get_imagery_price, head_constellation_dict, constellation_dict, Providers, head_search_names, providers_dict} from './search-utilities'

/* ------------------- */
/*    HEAD Aerospace   */
/* ------------------- */
// https://headfinder.head-aerospace.eu/sales
// https://catalyst.earth/catalyst-system-files/help/references/gdb_r/gdb2N127.html

const head_limit = 300
const head_base_url = 'https://headfinder.head-aerospace.eu/satcat-db02/'
// const head_satellites_sel = '$SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3$'

const unique = (value, index, self) => self.indexOf(value) === index
const head_satellites_sel = 
  '$' + 
  providers_dict[Providers.HEADAEROSPACE].map(
    constellation => constellation_dict[constellation]
      .satellites.map(sat => head_search_names[sat])
  )
  .flat()
  .filter(unique)
  .join('$')
  + '$'
console.log('head_satellites_sel', head_satellites_sel)

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

const search_head = async (search_settings, searchPolygon=null) => {
  const polygon_str = JSON.stringify(search_settings.coordinates.map(c => c.map(xy => [xy[1], xy[0]])))
  const polygon_coords = (polygon_str.replaceAll('[', '(') as string).replaceAll(']', ')') as string

  // Setup request string for HEAD with hash in get url
  const request_string = `&category=search-browser-01&browserfp=2230104508&session=875857144&searchcnt=3&mousemovecnt=2617&tilescnt=2545&sessionsecs=1379&catalogue=PU&catconfigid=HEAD-wc37&aoi=polygon${polygon_coords}&maxscenes=${head_limit}&datestart=${search_settings.startDate.toISOString().substring(0,10)}&dateend=${search_settings.endDate.toISOString().substring(0,10)}&cloudmax=${search_settings.cloudCoverage}&offnadirmax=${max_abs(search_settings.offNadirAngle)}&overlapmin=${search_settings.aoiCoverage}&scenename=&satellites=${head_satellites_sel}&`
  const k17string = request_string.substring(request_string.indexOf('category=') + 9).toLowerCase()

  // const head_search_url = head_base_url + "?req=d01-nl-xdebug-xstep-" + request_string + "&user=_" + crc32(k17string) + "&"
  const head_search_url = `${head_base_url}?req=d01-nl-xdebug-xstep-${request_string}&user=_${crc32(k17string)}&`

  const res_text = await ky.get( head_search_url).text()  
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
  return {
    'features': [],
    'type': 'FeatureCollection'
  }
}


/*
{"sceneidx":4,"frset":"","identifier":"JL1GF03D29_PMS_20220922182623_200103300_103_0018_001_L1","sensor":"JL1GF03-PMS","datedir":"2022-09-22","acquisitiontime":"2022-09-22 18:27:04","cloudcover":"0","offnadir":"10","sunel":"39","footprintlon":["dummy record 0",2.37362000,2.61347000,2.54887000,2.30976000,2.37362000],"footprintlat":["dummy record 0",48.95430000,48.91190000,48.75460000,48.79700000,48.95430000],"serpentines":[]}

https://api-02.eoproc.com/cat-02-tiles/?&sat=JL1GF03-PMS&scdate=2022-09-22&scid=13-4154-2817-JL1GF03D29_PMS_20220922182623_200103300_103_0018_001_L1.jpg&OK&

`https://api-02.eoproc.com/cat-02-tiles/?&sat=${r.sensor}&scdate=${r.datedir}&scid=${tileZoom}-${tileX}-${tileY}-${r.identifier}.jpg&OK&`

// import WebMercatorViewport from 'viewport-mercator-project';
import {fitBounds} from '@math.gl/web-mercator';
const viewport = new WebMercatorViewport({width: 600, height: 400});
const bound = viewport.fitBounds(
  [[-73.9876, 40.7661], [-72.9876, 41.7661]],
  {padding: 20, offset: [0, -40]}
);

import bbox from '@turf/bbox';
// import MapGL, {WebMercatorViewport} from 'react-map-gl';
const get_tms_coords_from_bounds = (head_results_raw, searchPolygon=null) => {
  // const vp = new WebMercatorViewport(viewport);
  // const {longitude, latitude, zoom} = vp.fitBounds(
  //   [
  //     [minLng, minLat],
  //     [maxLng, maxLat]
  //   ],
  //   {
  //     padding: 40
  //   }
  // );


  
  const [minLng, minLat, maxLng, maxLat] = bbox(feature);

  mapRef.current.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat]
    ],
    {padding: 40, duration: 1000}
  );
}

}
*/


const head_tile_url = (r, tileZoom, tileX, tileY) => `https://api-02.eoproc.com/cat-02-tiles/?&sat=${r.sensor}&scdate=${r.datedir}&scid=${tileZoom}-${tileX}-${tileY}-${r.identifier}.jpg&OK&`


const format_head_results = (head_results_raw, searchPolygon=null) => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  return {
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
          'providerPlatform': `HEAD`, 
          'provider': `HEAD/${head_constellation_dict[r.sensor]?.constellation || r.sensor}`,
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
          
          'providerProperties': {
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
      return feature
    }
    ),
  }
}

export default search_head