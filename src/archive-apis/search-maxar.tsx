// Search Maxar DigitalGlobe APIs

import ky from 'ky'
import { maxAbs, getMaxarPrice, getConstellationName, maxarConstellationDict, Providers } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import { log } from '../utilities'

/* ---------------------------- */
/*      Maxar DigitalGlobe      */
/* ---------------------------- */
// https://discover.maxar.com/
// Maxar newest API is actually a STAC catalog endpoint search api,
// Maxar ARD requires the username and password, while digital globe search dashboard uses the old non-STAC API
// Cannot get the bearer token without an account for STAC
// https://docs.maxar.com/developers/api#operation/getDataProducts
// but auth requires account https://docs.auth.content.maxar.com/#getting-started

const MAXAR_LIMIT = 500
const MAXAR_SEARCH_URL = 'https://api.discover.digitalglobe.com/v1/services/ImageServer/query'
// SecureWatch being sunset and replaced by MGP (free/pro) https://xpress.maxar.com/
//Url with Bearer auth header https://api.maxar.com/discovery/v1/search?collections=ge01,wv02,wv03-vnir&bbox=2.331694939750504,48.84547226270402,2.3702118182411462,48.86031571777056&datetime=2021-08-03T00%3A00%3A00Z%2F2023-08-03T23%3A59%3A59Z&where=eo%3Acloud_cover%20%3C%3D%2020%20and%20view%3Aoff_nadir%20%3C%3D%2030%20and%20view%3Asun_elevation_max%20%3E%3D%200&orderby=datetime%20DESC&limit=50&page=1

// CORS needed to reach maxar api server
const searchMaxar = async (searchSettings, maxarApikey, searchPolygon = null, setters = null, maxarBearerJson = null, maxarNextLinks = null): Promise<any> => {
  if (maxarApikey === '') {
    maxarApikey = process.env.MAXAR_DIGITALGLOBE_APIKEY
  }
  const dateFormat = { month: '2-digit', day: '2-digit', year: 'numeric' }
  const maxarPayload = decodeURIComponent(
    new URLSearchParams({
      outFields: '*',
      inSR: '4326',
      outSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      where: `${`sun_elevation_avg >= ${searchSettings.sunElevation[0] as string} ` + ` AND image_band_name in('PAN','4-BANDS','8-BANDS') ` + ` AND collect_time_start >= '${searchSettings.startDate.toLocaleDateString('us', dateFormat) as string} 00:00:00' ` + ` AND collect_time_start <= '${searchSettings.endDate.toLocaleDateString('us', dateFormat) as string}  23:59:59' ` + ` AND off_nadir_max <= ${maxAbs(searchSettings.offNadirAngle)} ` + ` AND pan_resolution_max <= ${searchSettings.gsd.max as string}`}`,
      returnCountOnly: false,
      f: 'json',
      geometryBasedFilters: `area_cloud_cover_percentage <= ${searchSettings.cloudCoverage as string}`,
      geometryType: 'esriGeometryPolygon',
      geometry: `${`{"rings" : ${JSON.stringify(searchSettings.coordinates)}, "spatialReference" : {"wkid" : 4326}}`}`,
      resultRecordCount: `${MAXAR_LIMIT}`,
    } as any).toString()
  )
  // .replaceAll('\n', '')// .replaceAll('    &', '&').replaceAll('        AND', ' AND')

  const headers = {
    'x-api-key': maxarApikey,
    'Content-Type': 'application/x-www-form-urlencoded',
    'content-length': maxarPayload.length,
    'Transfer-Encoding': 'compress',
    // 'Cache-Control': 'no-cache',
  }
  // console.log('Maxar headers', headers)
  try {
    const maxarResultsRaw = await ky
      .post(MAXAR_SEARCH_URL, {
        headers,
        body: maxarPayload,
      })
      .json()
    const searchResultsJson = formatMaxarResults(maxarResultsRaw, searchPolygon)
    log('maxar PAYLOAD: \n', maxarPayload, '\nRAW maxar search results: \n', maxarResultsRaw, '\nJSON maxar search results: \n', searchResultsJson)

    return {
      searchResultsJson,
      maxarBearerJson,
    }
  } catch (error) {
    // So promise always return
    if (error.name === 'HTTPError') {
      const errorJson = await error.response.json()
      console.log('!!! --- ERROR on ky POST --- !!!', errorJson)
      return {
        searchResultsJson: null,
      }
    }
  }
}

const formatMaxarResults = (maxarResultsRaw, searchPolygon): GeoJSON.FeatureCollection => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: maxarResultsRaw.features.map((f) => {
      const feature = {
        // 'geometry': f.geometry,
        geometry: {
          type: 'Polygon',
          coordinates: f.geometry.rings,
        },
        properties: {
          // ...f.attributes,

          // 'constellation': maxarConstellationDict[f.attributes.vehicle_name]?.constellation || f.attributes.vehicle_name,
          providerPlatform: `${Providers.MAXAR_DIGITALGLOBE}`,
          constellation: getConstellationName(f.attributes.vehicle_name, maxarConstellationDict), // maxarConstellationDict[f.attributes.vehicle_name]?.constellation || f.attributes.vehicle_name,
          acquisitionDate: new Date(f.attributes.collect_time_start || f.attributes.start_time || 0).toISOString(), // or end_time '2019-03-23T10:24:03.000Z',
          price: null,
          shapeIntersection: null,

          id: f.attributes.image_identifier || uuidv4(),
          provider: `${Providers.MAXAR_DIGITALGLOBE}/${f.attributes.vehicle_name as string}`,
          // 'id': f.attributes.image_identifier || randomUUID(), uuid
          resolution: f.attributes.pan_resolution_avg, // multi_resolution_avg
          cloudCoverage: f.attributes.cloud_cover_percentage, // area_cloud_cover_percentage
          preview_uri: f.attributes.browse_url,
          thumbnail_uri: f.attributes.browse_url, // no dedicated thumbnail uri, and browse is pretty big.

          providerProperties: {
            illuminationElevationAngle: f.attributes.sun_elevation_avg,
            incidenceAngle: null,
            azimuthAngle: f.attributes.off_nadir_avg, // area_avg_off_nadir_angle,
            illuminationAzimuthAngle: f.attributes.sun_azimuth_avg,
          },
          raw_result_properties: f,
        },
        type: 'Feature',
      }
      // feature.properties.price = getMaxarPrice(feature)
      return feature
    }),
    type: 'FeatureCollection',
  }
}

// For deeplink, could store whole scenes selected with post request on https://api.discover.digitalglobe.com/v1/store
const get_aggregator_permalink = async (feature, searchPolygon, maxarApikey) => {
  if (maxarApikey === '') {
    maxarApikey = process.env.MAXAR_DIGITALGLOBE_APIKEY
  }
  const maxarPayload = {
    'Filter Criteria': { availableProductTypes: ['Core Imagery', 'In Track Stereo', 'Mosaic Products'], productType: 'Core Imagery', selectedProductLines: 'Vivid Basic', availableBands: ['PAN', '4-BANDS', '8-BANDS', 'SWIR'], selectedBands: ['4-BANDS', '8-BANDS'], availableGSDValues: ['Any resolution', 'Less than 40cm', 'Less than 50cm', 'Less than 60cm', 'Less than 70cm'], resolutionGSD: 'Any resolution', autoAlgorithm: 'By most current', startDate: '07-28-2021', endDate: '07-28-2023', cloudCover: 20, offNadir: 30, sunElevation: 0, isHighDefinitionSelected: false, maxOffNadir: 90, minSunElevation: 0 },
    'Map Options': { selectedFootprintsOption: 'clip' },
    'Area of Interests': {
      type: 'FeatureCollection',
      features: [searchPolygon],
    },
    stripsOrder: [{ id: feature.id, aoiId: 0, rank: 0 }],
  }.toString()

  const headers = {
    'x-api-key': maxarApikey,
    'Content-Type': 'application/x-www-form-urlencoded',
    'content-length': maxarPayload.length.toString(),
    'Transfer-Encoding': 'compress',
  }

  const storeObject = await ky
    .post('https://api.discover.digitalglobe.com/v1/store', {
      headers,
      body: maxarPayload,
    })
    .json()
  return `https://discover.maxar.com/${(storeObject as any).id}`
}

// For thumbnail, could have a look at https://api.discover.digitalglobe.com/v1/services/ImageServer/exportImage with form data payload as bbox=2.2686767578125004%2C48.86832824998009%2C2.2741699218750004%2C48.87194147722911&size=256%2C256&bboxSR=4326&imageSR=102100&format=png8&f=image&pixelType=U8&noDataInterpretation=esriNoDataMatchAny&interpolation=RSP_BilinearInterpolation&mosaicRule=%7B%20%22mosaicMethod%22%3A%20%22esriMosaicLockRaster%22%2C%20%22lockRasterIds%22%3A%20%5B13423329%2C13308451%5D%2C%20%22ascending%22%3A%20%22true%22%2C%20%22mosaicOperation%22%3A%20%22MT_FIRST%22%20%7D

/*
const get_maxar_bearer = async (maxarApikey) => {
    const maxar_projectApi = base64_encode(`${maxarApikey}`)
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

    const maxarBearerJson = `Bearer ${maxar_oauth_json['access_token']}`
    console.log('maxarBearerJson', {maxar_bearer: maxarBearerJson})
    return maxarBearerJson
}
*/

export default searchMaxar
