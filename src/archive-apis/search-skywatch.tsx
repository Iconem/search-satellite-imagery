// Code for searching SkyWatch API

import ky from 'ky'
import { Providers } from './search-utilities'
import { log } from '../utilities'

/* -------------- */
/*    SKYWATCH    */
/* -------------- */
// Skywatch: https://dashboard.skywatch.co/account/profile

const SKYWATCH_SEARCH_URL = 'https://api.skywatch.co/earthcache/archive/search'
const SKYWATCH_SEARCH_URL_JWT = 'https://api.skywatch.co/auth0-jwt/earthcache/archive/search'
const performSkywatchSearch = async (skywatchApikey, searchId): Promise<any> =>
  skywatchApikey?.includes('Bearer')
    ? await ky.get(`${SKYWATCH_SEARCH_URL_JWT}/${searchId.data.id as string}/search_results`, {
        headers: { authorization: skywatchApikey },
      })
    : await ky.get(`${SKYWATCH_SEARCH_URL}/${searchId.data.id as string}/search_results`, {
        headers: { 'x-api-key': skywatchApikey },
      })

const MAX_QUERY_COUNT = 8

const searchSkywatch = async (searchSettings, skywatchApikey, searchPolygon = null, setters = null): Promise<any> => {
  if (!skywatchApikey || skywatchApikey === '') {
    skywatchApikey = process.env.SKYWATCH_APIKEY
  }
  const resolutionArray: string[] = [] // ['low', 'medium', 'high']
  if (searchSettings.gsd.min <= 0.5) resolutionArray.push('very_high')
  if (searchSettings.gsd.min <= 1) resolutionArray.push('high')
  if (searchSettings.gsd.max >= 5) resolutionArray.push('low')
  if ((searchSettings.gsd.min <= 1.5 && searchSettings.gsd.max >= 1.5) || (searchSettings.gsd.min <= 5 && searchSettings.gsd.max >= 5)) resolutionArray.push('medium')

  const skywatchPayload = {
    location: {
      type: 'Polygon',
      coordinates: searchSettings.coordinates,
    },
    start_date: searchSettings.startDate.toISOString().substring(0, 10),
    end_date: searchSettings.endDate.toISOString().substring(0, 10),
    resolution: resolutionArray,
    coverage: searchSettings.aoiCoverage,
    cloud_cover_percentage: searchSettings.cloudCoverage,
    interval_length: 0,
    order_by: ['resolution', 'date', 'cost'],
    // "cloudCoverage": searchSettings.cloudCoverage // not working
  }
  // console.log('SKYWATCH PAYLOAD: \n', skywatchPayload, '\n')

  const searchId = skywatchApikey?.includes('Bearer')
    ? await ky
        .post(SKYWATCH_SEARCH_URL_JWT, {
          headers: {
            authorization: skywatchApikey,
            'content-length': `${JSON.stringify(skywatchPayload).length}`,
          },
          json: skywatchPayload,
        })
        .json()
    : await ky
        .post(SKYWATCH_SEARCH_URL, {
          headers: { 'x-api-key': skywatchApikey },
          json: skywatchPayload,
        })
        .json()
  log('SKYWATCH searchId: \n', searchId, '\n')

  let searchResultsRaw
  let nQueries = 0
  let retryDelay = 1000
  while (nQueries++ < MAX_QUERY_COUNT) {
    const searchQueryResponse = await performSkywatchSearch(skywatchApikey, searchId)
    console.log('nQueries', nQueries, 'retryDelay', retryDelay / 1000, 'sec. response status', searchQueryResponse.status, searchQueryResponse)
    if (searchQueryResponse.status === 202) {
      // Wait for some delay before querying again search api
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      retryDelay *= 2
    } else {
      searchResultsRaw = await searchQueryResponse.json()
      nQueries = MAX_QUERY_COUNT
    }
  }

  if (searchResultsRaw) {
    const searchResultsJson = formatSkywatchResults(searchResultsRaw, searchSettings)
    log('SKYWATCH PAYLOAD: \n', skywatchPayload, '\nRAW SKYWATCH search results: \n', searchResultsRaw, '\nJSON SKYWATCH search results: \n', searchResultsJson)
    return { searchResultsJson }
  }

  // Return Empty Feature Collection if search requests timed-out after all retries, and notice user via snackbar
  console.log('Returning empty FeatureCollection')
  if (setters.setSnackbarOptions) {
    setters.setSnackbarOptions({
      open: false,
      message: '',
    })
    setters.setSnackbarOptions({
      open: true,
      message: `Search Results Request timed-out on Skywatch after ${nQueries} tries and final delay of ${retryDelay / 1000}s`,
    })
  }
  return {
    searchResultsJson: {
      features: [],
      type: 'FeatureCollection',
    },
  }
}

const formatSkywatchResults = (skywatchResultsRaw, searchSettings): GeoJSON.FeatureCollection => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  return {
    type: 'FeatureCollection',
    features: skywatchResultsRaw.data
      // .filter(r => r.result_cloud_cover_percentage <= searchSettings.cloudCoverage)
      .map((r) => ({
        geometry: r.location,
        properties: {
          providerPlatform: `${Providers.SKYWATCH}`,
          provider: `${Providers.SKYWATCH}/${r.source as string}`,
          id: r.product_name,
          skywatch_id: r.id,
          acquisitionDate: r.start_time, // or end_time '2019-03-23T10:24:03.000Z',
          resolution: r.resolution,
          cloudCoverage: r.result_cloud_cover_percentage,
          constellation: `${r.source as string}`,

          // Other interesting properties on EOS results
          // skywatch.thumbnail_uri, skywatch.preview_uri, skywatch.provider, skywatch.product
          shapeIntersection: r.location_coverage_percentage,
          price: r.cost,

          preview_uri: r.preview_uri,
          thumbnail_uri: r.thumbnail_uri,

          providerProperties: {
            illuminationElevationAngle: null,
            incidenceAngle: null,
            azimuthAngle: null,
            illuminationAzimuthAngle: null,
            // 'producer': 'airbus', collection: 'PHR'
            // 'dataUri': 'gs://tcifg-idp-prod-datastore-data-pilot-nearline/PDWPHR_20190325084500_4_SO19009267-4-01_DS_PHR1B_201903231024035_FR1_PX_E013N52_0915_02862.zip',
          },
          raw_result_properties: r,
        },
        type: 'Feature',
      })),
  }
}

export default searchSkywatch
