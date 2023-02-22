// Code for searching APOLLO MAPPING API

import ky from 'ky';
import {encode as base64_encode} from 'base-64';
import {Providers, max_abs} from './search-utilities'
import {parseJwt} from '../utilities'
import { v4 as uuidv4 } from 'uuid';
import bbox from '@turf/bbox';


// https://imagehunter.apollomapping.com/

const APOLLO_SEARCH_URL = 'https://imagehunter-api.apollomapping.com/ajax/search'
const apollo_domain = 'https://imagehunter.apollomapping.com'

const search_apollo = async (search_settings, apollo_apikey, searchPolygon=null, setters=null) => {
  const apollo_payload = {
    startDate: search_settings.startDate.toISOString().substring(0,19), // '1970-01-01T12:00:00',
    endDate: search_settings.endDate.toISOString().substring(0,19),
    coords: JSON.stringify(searchPolygon.geometry.coordinates), // [[2.3299598693847656,48.8607622103356],[2.35107421875,48.867763659652354],[2.366352081298828,48.851500724507346],[2.3411178588867188,48.844384028766385],[2.322235107421875,48.8539856815748],[2.322235107421875,48.8539856815748]],

    cloudcover_max: search_settings.cloudCoverage,
    offnadir_max: max_abs(search_settings.offNadirAngle),
    resolution_min: search_settings.gsd.min,
    resolution_max: search_settings.gsd.max,

    lazyLoad: false,
    satellites: ["HEX","EB","FS2","FS5","GS2","GF1H","GF2","GE1","BSG","IK","J14","J15","J1V","K2","K3","K3A",,"KZ1","OVS1","OVS23","PNEO","P1","QB","SP6","SKYC","SV1","TeL","TS","WV1","WV2","WV3","WV4"],
    dem: false,
    stereo: false,
    seasonal: false,
  }; 
  // Better have a look at maxar payload construction

  // cloudcover_max=100&offnadir_max=60&resolution_min=0&resolution_max=2&dem=false&coords=%5B%5B2.3299598693847656%2C48.8607622103356%5D%2C%5B2.35107421875%2C48.867763659652354%5D%2C%5B2.366352081298828%2C48.851500724507346%5D%2C%5B2.3411178588867188%2C48.844384028766385%5D%2C%5B2.322235107421875%2C48.8539856815748%5D%2C%5B2.322235107421875%2C48.8539856815748%5D%5D&seasonal=false&stereo=false&lazyLoad=false&startDate=2023-01-01T12%3A00%3A00&endDate=2023-02-23T08%3A19%3A10&satellites=%5B%22HEX%22%2C%22EB%22%2C%22FS2%22%2C%22FS5%22%2C%22GS2%22%2C%22GF1H%22%2C%22GF2%22%2C%22GE1%22%2C%22BSG%22%2C%22IK%22%2C%22J14%22%2C%22J15%22%2C%22J1V%22%2C%22K2%22%2C%22K3%22%2C%22K3A%22%2C%22KZ1%22%2C%22OVS1%22%2C%22OVS23%22%2C%22PNEO%22%2C%22P1%22%2C%22QB%22%2C%22SP6%22%2C%22SKYC%22%2C%22SV1%22%2C%22TeL%22%2C%22TS%22%2C%22WV1%22%2C%22WV2%22%2C%22WV3%22%2C%22WV4%22%5D

  console.log('apollo_payload', apollo_payload)

  // WIP, returns 401 unauthorized because origin and referer headers are overwritten on post
  return {
    'features': [], 
    type: 'FeatureCollection'
  }

  // Returns 401 Unauthorized probably because request is actually sent to http non-sll server url because dev server has no tls and origin and referer are overwritten by browser to localhost

  // const requestOptions = {headers: { 'Host': apollo_domain,  'Origin': apollo_domain,  'Referer': apollo_domain, }, method: 'POST'};
  // let apolloRequest = new Request(APOLLO_SEARCH_URL, requestOptions);
  let apolloRequest = APOLLO_SEARCH_URL

  const apollo_results_raw = await ky.post(
    apolloRequest,
    { 
      headers: {  
        'Host': apollo_domain, 
        'Origin': apollo_domain, 
        'Referer': apollo_domain, 
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': `${JSON.stringify(apollo_payload).length}`
      },
      json: apollo_payload,
    }
  ).json();
  console.log('apollo_results_raw', apollo_results_raw)
  const search_results_json = format_apollo_results(apollo_results_raw)
  console.log('apollo PAYLOAD: \n', apollo_payload.toString(), '\nRAW apollo search results: \n', apollo_results_raw, '\nJSON apollo search results: \n', search_results_json)

  return {
    search_results_json,
  }
}

const format_apollo_results = (apollo_results_raw) => {
  return {
    'features': apollo_results_raw.results.map(r => {
      // const parsedJwt = parseJwt(r.orderingID)
      return {
        'geometry': {
          coordinates: r.bounding, // r.overlap.polygon, 
          // coordinates: parsedJwt.polygon, // r.overlap.polygon, 
          type: 'Polygon',
        },
        'properties': {
          id: r.sceneID ?? uuidv4(), // or orderingID
          // constellation: apollo_constellation_dict[r.properties.constellation]?.constellation || r.properties.constellation,
          'price': r.bundles?.length > 0 && Math.min(...r.bundles.map(o => o.price / 100))[0],
          // 'price': parsedJwt.ordering?.length > 0 && Math.min(...parsedJwt.ordering.map(o => o.price / 100)),
          'providerPlatform': `${Providers.APOLLO}`, 
          'provider': `${Providers.APOLLO}/${r.supplier}-${r.platform}`, 
          'providerName': r.supplier,

          'resolution': r.gsd,
          'acquisitionDate': r.date, 
          'cloudCoverage': r.cloud,
          'shapeIntersection': r.overlap.percent.scene,
          'providerProperties': {
            'azimuthAngle': r.offNadir // or incidenceAngle
          },
          'preview_uri': r.thumbnail,
          'thumbnail_uri': r.thumbnail, 

        },
        'type': 'Feature'
      }
    }),
    'type': 'FeatureCollection'
  }
}

export default search_apollo 