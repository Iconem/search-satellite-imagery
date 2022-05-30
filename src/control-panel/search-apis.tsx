// Code for searching UP42, EOS, SkyWatch APIs using api keys env variables

import ky from 'ky';
import {encode as base64_encode} from 'base-64';
import area from '@turf/area';
import intersect from '@turf/intersect';

/*
SentinelHub cannot get API key with current plan with oauth 2 https://docs.sentinel-hub.com/api/latest/api/overview/authentication/
UP42: Project ID and Project API Key that are found in the section Developers on the console. https://console.up42.com/ in the form of https://console.up42.com/projects/UUID-xxxx/developers
EOS: https://api-connect.eos.com/user-dashboard/ https://doc.eos.com/api/#authorization-api
Skywatch: https://dashboard.skywatch.co/account/profile
*/

const up42_limit = 100
const eos_limit = 100
// const skywatch_limit = 10

/* -------------- */
/*      UP42      */
/* -------------- */
const up42_search_url = 'https://api.up42.com/catalog/stac/search'
const get_up42_bearer = async (up42_apikey) => {
    const up42_projectApi = base64_encode(`${up42_apikey.projectId}:${up42_apikey.projectApiKey}`)
    const up42_oauth_json = await ky.post(
        `https://api.up42.com/oauth/token`, 
        {
        headers: { 
            'Authorization': `Basic ${up42_projectApi}`,
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: 'grant_type=client_credentials'
        }
    ).json();

    const up42_bearer_json = `Bearer ${up42_oauth_json['access_token']}`
    console.log('up42_bearer_json', {up42_bearer: up42_bearer_json})
    return up42_bearer_json
}
// UP 42 API: Producer (operates the satellite) | Hosts (image provider offering access) | Collections
// https://docs.up42.com/developers/api#operation/getDataProducts
// CORS needed to reach UP42 api server

const search_up42 = async (search_settings, up42_apikey, searchPolygon=null, up42_bearer_json=null, up42_next_links=null) => {
  if (!up42_bearer_json) {
    up42_bearer_json = await get_up42_bearer(up42_apikey)
  }

  const up42_payload = {
    // 'datetime': '2019-01-01T00:00:00Z/2022-02-01T23:59:59Z',
    'datetime': `${search_settings.startDate.toISOString()}/${search_settings.endDate.toISOString()}`, 
    'intersects': {
    'type': 'Polygon',
    'coordinates': search_settings.coordinates
    },
    'limit': up42_limit,
    // 'collections': [
    //   'PHR'
    // ],
    'query': {
      'cloudCoverage': {
        'lte': search_settings.cloudCoverage
      },
      'resolution': {
        'gte': search_settings.gsd.min, 
        'lte': search_settings.gsd.max, 
      },
      'up42:usageType': {
        'in': [
          'DATA',
        ]
      },
      'producer': {
        'in': [
          'Airbus',
          'ESA',
          'CAPELLA_SPACE',
          'TWENTY_ONE_AT',
          'NEAR_SPACE_LABS'
        ]
      },
    }
  }
  // TODO: TEST next
  let next_url = ''
  if (up42_next_links) {
    const up42_next_href = up42_next_links.find(l => l.rel == 'next').href
    const up42_next_token = up42_next_href.substring(up42_next_href.lastIndexOf('/'))
    next_url = `?next=${up42_next_token}`
  }

  const up42_results_raw = await ky.post(up42_search_url + next_url, {
    headers: {'Authorization': up42_bearer_json},
    json: up42_payload
  }).json();
  const search_results_json = format_up42_results(up42_results_raw, searchPolygon)
  console.log('UP42 PAYLOAD: \n', up42_payload, '\nRAW UP42 search results: \n', up42_results_raw, '\nJSON UP42 search results: \n', search_results_json)

  return {
    search_results_json,
    up42_bearer_json,
  }
}

function get_up42_price(feature) {
  let price = null
  if (feature.properties.constellation in up42_constellation_price) {
    const price_info = up42_constellation_price[feature.properties.constellation]
    price = Math.max(area(feature.geometry) / 1_000_000, price_info.min_area) * price_info.price_per_sq_km
  }
  return Math.round(price)
}
const up42_constellation_dict = {
  'PHR': 'Pleiades'
}
const up42_constellation_price = { // price in euro per km2 with minimum
  'PHR': {
    price_per_sq_km: 10, // (10EUR/km2) no min
    min_area: 0
  }, 
  // 'HEAD SuperView': {
  //   price_per_sq_km: 9, // (9EUR/km2) 25km² min
  //   min_area: 25
  // }, 
  // 'HEAD EarthScanner': {
  //   price_per_sq_km: 7, // (7EUR/km2) 25km² min
  //   min_area: 25
  // }, 
}
const format_up42_results = (up42_results_raw, searchPolygon) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': up42_results_raw.features.map(feature => (
      {
        'geometry': feature.geometry,
        'properties': {
          ...feature.properties,
          constellation: up42_constellation_dict[feature.properties.constellation] || feature.properties.constellation,
          'price': get_up42_price(feature),
          'shapeIntersection': Math.round(area(intersect(feature, searchPolygon)) / area(searchPolygon) * 100),
          'provider': `UP42/${feature.properties.producer}`, // /${feature.properties.providerName}
        },
        'type': 'Feature'
      }
    )),
    'type': 'FeatureCollection'
  }
}


/* --------------- */
/*   EOS HIGHRES   */
/* --------------- */
// EOS query wont let you search Pleiades, Head, Kompsat, but only landsat, sentinel, naip etc
// EOS API HighRes https://doc.eos.com/hires.search.api/#high-resolution-datasets
// EOS API : https://doc.eos.com/search.api/#multi-dataset-search
let eos_search_highres_url = 'https://api.eos.com/api/v5/allsensors' 
eos_search_highres_url = 'https://lms-reselling.eos.com/api/v5/allsensors'
// EOS Search API is only valid for 2 weeks on new accounts, then requires a min 3k usd/year for 30k requests/month 
const search_eos_highres = async (search_settings, eos_apikey, eos_page_idx=1) => {
  const eos_payload_highres = {
    'search':{
      'satellites':[ 
        //   // 'SPOT 5', 'SPOT 6', 'SPOT 7', 
        //  'Pleiades 1A', 'Pleiades 1B', 
        //  'KOMPSAT-2', 'KOMPSAT-3', 'KOMPSAT-3A', 
        //  'SuperView-1', 'SuperView-2', 
        //  // 'Gaofen 1', 'Gaofen 2', 'Ziyuan 3'
        'KOMPSAT-2', 'KOMPSAT-3A', 'KOMPSAT-3', 'SuperView 1A', 'SuperView 1B', 'SuperView 1C', 'SuperView 1D', 'Gaofen 1', 'Gaofen 2', 'Ziyuan-3', 'TripleSat Constellation-1', 'TripleSat Constellation-2', 'TripleSat Constellation-3'
      ],
      'shape':{
        'type':'Polygon',
        'coordinates':search_settings.coordinates
      },
      // 'shape':{
      //   'type':'Polygon',
      //   'coordinates':[
      //      [ [ 34.755936, 48.533885], [ 34.774475, 48.533885], [ 34.774475, 48.549796], [ 34.755936, 48.549796], [ 34.755936, 48.533885]
      //      ]
      //   ]
      // },
      'date':{
        'from': search_settings.startDate.toISOString().substring(0,10), // YYYY-MM-DD date format
        'to': search_settings.endDate.toISOString().substring(0,10)
      },
      'cloudCoverage':{
        'from': 0,
        'to': search_settings.cloudCoverage
      },
      'sunElevation':{
        'from': search_settings.sunElevation[0],
        'to': search_settings.sunElevation[1]
      },
      'shapeIntersection':{
        'from': search_settings.aoiCoverage,
        'to': 100
      },
    },
    'sort':[{'field':'date', 'order': 'desc'}],
    'page':eos_page_idx,
    'limit':eos_limit
  }

  const search_results_raw = await ky.post(
    eos_search_highres_url, // + `?api_key=${eos_apikey}`, 
    {
      // headers: {
      //   'Authorization': `ApiKey ${eos_apikey}`
      // }, 
      json: eos_payload_highres
    }
  ).json();

  const search_results_json = format_eos_results(search_results_raw)
  console.log('EOS PAYLOAD: \n', eos_payload_highres, '\nRAW EOS search results raw: \n', search_results_raw, '\nRAW EOS search results raw: \n', search_results_json)
  return { search_results_json, }
}
const eos_constellation_dict = {
  'TripleSat Constellation-3': 'TripleSat 3'
}
const format_eos_results = (eos_results_raw) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': eos_results_raw.results.map(r => (
      {
        'geometry': r.dataGeometry,
        'properties': {
          'provider': `EOS/${r.provider}`,
          'id': r.sceneID, // r.sceneID r.id
          'acquisitionDate': new Date(r.date).toISOString(), //'2019-03-23T10:24:03.000Z',
          'resolution': r.resolution, // '1.5 m/pxl'
          'cloudCoverage': r.cloudCoverage,
          // 'constellation': `${r.productType}/${r.satellite}`,
          'constellation': r.satellite in eos_constellation_dict ? eos_constellation_dict[r.satellite] : r.satellite,
          
          // Other interesting properties on EOS results
          // eos.thumbnail, eos.browseURL, eos.provider, eos.product
          'shapeIntersection': r.shapeIntersection,
          'price': r.price,
          
          'preview_uri': r.browseURL,
          'thumbnail_uri': r.thumbnail,

          'providerProperties': {
            'illuminationElevationAngle': r.sunElevation,
            'incidenceAngle': null,
            'azimuthAngle': null,
            'illuminationAzimuthAngle': null,
            // 'producer': 'airbus', collection: 'PHR'
            // 'dataUri': 'gs://tcifg-idp-prod-datastore-data-pilot-nearline/PDWPHR_20190325084500_4_SO19009267-4-01_DS_PHR1B_201903231024035_FR1_PX_E013N52_0915_02862.zip',
          },
        },
        'type': 'Feature'
      }
    )),
    'type': 'FeatureCollection'
  }
}

/* -------------- */
/*   EOS LOWRES   */
/* -------------- */
const eos_search_lowres_url = 'https://gate.eos.com/api/lms/search/v2'
const search_eos_lowres = async (search_settings, eos_apikey, eos_page_idx=1) => {
  const eos_payload_lowres = {
    'fields': [
    'sunElevation', 'cloudCoverage', 'sceneID', 'date', 'path', 'storedInCollection',
      'productID', 'sensor', 'row', 'dataCoveragePercentage'               
    ],
    'limit': eos_limit,
    'page': eos_page_idx,
    'search': {
      'satellites': ['sentinel2', 'landsat8', 'naip'], // , 'modis', 'cbers4', 'sentinel1', 'landsat7', 'landsat5', 'landsat4'],
      // 'date': {'from': '2019-08-01', 'to': '2020-06-01'},
      'date': {'from': search_settings.startDate.toISOString().substring(0,10), 'to': search_settings.endDate.toISOString().substring(0,10)},
      'cloudCoverage': {'from': 0,'to': search_settings.cloudCoverage},
      'sunElevation': {'from': search_settings.sunElevation[0],'to': search_settings.sunElevation[1]},
      'shape': {
        'type': 'Polygon',
        'coordinates': search_settings.coordinates
      }
    }
  }

  const search_results_json = await ky.post(eos_search_lowres_url + `?api_key=${eos_apikey}`, {
      json: eos_payload_lowres
  }).json();
  console.log('EOS PAYLOAD: \n', eos_payload_lowres, '`n', 'EOS search results: \n', search_results_json)
  return {
    search_results_json,
  }
}


/* -------------- */
/*    SKYWATCH    */
/* -------------- */
const skywatch_search_url = 'https://api.skywatch.co/earthcache/archive/search'
const perform_skywatch_search = (skywatch_apikey, searchId) => 
  ky.get( `${skywatch_search_url}/${searchId['data'].id}/search_results`, {
    headers: { 'x-api-key': skywatch_apikey },
  })

const search_skywatch = async (search_settings, skywatch_apikey) => {
  const resolution_array = [] // ['low', 'medium', 'high']
  if (search_settings.gsd.min <= 1) resolution_array.push('high')
  if (search_settings.gsd.max >= 5) resolution_array.push('low')
  if ((search_settings.gsd.min <= 1.5) && (search_settings.gsd.max >= 1.5) || (search_settings.gsd.min <= 5) && (search_settings.gsd.max >= 5)) resolution_array.push('medium')

  const skywatch_payload = {
    'location': {
      'type': 'Polygon',
      'coordinates': search_settings.coordinates,
    },
    'start_date': search_settings.startDate.toISOString().substring(0,10),
    'end_date': search_settings.endDate.toISOString().substring(0,10),
    'resolution': resolution_array,
    'coverage': search_settings.cloudCoverage,
    'interval_length': 0,
    'order_by': ['resolution', 'date', 'cost']
  }
  console.log('SKYWATCH PAYLOAD: \n', skywatch_payload, '\n')

  const searchId = await ky.post(skywatch_search_url, {
    headers: {'x-api-key': skywatch_apikey},
    json: skywatch_payload, 
  }).json();
  console.log('SKYWATCH searchId: \n', searchId, '\n')

  let search_results_raw
  let n_queries = 0
  let retry_delay = 400
  const max_query_count = 5
  while (n_queries++ < max_query_count) {
    const search_query_response = await perform_skywatch_search(skywatch_apikey, searchId)
    console.log('n_queries', n_queries, 'retry_delay', retry_delay, 'response status', search_query_response.status, search_query_response)
    if (search_query_response.status == 202) {
      // Wait for some delay before querying again search api
      await new Promise(resolve => setTimeout(resolve, retry_delay));
      retry_delay *= 2
    } else {
      search_results_raw = await search_query_response.json();
      n_queries = max_query_count
    }
  }
  
  if (search_results_raw) {
    const search_results_json = format_skywatch_results(search_results_raw)
    console.log('SKYWATCH PAYLOAD: \n', skywatch_payload, '\nRAW SKYWATCH search results: \n', search_results_raw, '\nJSON SKYWATCH search results: \n', search_results_json)
    return { search_results_json, }
  }
  return {
    'features': [],
    'type': 'FeatureCollection'
  }
}

const format_skywatch_results = (skywatch_results_raw) => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  return {
    'type': 'FeatureCollection',
    'features': skywatch_results_raw.data.map(r => ({
      'geometry': r.location,
      'properties': {
        'provider': `SKYWATCH/${r.source}`,
        'id': r.id, 
        'acquisitionDate': r.start_time, // or end_time '2019-03-23T10:24:03.000Z',
        'resolution': r.resolution, 
        'cloudCoverage': r.result_cloud_cover_percentage,
        'constellation': `${r.source}`,

        // Other interesting properties on EOS results
        // skywatch.thumbnail_uri, skywatch.preview_uri, skywatch.provider, skywatch.product
        'shapeIntersection': r.location_coverage_percentage,
        'price': r.cost,
        
        preview_uri: r.preview_uri,
        thumbnail_uri: r.thumbnail_uri,

        'providerProperties': {
          'illuminationElevationAngle': null,
          'incidenceAngle': null,
          'azimuthAngle': null,
          'illuminationAzimuthAngle': null,
          // 'producer': 'airbus', collection: 'PHR'
          // 'dataUri': 'gs://tcifg-idp-prod-datastore-data-pilot-nearline/PDWPHR_20190325084500_4_SO19009267-4-01_DS_PHR1B_201903231024035_FR1_PX_E013N52_0915_02862.zip',
        },
      },
      'type': 'Feature'
      })
    ),
  }
}

export {search_up42, search_eos_highres, search_skywatch}