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

// https://app.skyfi.com/api/v4/catalog-specs/archive t oget specs/providers

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


// const SKYFI_SEARCH_URL = 'https://app.skyfi.com/api/archive-available'
const PROXY_BASE_URL = process.env.PROXY_BASE_URL
const SKYFI_BASE_URL = `${PROXY_BASE_URL}?url=https://app.skyfi.com`
const skyfiApiKey = process.env.SKYFI_API_KEY
const pageSize = 25
const lookForNextPage = true

const getEnabledProviderIds = async (): Promise<string[]> => {
  const data = await ky
    .get(SKYFI_BASE_URL + '/api/v4/catalog-specs/archive', {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
      }
    })
    .json();

  const providerIds = new Set<string>();

  (data as any).specs
    .filter((spec) => spec.isEnabled && spec.sensor === 'DAY')
    .flatMap((spec) => spec.resolutions)
    .filter((resolution) => resolution.isEnabled)
    .flatMap((resolution) => resolution.providers)
    .filter((provider) => provider.isEnabled)
    .forEach((provider) => providerIds.add(provider.provider));

  return [...providerIds];
};


const searchSkyfi = async (searchSettings, skyfiApikey, searchPolygon = null, setters = null, nextPageUrl: string | null = null, pageIdx = 0): Promise<any> => {
  const resolutionArray: string[] = []
  if (searchSettings.gsd.min <= 0.15) resolutionArray.push('ULTRA HIGH')
  if ((searchSettings.gsd.min <= 0.15 && searchSettings.gsd.max >= 0.15) || (searchSettings.gsd.min <= 0.30 && searchSettings.gsd.max >= 0.30)) resolutionArray.push('SUPER HIGH')
  if ((searchSettings.gsd.min <= 0.3 && searchSettings.gsd.max >= 0.3) || (searchSettings.gsd.min <= 0.50 && searchSettings.gsd.max >= 0.50)) resolutionArray.push('VERY HIGH')
  if ((searchSettings.gsd.min <= 0.5 && searchSettings.gsd.max >= 0.5) || (searchSettings.gsd.min <= 1 && searchSettings.gsd.max >= 1)) resolutionArray.push('HIGH')
  if ((searchSettings.gsd.min <= 1 && searchSettings.gsd.max >= 1) || (searchSettings.gsd.min <= 5 && searchSettings.gsd.max >= 5)) resolutionArray.push('MEDIUM')
  const providersArray = await getEnabledProviderIds();
  // ['SATELLOGIC', 'GEOSAT', 'SIWEI', 'PLANET', 'VANTOR', 'URBAN_SKY', 'NSL', 'VEXCEL']

  const coordinatesWkt = wkt_stringify(searchPolygon)

  // Up42 hosts listing
  const skyfiPayload = {
    fromDate: searchSettings.startDate.toISOString(), // "2018-12-31T23:00:00.000Z",
    toDate: searchSettings.endDate.toISOString(), // "2023-01-24T10:21:44.465Z",
    maxCloudCoveragePercent: searchSettings.cloudCoverage,
    resolutions: resolutionArray,
    openData: false,
    providersArray,
    aoi: coordinatesWkt,
    pageSize: pageSize,
  }

  let skyfiResultsRaw
  if (!nextPageUrl) {
    skyfiResultsRaw = await ky.post(SKYFI_BASE_URL + '/platform-api/archives', {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
        'X-Skyfi-Api-Key': skyfiApiKey,
        'content-type': 'application/json',
      },
      json: skyfiPayload,
    }).json()

  } else {
    //  NEXT PAGES → GET with cursor
    const url = `${SKYFI_BASE_URL}${nextPageUrl}`

    skyfiResultsRaw = await ky.get(url, {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
        'X-Skyfi-Api-Key': skyfiApiKey,
      },
    }).json()
  }

  log(`FOUND ${(skyfiResultsRaw as any).archives.length} archives`)
  const searchResultsJson = formatSkyfiResults(skyfiResultsRaw, searchPolygon)

  // handle pagination correctly
  const nextPage = skyfiResultsRaw.nextPage
  if (lookForNextPage && nextPage) {
    const nextResults = await searchSkyfi(
      searchSettings,
      skyfiApikey,
      searchPolygon,
      setters,
      nextPage,
    )
    searchResultsJson?.features.push(...nextResults?.searchResultsJson?.features)
  }

  return {
    searchResultsJson,
  }
}

const buildSkyfiPermalink = (feature) => {
  const type = feature.openData ? 'open' : 'commercial'
  const provider = feature.provider
  const id = feature.archiveId

  return `https://app.skyfi.com/explore/${type}/crop/${provider}:${id}`

  //with this it gives me a cors error idk why yet 
  //   const coordinates = feature.geometry.coordinates[0];
  // const wktPolygon = `POLYGON((${coordinates.map(c => c.join(' ')).join(',')}))`;
  // const aoiParam = encodeURIComponent(wktPolygon);

  // return `https://app.skyfi.com/explore/${type}/crop/${provider}:${id}?aoi=${aoiParam}`
}

const formatSkyfiResults = (skyfiResultsRaw, searchPolygon): GeoJSON.FeatureCollection => {
  return {
    features: skyfiResultsRaw.archives.map((feature) => {
      const feat = {
        geometry: wkt_parse(feature.footprint),
        properties: {
          id: feature.archiveId ?? uuidv4(),
          sceneId: feature.archiveId ?? uuidv4(),
          providerPlatform: `${Providers.SKYFI}`,
          provider: `${Providers.SKYFI}/${feature.provider as string}-${feature.constellation as string}`,
          resolution: feature.gsd / 100,
          acquisitionDate: new Date(feature.captureTimestamp).toISOString(),
          cloudCoverage: feature.cloudCoveragePercent,
          price: feature.priceFullScene,
          providerProperties: {
            azimuthAngle: feature.offNadirAngle,
            preview_uri_tiles: {
              url: feature.tilesUrl,
            },
          },
          preview_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null,
          thumbnail_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null,
          constellation: feature.constellation,
          providerName: feature.provider,
          shapeIntersection: null,
          raw_result_properties: feature,
          permalink: buildSkyfiPermalink(feature),
        },
        type: 'Feature',
      }
      return feat
    }),
    type: 'FeatureCollection',
  }
}

const get_aggregator_permalink = (feature, searchPolygon) => {
  return `https://app.skyfi.com/explore/crop/${feature.archiveId}?aoi=${escape(wkt_stringify(searchPolygon))}`
}

export default searchSkyfi
