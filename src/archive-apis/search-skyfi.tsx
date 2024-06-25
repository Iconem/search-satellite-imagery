// Code for searching UP42 STAC API

import ky from 'ky'
import { Providers } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import { log } from '../utilities'

import { parse as wkt_parse, stringify as wkt_stringify } from 'wellknown'

/* -------------- */
/*      SKYFI     */
/* -------------- */
// API Docs: https://app.skyfi.com/platform-api/redoc
// App: https://app.skyfi.com/explore
// POST on https://app.skyfi.com/api/archive-available
// Payload: {"clientType":"DESKTOP","fromDate":"2018-12-31T23:00:00.000Z","toDate":"2023-01-24T10:21:44.465Z","maxCloudCoveragePercent":20,"resolutions":["VERY HIGH","HIGH"],"sensors":["DAY","NIGHT","MULTISPECTRAL"],"imageCropping":{"wktString":"POLYGON((-77.05679665567264 38.899388312735795,-77.02040942302703 38.899388312735795,-77.02040942302703 38.92503663542644,-77.05679665567264 38.92503663542644,-77.05679665567264 38.899388312735795))"},"page":0,"pageSize":25}

const SKYFI_SEARCH_URL = 'https://app.skyfi.com/api/archive-available'
const pageSize = 25
const lookForNextPage = true
const skyfiApiKey = 'eh6qPPge7f88EJPp'

// Not useful at the moment
// const getSkyfiBearer = (apikey): string => {
//   const skyfiOauthJson = {
//     name: '',
//     iss: 'https://securetoken.google.com/skyfi-prod',
//     aud: 'skyfi-prod',
//     auth_time: 1674556045,
//     user_id: 'bqZ0B6WZPihZ6jwnjC0nnFu2qKI2',
//     sub: 'bqZ0B6WZPihZ6jwnjC0nnFu2qKI2',
//     iat: 1674559757,
//     exp: 1674563357,
//     email: '',
//     email_verified: false,
//     firebase: {
//       identities: {
//         email: [''],
//       },
//       sign_in_provider: 'password',
//     },
//   }
//   const skyfiBearerJson = `Bearer ${skyfiOauthJson.sub}`
//   return skyfiBearerJson
// }

const searchSkyfi = async (searchSettings, skyfiApikey, searchPolygon = null, setters = null, pageIdx = 0): Promise<any> => {
  const resolutionArray: string[] = []
  if (searchSettings.gsd.min <= 0.5) resolutionArray.push('VERY HIGH')
  if ((searchSettings.gsd.min <= 0.5 && searchSettings.gsd.max >= 0.5) || (searchSettings.gsd.min <= 1 && searchSettings.gsd.max >= 1)) resolutionArray.push('HIGH')
  if ((searchSettings.gsd.min <= 1 && searchSettings.gsd.max >= 1) || (searchSettings.gsd.min <= 5 && searchSettings.gsd.max >= 5)) resolutionArray.push('MEDIUM')

  // const coordinatesWkt = "POLYGON((-77.05679665567264 38.899388312735795,-77.02040942302703 38.899388312735795,-77.02040942302703 38.92503663542644,-77.05679665567264 38.92503663542644,-77.05679665567264 38.899388312735795))"
  const coordinatesWkt = wkt_stringify(searchPolygon)

  // Up42 hosts listing
  const skyfiPayload = {
    fromDate: searchSettings.startDate.toISOString(), // "2018-12-31T23:00:00.000Z",
    toDate: searchSettings.endDate.toISOString(), // "2023-01-24T10:21:44.465Z",
    maxCloudCoveragePercent: searchSettings.cloudCoverage,
    resolutions: resolutionArray,
    clientType: 'DESKTOP',
    sensors: ['DAY', 'NIGHT', 'MULTISPECTRAL'],
    imageCropping: {
      wktString: coordinatesWkt,
    },
    page: pageIdx,
    pageSize,
  }
  log('skyfi PAYLOAD: \n', skyfiPayload)

  const contentLength = `${JSON.stringify(skyfiPayload).length}`
  console.log('contentLength', contentLength, skyfiPayload, JSON.stringify(skyfiPayload), JSON.stringify(skyfiPayload).length)
  const skyfiResultsRaw = await ky
    .post(SKYFI_SEARCH_URL, {
      headers: {
        // 'skyfi-api-key': skyfiApiKey,
        'skyfi-api-key': ' eh6qPPge7f88EJPp',
        'content-length': contentLength,

        origin: ' https://app.skyfi.com',
        referer: ' https://app.skyfi.com/explore/',
        accept: ' application/json',
        'cache-control': ' no-cache',
        'content-type': ' application/json',
        'skyfi-client-agent': ' DESKTOP-1.8.0',
      },
      json: skyfiPayload,
    })
    .json()
  log(`FOUND ${(skyfiResultsRaw as any).numReturnedArchives as string}/${(skyfiResultsRaw as any).numTotalArchives as string}, 'skyfi skyfiResultsRaw: \n', skyfiResultsRaw, `)

  const searchResultsJson = formatSkyfiResults(skyfiResultsRaw, searchPolygon)
  log('skyfi PAYLOAD: \n', skyfiPayload, '\nRAW skyfi search results: \n', skyfiResultsRaw, '\nJSON skyfi search results: \n', searchResultsJson)

  if (lookForNextPage && (skyfiResultsRaw as any).numTotalArchives > pageSize * pageIdx) {
    const nextResults = await searchSkyfi(searchSettings, skyfiApikey, searchPolygon, setters, pageIdx + 1)
    // Looking for next results
    searchResultsJson?.features.push(...nextResults?.searchResultsJson?.features)
  }

  return {
    searchResultsJson,
  }
}

// parse('POINT(1 2)');

const formatSkyfiResults = (skyfiResultsRaw, searchPolygon): GeoJSON.FeatureCollection => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: skyfiResultsRaw.archives.map((feature) => {
      const feat = {
        geometry: wkt_parse(feature.footprint),
        // "footprint": "POLYGON ((-77.2127 39.0983,-76.9662 39.0562,-77.0204 38.8647,-77.2663 38.9068,-77.2127 39.0983))",
        // "sw": { "lat": 38.8647, "lon": -77.2663 }, "ne": { "lat": 39.0983, "lon": -76.9662},
        properties: {
          // ...feature.properties,
          id: feature.archiveId ?? uuidv4(),
          sceneId: feature.archiveId ?? uuidv4(),
          providerPlatform: `${Providers.SKYFI}`,
          provider: `${Providers.SKYFI}/${feature.provider as string}-${feature.name as string}`,
          resolution: feature.platformResolution / 100,
          acquisitionDate: new Date(feature.date).toISOString(), // "2022-11-26T14:49:32+00:00"
          cloudCoverage: feature.cloudCoveragePercent,
          price: feature.totalPrice,
          providerProperties: {
            azimuthAngle: feature.offNadirAngle,
            preview_uri_tiles: {
              url: feature.previewUrl,
              // 'scheme': 'tms',
              // minzoom : 0,
              // maxzoom : 20,
              sensor_day_night_ms: feature.sensor,
            },
          },
          preview_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null, // feature.previewUrl, // feature.thumbnailBase64,
          thumbnail_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null, // "thumbnailUrls": { "300x300": 'url'}

          constellation: `${feature.provider as string}/${feature.name as string}`,
          providerName: feature.providerName,
          shapeIntersection: null,
          raw_result_properties: feature,
        },
        type: 'Feature',
      }
      return feat
    }),
    type: 'FeatureCollection',
  }
}

const get_aggregator_permalink = (feature, searchPolygon) => {
  // https://app.skyfi.com/explore/crop/cd1a2c12-9266-44ca-9211-cd15a28598be?aoi=POLYGON%28%28-97.65035587767008+30.191975017380607%2C-97.47871005826741+30.191975017380607%2C-97.47871005826741+30.340856714206836%2C-97.65035587767008+30.340856714206836%2C-97.65035587767008+30.191975017380607%29%29
  return `https://app.skyfi.com/explore/crop/${feature.archiveId}?aoi=${escape(wkt_stringify(searchPolygon))}`
}

export default searchSkyfi
