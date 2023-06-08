// Code for searching UP42 STAC API

import ky from 'ky'
import { encode as base64_encode } from 'base-64'
import { getImageryPrice, up42ConstellationDict, providersDict, Providers, up42ProducersNames } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import { log } from '../utilities'

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

const UP42_LIMIT = 500 // can be 500
const lookForNextPage = true
const UP42_TIMEOUT_MS = 20_000

/*
const producerList = [
  'Airbus', // Pleiades and Neo
  'ESA',    // probably SPOT
  // 'CAPELLA_SPACE', // radar
  'TWENTY_ONE_AT',    // TripleSat
  'NEAR_SPACE_LABS'   // stratospheric balloons
]
*/
const producerList = providersDict[Providers.UP42].map((constellation) => up42ProducersNames[constellation])
const useDeprecatedApi = false
const excludeHosts = ['airbus-elevation', 'intermap', 'airbus'] // 'hexagon', 'head-aerospace', 'satellogic', 'iceye', 'spectra']
// Worlddem from Airbus, Intermap Nextmap are DEMs, airbus is not needed since host oneatlas returns pleiades+neo

/*
https://api.up42.com/catalog/oneatlas/image/cccc4352-ed18-433e-b18d-0b132af3face/thumbnail
https://api.up42.com/catalog/oneatlas/image/fd7500c9-6ea2-48e8-8561-69bed4f30eef/quicklook

previewType = ['thumbnail', 'quicklook']
// `https://api.up42.com/catalog/oneatlas/image/${f.properties.sceneId}/${previewType}`
with authorization: Bearer ...
returns a base64 image  
*/

const UP42_SEARCH_URL = 'https://api.up42.com/catalog/stac/search'
const getUp42Bearer = async (up42Apikey): Promise<string> => {
  if (up42Apikey.projectId === '' || up42Apikey.projectApiKey === '') {
    up42Apikey = {
      projectId: process.env.UP42_PROJECT_ID,
      projectApiKey: process.env.UP42_PROJECT_APIKEY,
    }
  }
  const up42ProjectApi = base64_encode(`${up42Apikey.projectId as string}:${up42Apikey.projectApiKey as string}`) as string
  const up42OauthJson = await ky
    .post(`https://api.up42.com/oauth/token`, {
      headers: {
        Authorization: `Basic ${up42ProjectApi}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    .json()

  const up42BearerJson = `Bearer ${(up42OauthJson as any).access_token as string}`
  // console.log(`UP42 API KEY (projectId:projectApiKey): ${up42Apikey.projectId}:${up42Apikey.projectApiKey}`)
  // console.log('up42BearerJson', {up42_bearer: up42BearerJson})
  return up42BearerJson
}
function getUp42Price(feature): number | null {
  return getImageryPrice(feature, feature.properties.constellation, up42ConstellationDict)
}

const getUp42Hosts = async (up42Apikey, up42BearerJson: string | null = null): Promise<any> => {
  if (!up42BearerJson) {
    up42BearerJson = await getUp42Bearer(up42Apikey)
  }
  const hostsReq = await ky
    .get('https://api.up42.com/hosts', {
      headers: { Authorization: up42BearerJson },
    })
    .json()
  const hostsList = (hostsReq as any).data
  // const hostnames_list = hostsList.map(h => h.name)
  return hostsList
}

async function searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson): Promise<any> {
  if (lookForNextPage) {
    const up42NextLinks = up42ResultsRaw.links ?? []
    const up42NextHref = up42NextLinks.find((l) => l.rel === 'next')?.href
    if (up42NextHref) {
      const nextResults = await searchUp42(searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson, up42NextHref)

      up42ResultsRaw?.features.push(...nextResults?.searchResultsJson?.features)
      // console.log('length', up42ResultsRaw?.features?.length)
      // // Reverse engineer the next URL:
      // const up42_nexturl_suffix = up42NextHref.substring(up42NextHref?.lastIndexOf('/'))
      // const up42_next_token = up42_nexturl_suffix.substring('/search?next='.length).replaceAll('%3D', '=')
      // const up42_next_object = JSON.parse(window.atob(up42_next_token))
      // const up42_next_offset = up42_next_object?.nextOffset
      // console.log('Looking for UP42 next page results with page next token ', up42_next_token, up42_next_object, up42_next_offset, '\n\n\n\n\n')
      // // Could as well encode it this way:
      // // const next = window.btoa(JSON.stringify({"providerName":"oneatlas","nextOffset":200}    ))
    }
  }
  return up42ResultsRaw
}

// const searchUp42 = async (searchSettings, up42Apikey, searchPolygon=null, setSnackbarOptions=null, up42BearerJson=null, up42NextLinks=null) => {
const searchUp42 = async (searchSettings, up42Apikey, searchPolygon = null, setters = null, up42BearerJson: string | null = null, nextUrl = ''): Promise<any> => {
  if (!up42BearerJson) {
    try {
      up42BearerJson = await getUp42Bearer(up42Apikey)
    } catch (error) {
      const errorStr = 'Could not get UP42 Auth token, probably because you did not use the Allow-CORS plugin '
      setTimeout(
        () =>
          setters.setSnackbarOptions({
            open: true,
            message: errorStr,
          }),
        5000
      )
      console.log('Use this Allow-CORS plugins for example, \nChrome: https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf \nFirefox: https://addons.mozilla.org/en-US/firefox/addon/access-control-allow-origin/')
      throw new Error(errorStr)
    }
  }

  // Up42 hosts listing

  const up42Payload = {
    // 'datetime': '2019-01-01T00:00:00Z/2022-02-01T23:59:59Z',
    datetime: `${searchSettings.startDate.toISOString() as string}/${searchSettings.endDate.toISOString() as string}`,
    intersects: {
      type: 'Polygon',
      coordinates: searchSettings.coordinates,
    },
    limit: UP42_LIMIT,
    // 'collections': [
    //   'PHR'
    // ],
    query: {
      cloudCoverage: {
        lte: searchSettings.cloudCoverage,
      },
      resolution: {
        gte: searchSettings.gsd.min,
        lte: searchSettings.gsd.max,
      },
      'up42:usageType': {
        in: ['DATA'],
      },
      producer: {
        in: producerList,
      },
    },
  }
  let up42ResultsRaw
  if (useDeprecatedApi || nextUrl !== '') {
    const up42SearchUrl = nextUrl !== '' ? nextUrl : UP42_SEARCH_URL
    up42ResultsRaw = await ky
      .post(up42SearchUrl, {
        headers: { Authorization: up42BearerJson },
        json: up42Payload,
      })
      .json()
    // console.log('up42ResultsRaw.features.length', up42ResultsRaw.features.length)
    await searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson)
  } else {
    let hostsList = await getUp42Hosts(up42Apikey, up42BearerJson)
    log(
      'UP42 Hosts list',
      hostsList.map((h) => h.name),
      hostsList,
      '\n\n'
    )
    hostsList = hostsList.filter((host) => !excludeHosts.includes(host.name))
    // hostsList.

    const searchPromises = Object.fromEntries(
      // build a dict from a dict via an array of key-value pairs
      hostsList.map((host) => {
        const hostname: string = host.name
        return [
          hostname,
          {
            promise: new Promise(async (resolve, reject) => {
              const up42SearchHostUrl = `https://api.up42.com/catalog/hosts/${hostname}/stac/search` // nextUrl !== '' ? nextUrl : up42SearchUrl
              try {
                const up42ResultsRaw = (await ky
                  .post(up42SearchHostUrl, {
                    headers: { Authorization: up42BearerJson },
                    json: up42Payload,
                    timeout: UP42_TIMEOUT_MS,
                  })
                  .json()) as any
                log(`Host ${hostname} results: `, up42ResultsRaw)
                // Should update up42ResultsRaw.features
                // await searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson)
                resolve(up42ResultsRaw)
              } catch (error) {
                const errorMsg = `Error on ky post for host ${hostname}: ${error.toString()}`
                log(errorMsg)
                reject(errorMsg)
              }
            }),
          },
        ]
      })
    )

    await Promise.allSettled(Object.values(searchPromises).map((o) => o.promise))
      .then((results) => {
        log('\nFinished UP42 requests for all hosts promises\n', results)
        const requestsFeaturesFlat = results
          .filter((r) => r.status == 'fulfilled')
          .map((res) => res?.value?.features)
          .flat() // .value
        up42ResultsRaw = {
          features: requestsFeaturesFlat,
        }
        log('results_flat', up42ResultsRaw)
        return up42ResultsRaw
      })
      .catch((error) => {
        log('Error on promise', error)
      })
  }

  // TODO: TEST next
  const searchResultsJson = formatUp42Results(up42ResultsRaw, searchPolygon)
  log('UP42 PAYLOAD: \n', up42Payload, '\nRAW UP42 search results: \n', up42ResultsRaw, '\nJSON UP42 search results: \n', searchResultsJson)

  // Initiate search for previews/thumbnails
  getUp42PreviewsAsync(searchResultsJson, up42BearerJson).then((results) => {
    if (setters) {
      const searchResults = {
        input: searchPolygon,
        output: results,
      }
      log('UP42 search previews have been retrieved, setting react state')
      setters.setSearchResults(searchResults)
    }
  })

  // Get pricing using UP42 API
  getUp42PricesAsync(searchResultsJson, searchPolygon, up42BearerJson)
    .then((results) => {
      if (setters) {
        const searchResults = {
          input: searchPolygon,
          output: results,
        }
        log('UP42 prices have been retrieved, setting react state')
        setters.setSearchResults(searchResults)
      }
    })
    .catch((error) => {
      log('UP42 error during prices retrieval, setting react state anyway')
      // setters.setSearchResults(searchResults)
    })
  /*
   */

  return {
    searchResultsJson,
    up42BearerJson,
  }
}

// `https://api.up42.com/catalog/oneatlas/image/${f.properties.sceneId}/${previewType}`
const getUp42PreviewUrls = (feature, up42BearerJson): any => {
  const previewUrls = {
    up42BearerJson,
    // 'preview_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/quicklook`,
    // 'thumbnail_uri': `https://api.up42.com/catalog/${feature.properties.providerName}/image/${feature.properties.providerProperties.id}/thumbnail`
    preview_uri: `https://api.up42.com/catalog/${feature.properties.providerName as string}/image/${feature.properties.id as string}/quicklook`,
    thumbnail_uri: `https://api.up42.com/catalog/${feature.properties.providerName as string}/image/${feature.properties.id as string}/thumbnail`,
  }
  return previewUrls
}

const getUp42PreviewsAsync = async (up42Results, up42BearerJson): Promise<void> => {
  up42Results.features.forEach(async (feature) => {
    const previewUrls = getUp42PreviewUrls(feature, up42BearerJson)
    const thumbnailUriBlob = await ky.get(previewUrls.thumbnail_uri, { headers: { Authorization: up42BearerJson } }).blob()
    feature.properties.thumbnail_uri = URL.createObjectURL(thumbnailUriBlob)
    const previewUriBlob = await ky.get(previewUrls.preview_uri, { headers: { Authorization: up42BearerJson } }).blob()
    feature.properties.preview_uri = URL.createObjectURL(previewUriBlob)
    // Could use the setter here to dynamically add preview to datagrid and map preview as soon as it is retrieved

    // console.log(feature.properties.thumbnail_uri, thumbnailUriBlob)
    // These blobs would need to be stored on IndexedDB, which has larger storage limitation than localStorage' 5MB
    // See this example: https://levelup.gitconnected.com/how-to-use-blob-in-browser-to-cache-ee9577b77daa based on [jakearchibald/idb-keyval](https://github.com/jakearchibald/idb-keyval)
    // import { get, set } from 'idb-keyval';
    // var fileReader = new FileReader();
    // fileReader.onload = function(e) {
    //   feature.properties.preview_uri = e.target.result;
    // }
    // fileReader.readAsDataURL(previewUriBlob);
  })
}

// Docs: https://docs.up42.com/developers/api-archive/api-data-estimation
// Painful, needs one request per item for which we want to estimate pricing
const ESTIMATE_URL = `https://api.up42.com/workspaces/${process.env.UP42_WORKSPACE_ID as string}/orders/estimate`
const DATA_PRODUCT_AIRBUS_ANALYTICS = '4f1b2f62-98df-4c74-81f4-5dce45deee99'
const DATA_PRODUCT_AIRBUS_DISPLAY = '647780db-5a06-4b61-b525-577a8b68bb54'
const DATA_PRODUCT_21AT_8BIT = '2398d8f5-5f7f-4596-884d-345c0b07af14'
const DATA_PRODUCT_21AT_16BIT = '37c26f4d-f6a9-47c9-ae4d-a095569ab8bc'
const DATA_PRODUCT_CAPELLA_SPACE = '1f2b0d7f-d3e2-4b3d-96b7-e7c184df7952'

const dataProductForFeature = {
  oneatlas: DATA_PRODUCT_AIRBUS_DISPLAY,
  '21at': DATA_PRODUCT_21AT_8BIT,
  capellaspace: DATA_PRODUCT_CAPELLA_SPACE,
}
async function estimateCreditCost(feature, searchPolygon, up42BearerJson): Promise<number> {
  const estimatePayload = {
    dataProduct: dataProductForFeature[feature.properties.providerName],
    params: {
      id: feature.properties.id, // '2b21b708-4d32-498f-8400-a5a41241ed25', //
      aoi: searchPolygon.geometry,
    },
  }

  const estimateJson: any = await ky
    .post(ESTIMATE_URL, {
      headers: {
        Authorization: up42BearerJson,
        'Content-Type': 'application/json',
        'Content-Length': `${JSON.stringify(estimatePayload).length}`,
        // Host: 'https://api.up42.com/',
      },
      timeout: 20_000,
      json: estimatePayload,
    })
    .json()
  console.log('yo up42 price result', estimateJson)

  // 1euro = 100 credits
  const price = estimateJson.error ? 0 : estimateJson.data.credits / 100
  return price
}

const getUp42PricesAsync = async (up42Results, searchPolygon, up42BearerJson): Promise<void> => {
  up42Results.features.forEach(async (feature) => {
    const price = await estimateCreditCost(feature, searchPolygon, up42BearerJson)
    feature.properties.price = price
  })
}

const formatUp42Results = (up42ResultsRaw, searchPolygon): GeoJSON.FeatureCollection => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: up42ResultsRaw.features.map((feature) => ({
      geometry: feature.geometry,
      properties: {
        // ...feature.properties,
        id: feature.properties.sceneId ?? uuidv4(),
        constellation: up42ConstellationDict[feature.properties.constellation]?.constellation || feature.properties.constellation,
        price: null, // getUp42Price(feature),
        shapeIntersection: null,
        providerPlatform: `${Providers.UP42}`,
        provider: `${Providers.UP42}/${feature.properties.producer as string}-${feature.properties.constellation as string}`, // /${feature.properties.providerName}
        //
        providerName: feature.properties.providerName,
        sceneId: feature.properties.sceneId ?? uuidv4(),
        cloudCoverage: feature.properties.cloudCoverage,
        acquisitionDate: feature.properties.acquisitionDate,
        resolution: feature.properties.resolution,
        //
        providerProperties: feature.properties.providerProperties,
        raw_result_properties: feature.properties,
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  }
}

// export {
//   searchUp42,
//   getUp42PreviewsAsync
// }

export default searchUp42
