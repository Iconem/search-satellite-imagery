// Search Maxar DigitalGlobe APIs 

import ky from 'ky';
import {encode as base64_encode} from 'base-64';
import {shapeIntersection, max_abs, get_maxar_price, get_constellation_name, maxar_constellation_dict, Providers} from './search-utilities'
import { v4 as uuidv4 } from 'uuid';

/* ---------------------------- */
/*      Maxar DigitalGlobe      */
/* ---------------------------- */
// https://discover.maxar.com/
// Maxar newest API is actually a STAC catalog endpoint search api, 
// Maxar ARD requires the username and password, while digital globe search dashboard uses the old non-STAC API
// Cannot get the bearer token without an account for STAC
// https://docs.maxar.com/developers/api#operation/getDataProducts
// but auth requires account https://docs.auth.content.maxar.com/#getting-started

const maxar_limit = 500
const maxar_search_url = 'https://api.discover.digitalglobe.com/v1/services/ImageServer/query'

// CORS needed to reach maxar api server
const search_maxar = async (search_settings, maxar_apikey, searchPolygon=null, setSnackbarOptions=null, maxar_bearer_json=null, maxar_next_links=null) => {
  // await get_maxar_bearer(maxar_apikey)
  const date_format = {month: '2-digit', day: '2-digit', year: 'numeric'}
  const maxar_payload = 
    `outFields=*` + 
    `&inSR=4326` +
    `&outSR=4326` +
    `&spatialRel=esriSpatialRelIntersects` +
    `&where=${
      encodeURIComponent(
        `sun_elevation_avg >= ${search_settings.sunElevation[0]} ` +
        ` AND image_band_name in('PAN','4-BANDS') ` +
        ` AND collect_time_start >= '${search_settings.startDate.toLocaleDateString('us',date_format) } 00:00:00' ` +
        ` AND collect_time_start <= '${search_settings.endDate.toLocaleDateString('us',date_format)}  23:59:59' ` +
        ` AND off_nadir_max <= ${max_abs(search_settings.offNadirAngle)} ` +
        ` AND pan_resolution_max <= ${search_settings.gsd.max}`
      )
    }` + 
    `&returnCountOnly=false` + 
    `&f=json` + 
    `&geometryBasedFilters=${encodeURIComponent(`area_cloud_cover_percentage <= ${search_settings.cloudCoverage}`)}` + 
    `&geometryType=esriGeometryPolygon` + 
    `&geometry=${encodeURIComponent(`{"rings" : ${JSON.stringify(search_settings.coordinates)}, "spatialReference" : {"wkid" : 4326}}`)}` + 
    `&resultRecordCount=${maxar_limit}`
  // .replaceAll('\n', '')// .replaceAll('    &', '&').replaceAll('        AND', ' AND')

  const headers = {
    'x-api-key': maxar_apikey, 
    'Content-Type': 'application/x-www-form-urlencoded', 
    'content-length': maxar_payload.length,
    'Transfer-Encoding': 'compress',
    // 'Cache-Control': 'no-cache',
  }
  // console.log('Maxar headers', headers)
  try {
    const maxar_results_raw = await ky.post(maxar_search_url, {
      headers,
      body: maxar_payload
    }).json();
    const search_results_json = format_maxar_results(maxar_results_raw, searchPolygon)
    console.log('maxar PAYLOAD: \n', maxar_payload, '\nRAW maxar search results: \n', maxar_results_raw, '\nJSON maxar search results: \n', search_results_json)
  
    return {
      search_results_json,
      maxar_bearer_json,
    }
  } catch (error) { 
    // So promise always return
    if (error.name === 'HTTPError') {
      const errorJson = await error.response.json();
      console.log('!!! --- ERROR on ky POST --- !!!')
      return {
        search_results_json: null,
      }
    }
  }
}

const format_maxar_results = (maxar_results_raw, searchPolygon) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': maxar_results_raw.features.map(f => {
      const feature = {
        // 'geometry': f.geometry,
        'geometry': {
          type: 'Polygon',
          coordinates: f.geometry.rings
        },
        'properties': {
          // ...f.attributes,
          
          // 'constellation': maxar_constellation_dict[f.attributes.vehicle_name]?.constellation || f.attributes.vehicle_name,
          'providerPlatform': `${Providers.MAXAR_DIGITALGLOBE}`, 
          'constellation': get_constellation_name(f.attributes.vehicle_name, maxar_constellation_dict), // maxar_constellation_dict[f.attributes.vehicle_name]?.constellation || f.attributes.vehicle_name,
          'acquisitionDate': (new Date(f.attributes.collect_time_start || f.attributes.start_time || 0)).toISOString(), // or end_time '2019-03-23T10:24:03.000Z',
          'price': null,
          'shapeIntersection': null, // shapeIntersection(f, searchPolygon),

          'id': f.attributes.image_identifier || uuidv4(), 
          'provider': `${Providers.MAXAR_DIGITALGLOBE}/${f.attributes.vehicle_name}`,
          // 'id': f.attributes.image_identifier || randomUUID(), uuid
          'resolution': f.attributes.pan_resolution_avg, // multi_resolution_avg
          'cloudCoverage': f.attributes.area_cloud_cover_percentage,
          'preview_uri': f.attributes.browse_url,
          'thumbnail_uri': f.attributes.browse_url, // no dedicated thumbnail uri, and browse is pretty big. 

          'providerProperties': {
            'illuminationElevationAngle': f.attributes.sun_elevation_avg,
            'incidenceAngle': null,
            'azimuthAngle': f.attributes.off_nadir_avg, // area_avg_off_nadir_angle,
            'illuminationAzimuthAngle': f.attributes.sun_azimuth_avg,
          },
        },
        'type': 'Feature'
      }
      feature.properties.price = get_maxar_price(feature)
      feature.properties.shapeIntersection = shapeIntersection(feature, searchPolygon)
      return feature
    }),
    'type': 'FeatureCollection'
  }
}

// For deeplink, could store whole scenes selected with post request on https://api.discover.digitalglobe.com/v1/store

// For thumbnail, could have a look at https://api.discover.digitalglobe.com/v1/services/ImageServer/exportImage with form data payload as bbox=2.2686767578125004%2C48.86832824998009%2C2.2741699218750004%2C48.87194147722911&size=256%2C256&bboxSR=4326&imageSR=102100&format=png8&f=image&pixelType=U8&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&mosaicRule=%7B%20%22mosaicMethod%22%3A%20%22esriMosaicLockRaster%22%2C%20%22lockRasterIds%22%3A%20%5B13423329%2C13308451%5D%2C%20%22ascending%22%3A%20%22true%22%2C%20%22mosaicOperation%22%3A%20%22MT_FIRST%22%20%7D


/*
const get_maxar_bearer = async (maxar_apikey) => {
    const maxar_projectApi = base64_encode(`${maxar_apikey}`)
    const maxar_oauth_json = await ky.post(
        `https://api.content.maxar.com/auth/authenticate`, 
        {
        headers: { 
            'Authorization': `Basic ${maxar_projectApi}`,
            'Content-Type': 'application/x-www-form-urlencoded' 
        },
        body: 'grant_type=client_credentials'
        }
    ).json();

    const maxar_bearer_json = `Bearer ${maxar_oauth_json['access_token']}`
    console.log('maxar_bearer_json', {maxar_bearer: maxar_bearer_json})
    return maxar_bearer_json
}
*/

export default search_maxar