// Code for searching EOS API

import ky from 'ky'
import { getConstellationName, getSatellitesRespectingGsd, eosConstellationDict, eosNames, Providers } from './search-utilities'
import { log } from '../utilities'
import type GeoJSON from 'react-map-gl'

/* --------------- */
/*   EOS HIGHRES   */
/* --------------- */
// EOS: https://api-connect.eos.com/user-dashboard/ https://doc.eos.com/api/#authorization-api
// EOS query wont let you search Pleiades, Head, Kompsat, but only landsat, sentinel, naip etc
// EOS API HighRes https://doc.eos.com/hires.search.api/#high-resolution-datasets
// EOS API : https://doc.eos.com/search.api/#multi-dataset-search
// EOS Search API is only valid for 2 weeks on new accounts, then requires a min 3k usd/year for 30k requests/month

// Deep Link: could use https://eos.com/landviewer/?lat=48.93459&lng=2.24469&z=16&preset=highResolutionSensors&purchase-scene=895ca42a077b1087f53cf9c6a2ac71da
// Or could POST to cart with id: https://eos.com/landviewer/reselling/cart/ with payload [{ "scene": { "sceneID": "MSC_220528074952_84497_01201367BN19", "dataGeometry": { ... }, ...}, "price": 137, "licenses": 1 }]

const EOS_LIMIT = 100
const EOS_TIMEOUT_MS = 20_000

// let eosSearchHighresUrl = 'https://api.eos.com/api/v5/allsensors'
const eosSearchHighresUrl = 'https://lms-reselling.eos.com/api/v5/allsensors'
const searchEosHighres = async (searchSettings, eosApikey, searchPolygon = null, setters = null, eosPageIdx = 1): Promise<any> => {
  if (eosApikey === '') {
    eosApikey = process.env.EOS_APIKEY
  }
  const satellites = getSatellitesRespectingGsd(searchSettings.gsd)
  const eosSatellites = satellites.map((s) => eosNames[s]).filter((s) => s)

  // console.log('eos satellites', eosSatellites)
  const eosPayloadHighres = {
    search: {
      satellites: eosSatellites,
      // [
      //   'KOMPSAT-2', 'KOMPSAT-3A', 'KOMPSAT-3', 'SuperView 1A', 'SuperView 1B', 'SuperView 1C', 'SuperView 1D', 'Gaofen 1', 'Gaofen 2', 'Ziyuan-3', 'TripleSat Constellation-1', 'TripleSat Constellation-2', 'TripleSat Constellation-3'
      // ],
      shape: {
        type: 'Polygon',
        coordinates: searchSettings.coordinates,
      },
      date: {
        from: searchSettings.startDate.toISOString().substring(0, 10), // YYYY-MM-DD date format
        to: searchSettings.endDate.toISOString().substring(0, 10),
      },
      cloudCoverage: {
        from: 0,
        to: searchSettings.cloudCoverage,
      },
      sunElevation: {
        from: searchSettings.sunElevation[0],
        to: searchSettings.sunElevation[1],
      },
      shapeIntersection: {
        from: searchSettings.aoiCoverage,
        to: 100,
      },
    },
    sort: [{ field: 'date', order: 'desc' }],
    page: eosPageIdx,
    limit: EOS_LIMIT,
  }

  try {
    const searchResultsRaw = await ky
      .post(
        eosSearchHighresUrl, // + `?api_key=${eosApikey}`,
        {
          // headers: { 'Authorization': `ApiKey ${eosApikey}` },
          json: eosPayloadHighres,
          timeout: EOS_TIMEOUT_MS,
        }
      )
      .json()

    const searchResultsJson = formatEosResults(searchResultsRaw)
    log('EOS PAYLOAD: \n', eosPayloadHighres, '\nRAW EOS search results raw: \n', searchResultsRaw, '\nJSON EOS search results: \n', searchResultsJson)
    return { searchResultsJson }
  } catch (error) {
    // if (error.name === 'AbortError') {
    console.log('Returning empty FeatureCollection, probably because of timeout', error)
    if (setters?.setSnackbarOptions) {
      setters.setSnackbarOptions({
        open: false,
        message: '',
      })
      setters.setSnackbarOptions({
        open: true,
        message: `Search Results Request timed-out on EOS API after ${EOS_TIMEOUT_MS / 1000}s`,
      })
    }
    return {
      searchResultsJson: {
        features: [],
        type: 'FeatureCollection',
      },
    }
  }
}

const formatEosResults = (eosResultsRaw): GeoJSON.FeatureCollection => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: eosResultsRaw.results.map((r) => ({
      geometry: r.dataGeometry,
      properties: {
        providerPlatform: `${Providers.EOS}`,
        provider: `${Providers.EOS}/${r.satellite as string}`,
        id: r.sceneID,
        acquisitionDate: new Date(r.date).toISOString(), // '2019-03-23T10:24:03.000Z',
        resolution: parseFloat(r.resolution?.replace(' m/pxl', '') ?? '0'), // '1.5 m/pxl'
        cloudCoverage: r.cloudCoverage,
        constellation: getConstellationName(r.satellite, eosConstellationDict),
        // 'constellation': r.satellite in eosConstellationDict ? eosConstellationDict[r.satellite].constellation : r.satellite,

        // 'constellation': eosConstellationDict[r.satellite]?.constellation || r.satellite,

        // Other interesting properties on EOS results
        // eos.thumbnail, eos.browseURL, eos.provider, eos.product
        shapeIntersection: r.shapeIntersection,
        price: r.price,

        preview_uri: r.browseURL,
        thumbnail_uri: r.thumbnail, // Seems like thumbnail is same resolution as preview

        providerProperties: {
          illuminationElevationAngle: r.sunElevation,
          // 'producer': 'airbus', collection: 'PHR'
          // 'dataUri': 'gs://tcifg-idp-prod-datastore-data-pilot-nearline/PDWPHR_20190325084500_4_SO19009267-4-01_DS_PHR1B_201903231024035_FR1_PX_E013N52_0915_02862.zip',
        },
        raw_result_properties: r,
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  }
}

/* -------------- */
/*   EOS LOWRES   */
/* -------------- */
const EOS_SEARCH_LOWRES_URL = 'https://gate.eos.com/api/lms/search/v2'
const searchEosLowres = async (searchSettings, eosApikey: string, eosPageIdx = 1): Promise<any> => {
  const eosPayloadLowres = {
    fields: ['sunElevation', 'cloudCoverage', 'sceneID', 'date', 'path', 'storedInCollection', 'productID', 'sensor', 'row', 'dataCoveragePercentage'],
    limit: EOS_LIMIT,
    page: eosPageIdx,
    search: {
      satellites: ['sentinel2', 'landsat8', 'naip'], // , 'modis', 'cbers4', 'sentinel1', 'landsat7', 'landsat5', 'landsat4'],
      // 'date': {'from': '2019-08-01', 'to': '2020-06-01'},
      date: { from: searchSettings.startDate.toISOString().substring(0, 10), to: searchSettings.endDate.toISOString().substring(0, 10) },
      cloudCoverage: { from: 0, to: searchSettings.cloudCoverage },
      sunElevation: { from: searchSettings.sunElevation[0], to: searchSettings.sunElevation[1] },
      shape: {
        type: 'Polygon',
        coordinates: searchSettings.coordinates,
      },
    },
  }

  const searchResultsJson = await ky
    .post(EOS_SEARCH_LOWRES_URL + `?api_key=${eosApikey}`, {
      json: eosPayloadLowres,
    })
    .json()
  log('EOS PAYLOAD: \n', eosPayloadLowres, '`n', 'EOS search results: \n', searchResultsJson)
  return {
    searchResultsJson,
  }
}

export { searchEosHighres, searchEosLowres }
