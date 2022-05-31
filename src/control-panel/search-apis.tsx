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

// Shape intersection expressed as number in [0,100] of overlap of feature_1 over feature_2
const shapeIntersection = (feature_1, feature_2) => {
  return Math.round(area(intersect(feature_1, feature_2)) / area(feature_2) * 100) 
}
// Get imagery price given price_info {min_area, price_per_sq_km}
function get_imagery_price(feature, constellation_name, constellation_dict) {
  if (constellation_name in constellation_dict) {
    const price_info = constellation_dict[constellation_name]
    const price = Math.max(area(feature.geometry) / 1_000_000, price_info.min_area) * price_info.price_per_sq_km
    return Math.round(price)
  } else {
    return null
  }
}

/* -------------- */
/*      UP42      */
/* -------------- */
const up42_constellation_dict = {
  'PHR': {
    constellation: 'Pleiades',
    price_per_sq_km: 10, // (10EUR/km2) no min
    min_area: 0
  },
  // 'HEAD SuperView': {
  //   constellation: 'SuperView',
  //   price_per_sq_km: 9, // (9EUR/km2) 25km² min
  //   min_area: 25
  // }, 
  // 'HEAD EarthScanner': {
  //   constellation: 'EarthScanner',
  //   price_per_sq_km: 7, // (7EUR/km2) 25km² min
  //   min_area: 25
  // }, 
}
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
function get_up42_price(feature) {
  return get_imagery_price(feature, feature.properties.constellation, up42_constellation_dict)
}

// UP 42 API: Producer (operates the satellite) | Hosts (image provider offering access) | Collections
// UP42 is actually a STAC endpoint search api
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

const format_up42_results = (up42_results_raw, searchPolygon) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': up42_results_raw.features.map(feature => (
      {
        'geometry': feature.geometry,
        'properties': {
          ...feature.properties,
          constellation: up42_constellation_dict[feature.properties.constellation]?.constellation || feature.properties.constellation,
          'price': get_up42_price(feature),
          'shapeIntersection': shapeIntersection(feature, searchPolygon),
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
const eos_constellation_dict = {
  'TripleSat Constellation-3': {
    constellation: 'TripleSat 3',
  },
}
// let eos_search_highres_url = 'https://api.eos.com/api/v5/allsensors' 
const eos_search_highres_url = 'https://lms-reselling.eos.com/api/v5/allsensors'
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
const format_eos_results = (eos_results_raw) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': eos_results_raw.results.map(r => (
      {
        'geometry': r.dataGeometry,
        'properties': {
          'provider': `EOS/${r.provider}`,
          'id': r.sceneID, 
          'acquisitionDate': new Date(r.date).toISOString(), //'2019-03-23T10:24:03.000Z',
          'resolution': r.resolution, // '1.5 m/pxl'
          'cloudCoverage': r.cloudCoverage,
          'constellation': r.satellite in eos_constellation_dict ? eos_constellation_dict[r.satellite].constellation : r.satellite,
          // 'constellation': eos_constellation_dict[r.satellite]?.constellation || r.satellite,
          
          // Other interesting properties on EOS results
          // eos.thumbnail, eos.browseURL, eos.provider, eos.product
          'shapeIntersection': r.shapeIntersection,
          'price': r.price,
          
          'preview_uri': r.browseURL,
          'thumbnail_uri': r.thumbnail,

          'providerProperties': {
            'illuminationElevationAngle': r.sunElevation,
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
    'coverage': search_settings.aoiCoverage,
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

/* ------------------- */
/*    HEAD Aerospace   */
/* ------------------- */
// https://headfinder.head-aerospace.eu/sales
// https://catalyst.earth/catalyst-system-files/help/references/gdb_r/gdb2N127.html
const head_constellation_dict = {
  'SV-1': {
    constellation: 'SuperView 1',
    resolution: 0.5,
    min_area: 25,
    price_per_sq_km: 9, 
  },
  'SV-2': {
    constellation: 'SuperView 2',
    resolution: 0.42,
    min_area: 25,
    price_per_sq_km: 12, 
  },
  'JL1KF01-PMS': {
    constellation: 'EarthScanner',
    resolution: 0.5,
    min_area: 25,
    price_per_sq_km: 7,
  },
  'JL1GF02-PMS': {
    constellation: 'Jilin 1',
    resolution: 0.75,
    min_area: 25,
    price_per_sq_km: 5,
  },
  'JL1GF03-PMS': {
    constellation: 'JL1GF03',
    resolution: 1,
  },
  'GF-2': {
    constellation: 'GaoFen-2',
    resolution: 0.8,
    min_area: 25,
    price_per_sq_km: 5,
  },
  'GF-7': {
    constellation: 'GaoFen-7',
    resolution: 0.65,
    min_area: 25,
    price_per_sq_km: 6,
  },
}
const head_limit = 300
const head_base_url = 'https://headfinder.head-aerospace.eu/satcat-db02/'
const head_satellites_sel = '$SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3$'

// in https://headfinder.head-aerospace.eu/cat-01/_ML-lib-01.js?2021-12-27
// in https://headfinder.head-aerospace.eu/cat-01/V-073.js?2022-05-11
function crc32(r) {
  for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];
  return(-1^n)>>>0
}
function get_head_price(feature) {
  return get_imagery_price(feature, feature.properties.sensor, head_constellation_dict)
}

// Works: https://headfinder.head-aerospace.eu/satcat-db02/?req=d01-nl-xdebug-xstep-&category=search-browser-01&browserfp=2230104508&session=875857144&searchcnt=6&mousemovecnt=2934&tilescnt=2545&sessionsecs=2951&catalogue=PU&catconfigid=HEAD-wc37&aoi=polygon(((48.91174139707047,2.2841096967027363),(48.91399773469328,2.3531175702378926),(48.87427130555854,2.343847855882424),(48.87743251814097,2.261450394944924)))&maxscenes=300&datestart=2021-11-30&dateend=2022-05-30&cloudmax=100&offnadirmax=12&overlapmin=81&scenename=&satellites=$SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3$&&user=_3876473361&
const search_head = async (search_settings, searchPolygon=null) => {
  const polygon_str = JSON.stringify(search_settings.coordinates.map(c => c.map(xy => [xy[1], xy[0]])))
  const polygon_coords = (polygon_str.replaceAll('[', '(') as string).replaceAll(']', ')') as string

  // Setup request string for HEAD with hash in get url
  const request_string = `&category=search-browser-01&browserfp=2230104508&session=875857144&searchcnt=3&mousemovecnt=2617&tilescnt=2545&sessionsecs=1379&catalogue=PU&catconfigid=HEAD-wc37&aoi=polygon${polygon_coords}&maxscenes=${head_limit}&datestart=${search_settings.startDate.toISOString().substring(0,10)}&dateend=${search_settings.endDate.toISOString().substring(0,10)}&cloudmax=${search_settings.cloudCoverage}&offnadirmax=${Math.max(...search_settings.offNadirAngle.map(Math.abs))}&overlapmin=${search_settings.aoiCoverage}&scenename=&satellites=${head_satellites_sel}&`
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
          'provider': `HEAD/${head_constellation_dict[r.sensor]?.constellation || r.sensor}`,
          'id': r.identifier, 
          'acquisitionDate': r.acquisitiontime.replace(' ', 'T') + '.0003Z', // or new Date(r.datedir).toISOString()
          'resolution': head_constellation_dict[r.sensor]?.resolution || null, 
          'cloudCoverage': r.cloudcover,
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


// Export all search methods
export {search_up42, search_eos_highres, search_skywatch, search_head}