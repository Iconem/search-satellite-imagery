// Code for searching UP42 STAC API

import ky from 'ky';
import {encode as base64_encode} from 'base-64';
import {shapeIntersection, get_imagery_price, up42_constellation_dict, providers_dict, Providers, up42_producers_names} from './search-utilities'
import { v4 as uuidv4 } from 'uuid';

/* -------------- */
/*      UP42      */
/* -------------- */
// UP 42 API: Producer (operates the satellite) | Hosts (image provider offering access) | Collections
// UP42 is actually a STAC endpoint search api
// https://docs.up42.com/developers/api#operation/getDataProducts
// CORS needed to reach UP42 api server
// UP42: Project ID and Project API Key that are found in the section Developers on the console. https://console.up42.com/ in the form of https://console.up42.com/projects/UUID-xxxx/developers

const up42_limit = 100

/*
const producer_list = [
  'Airbus', // Pleiades and Neo
  'ESA',    // probably SPOT
  // 'CAPELLA_SPACE', // radar
  'TWENTY_ONE_AT',    // TripleSat
  'NEAR_SPACE_LABS'   // stratospheric balloons
]
*/
const producer_list = providers_dict[Providers.UP42].map(constellation => up42_producers_names[constellation])

/*
https://api.up42.com/catalog/oneatlas/image/cccc4352-ed18-433e-b18d-0b132af3face/thumbnail
https://api.up42.com/catalog/oneatlas/image/fd7500c9-6ea2-48e8-8561-69bed4f30eef/quicklook

previewType = ['thumbnail', 'quicklook']
// `https://api.up42.com/catalog/oneatlas/image/${f.properties.sceneId}/${previewType}`
with authorization: Bearer ...
returns a base64 image  
*/

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
    // console.log(`UP42 API KEY (projectId:projectApiKey): ${up42_apikey.projectId}:${up42_apikey.projectApiKey}`)
    // console.log('up42_bearer_json', {up42_bearer: up42_bearer_json})
    return up42_bearer_json
}
function get_up42_price(feature) {
  return get_imagery_price(feature, feature.properties.constellation, up42_constellation_dict)
}

const search_up42 = async (search_settings, up42_apikey, searchPolygon=null, setSnackbarOptions=null, up42_bearer_json=null, up42_next_links=null) => {
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
        'in': producer_list
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

  // Initiate search for previews
  get_up42_previews_async(search_results_json, up42_bearer_json)

  return {
    search_results_json,
    up42_bearer_json,
  }
}

// `https://api.up42.com/catalog/oneatlas/image/${f.properties.sceneId}/${previewType}`
const get_up42_preview_urls = (feature, up42_bearer_json) => {
  const preview_urls = {
    'up42_bearer_json': up42_bearer_json,
    'preview_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/quicklook`,
    'thumbnail_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/thumbnail`
  }
  return preview_urls
}

const get_up42_previews_async = async (up42_results, up42_bearer_json) => {
  up42_results.features.forEach(async feature => {
    const preview_urls = get_up42_preview_urls(feature, up42_bearer_json)
    const thumbnail_uri_blob = await ky.get(
      preview_urls.thumbnail_uri, 
      { headers: {'Authorization': up42_bearer_json} }
    ).blob();
    feature.properties.thumbnail_uri = URL.createObjectURL(thumbnail_uri_blob);
    const preview_uri_blob = await ky.get(
      preview_urls.preview_uri, 
      { headers: {'Authorization': up42_bearer_json} }
    ).blob()
    feature.properties.preview_uri = URL.createObjectURL(preview_uri_blob);
  })
}

const format_up42_results = (up42_results_raw, searchPolygon) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': up42_results_raw.features.map(feature => (
      {
        'geometry': feature.geometry,
        'properties': {
          // ...feature.properties,
          id: feature.properties.sceneId,
          constellation: up42_constellation_dict[feature.properties.constellation]?.constellation || feature.properties.constellation,
          'price': get_up42_price(feature),
          'shapeIntersection': shapeIntersection(feature, searchPolygon),
          'providerPlatform': `UP42`, 
          'provider': `UP42/${feature.properties.producer}`, // /${feature.properties.providerName}
          // 
          'providerProperties': feature.properties.providerProperties,
          'providerName': feature.properties.providerName,
          'sceneId': feature.properties.sceneId,
          'cloudCoverage': feature.properties.cloudCoverage,
          'acquisitionDate': feature.properties.acquisitionDate,
          'resolution': feature.properties.resolution,
        },
        'type': 'Feature'
      }
    )),
    'type': 'FeatureCollection'
  }
}

export {
  search_up42, 
  get_up42_previews_async
}

// export default {
//   search_up42_f, 
//   get_up42_previews_async
// }