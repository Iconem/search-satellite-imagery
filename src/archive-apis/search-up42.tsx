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

// TODO: Catalog search is deprecated, now requires host_name, search per host: 
// https://docs.up42.com/developers/api#operation/searchByHost
// GET on https://api.up42.com/hosts results in json data
// host among [nearspacelabs, 21at, oneatlas, airbus, capellaspace, iceye, spectra, airbus, intermap]
// https://api.up42.com/catalog/hosts/${hostname}/stac/search

const up42_limit = 500
const look_for_next_page = true

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
const useDeprecatedApi = false
const exclude_hosts = ['airbus', 'iceye', 'spectra', 'airbus-elevation']

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

const get_up42_hosts = async ( up42_apikey, up42_bearer_json=null ) => {
  if (!up42_bearer_json) {
    up42_bearer_json = await get_up42_bearer(up42_apikey)
  }
  const hosts_req = await ky.get('https://api.up42.com/hosts', {
    headers: {'Authorization': up42_bearer_json},
  }).json();
  const hosts_list = (hosts_req as any).data
  // const hostnames_list = hosts_list.map(h => h.name)
  return hosts_list
}

// const search_up42 = async (search_settings, up42_apikey, searchPolygon=null, setSnackbarOptions=null, up42_bearer_json=null, up42_next_links=null) => {
const search_up42 = async (search_settings, up42_apikey, searchPolygon=null, setSnackbarOptions=null, up42_bearer_json=null, next_url='') => {
  if (!up42_bearer_json) {
    up42_bearer_json = await get_up42_bearer(up42_apikey)
  }

  // Up42 hosts listing

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
  let up42_results_raw;
  if (useDeprecatedApi) {
    up42_results_raw = await ky.post(up42_search_url + next_url, {
      headers: {'Authorization': up42_bearer_json},
      json: up42_payload
    }).json();
  } else {
    let hosts_list = await get_up42_hosts ( up42_apikey, up42_bearer_json )
    console.log('Hosts list', hosts_list.map(h => h.name), hosts_list, '\n\n')
    hosts_list = hosts_list.filter(host => 
      !exclude_hosts.includes(host.name)
    )
    // hosts_list.

    const search_promises = Object.fromEntries( // build a dict from a dict via an array of key-value pairs
    hosts_list.map(
      host => {
        const hostname = host.name
        return [
          hostname, 
          {
            promise: new Promise(async resolve => {
              const up42_results_raw = await ky.post(
                `https://api.up42.com/catalog/hosts/${hostname}/stac/search`, 
                {
                  headers: {'Authorization': up42_bearer_json},
                  json: up42_payload
                }
              ).json();
              console.log('Host', hostname, 'up42_results_raw', up42_results_raw)
              resolve(up42_results_raw)
            })
          }
        ]}))
    console.log('before promise.all', search_promises)
    const thing = await Promise.all(Object.values(search_promises).map (o => o.promise))
    .then((results) => {
      console.log('finished requests for all promises', results)
      const requests_features_flat = results.map(res => (res as any)?.features).flat()
      up42_results_raw = {
        'features': requests_features_flat
      }
      console.log('results_flat', up42_results_raw)
      return up42_results_raw
    })
    console.log('after promise.all', search_promises, thing)
  }


  // TODO: TEST next
  const search_results_json = format_up42_results(up42_results_raw, searchPolygon)
  console.log('UP42 PAYLOAD: \n', up42_payload, '\nRAW UP42 search results: \n', up42_results_raw, '\nJSON UP42 search results: \n', search_results_json)


  if (look_for_next_page) {
    const up42_next_links = (up42_results_raw as any).links ?? []
    const up42_next_href = up42_next_links.find(l => l.rel == 'next')?.href
    const up42_next_token = up42_next_href?.substring(up42_next_href?.lastIndexOf('/'))
    next_url = `?next=${up42_next_token}`
    console.log('Looking for UP42 next page results with page next token ', up42_next_token)
  }

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
    // 'preview_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/quicklook`,
    // 'thumbnail_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/thumbnail`
    'preview_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.id}/quicklook`,
    'thumbnail_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.id}/thumbnail`
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
    // Could use the setter here to dynamically add preview to datagrid and map preview as soon as it is retrieved

    // console.log(feature.properties.thumbnail_uri, thumbnail_uri_blob)
    // These blobs would need to be stored on IndexedDB, which has larger storage limitation than localStorage' 5MB
    // See this example: https://levelup.gitconnected.com/how-to-use-blob-in-browser-to-cache-ee9577b77daa based on [jakearchibald/idb-keyval](https://github.com/jakearchibald/idb-keyval)
    // import { get, set } from 'idb-keyval';
    // var fileReader = new FileReader();
    // fileReader.onload = function(e) {
    //   feature.properties.preview_uri = e.target.result;
    // }
    // fileReader.readAsDataURL(preview_uri_blob);
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
          'providerPlatform': `${Providers.UP42}`, 
          'provider': `${Providers.UP42}/${feature.properties.producer}`, // /${feature.properties.providerName}
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

// export {
//   search_up42, 
//   get_up42_previews_async
// }

export default search_up42 
