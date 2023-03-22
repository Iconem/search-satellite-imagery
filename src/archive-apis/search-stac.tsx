// Code for searching STAC API

import ky from 'ky'
import { Providers } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import bbox from '@turf/bbox'

// https://planetarycomputer.microsoft.com/api/stac/v1/search?datetime=2022-03-01T00%3A00%3A00.000Z%2F2023-03-03T00%3A00%3A00.000Z&bbox=2.3405170440673833%2C48.85186782820218%2C2.3533487319946294%2C48.85751523811033&limit=12

const STAC_SEARCH_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
const STAC_COLLECTIONS = ['landsat-8-c2-l2', 'sentinel-2-l2a', 'landsat-c2-l1', 'landsat-c2-l2']

const STAC_SEARCH_LIMIT = 100

const searchStac = async (searchSettings, stacApikey, searchPolygon = null, setters = null, nextUrl = ''): Promise<any> => {
  const geometry = {
    type: 'Polygon',
    coordinates: searchPolygon.geometry.coordinates,
    // [
    //   [
    //     [-122.52331352233887, 37.68667516643027],
    //     [-122.51050949096678, 37.68667516643027],
    //     [-122.51050949096678, 37.69559870629919],
    //     [-122.52331352233887, 37.69559870629919],
    //     [-122.52331352233887, 37.68667516643027]
    //   ]
    // ]
  }
  const bounds = bbox(searchPolygon)

  const stacUrlWithParams = new URL(STAC_SEARCH_URL)
  stacUrlWithParams.search = new URLSearchParams({
    datetime: `${searchSettings.startDate.toISOString() as string}/${searchSettings.endDate.toISOString() as string}`,
    // 'intersects': JSON.stringify(geometry), // searchPolygon geometry
    bbox: bounds.toString(),
    limit: `${STAC_SEARCH_LIMIT}`,
    sortby: 'datetime des',

    // 'datetime': '2022-02-28T23:00:00.000Z/2023-03-02T23:00:00.000Z',
    // 'bbox': '2.3405170440673833,48.85186782820218,2.3533487319946294,48.85751523811033',
    // 'limit': '12',
    collections: STAC_COLLECTIONS.join(','),
  }) as any

  const stacResultsRaw = await ky
    .get(stacUrlWithParams.toString(), {
      headers: {
        // 'Authorization': get_stac_auth(stacApikey),
      },
      timeout: 20000,
    })
    .json()
  console.log('STAC API Search PAYLOAD: \n', stacUrlWithParams.toString(), '\nRAW STAC search results: \n', stacResultsRaw)

  const searchResultsJson = formatStacResults(stacResultsRaw)
  console.log('STAC API Search PAYLOAD: \n', stacUrlWithParams.toString(), '\nRAW STAC search results: \n', stacResultsRaw, '\nJSON STAC search results: \n', searchResultsJson)

  return {
    searchResultsJson,
  }
}

function getResolution(assets): number {
  const minAssetsGsd = Math.min(
    ...Object.values(assets)
      .map((a: any) => a.gsd)
      .filter((gsd) => !isNaN(gsd) as any)
  )
  return minAssetsGsd
}

const potentialAssetsNames = ['rendered_preview', 'preview', 'visual'] //, 'tilejson' could be reaaaally impactful
const formatStacResults = (stacResultsRaw): GeoJSON.FeatureCollection => {
  return {
    features: stacResultsRaw.features.map((f) => {
      const feat = {
        geometry: f.geometry,
        properties: {
          id: f.id ?? uuidv4(),
          providerPlatform: `${Providers.STAC}`,
          provider: `${Providers.STAC}/${f.properties.platform as string}`,
          providerName: f.properties.constellation,
          price: null,
          shapeIntersection: '100', // 100 null,

          acquisitionDate: new Date(f.properties.datetime).toISOString(),
          cloudCoverage: f.properties['eo:cloud_cover'],
          providerProperties: {
            illuminationAzimuthAngle: f.properties['s2:mean_solar_azimuth'],
            illuminationElevationAngle: f.properties['s2:mean_solar_zenith'],
          },
          raw_result_properties: f,
        },
        type: 'Feature',
      } as any

      const bestAssets = potentialAssetsNames.map((name) => f.assets[name]).filter((a) => a != null)

      if (bestAssets.length > 0) {
        // Could retrieve GET request on tilejson.href
        // https://planetarycomputer.microsoft.com/api/data/v1/item/tilejson.json?collection=sentinel-2-l2a&item=S2B_MSIL2A_20230301T104859_R051_T31UDQ_20230301T211932&assets=visual&asset_bidx=visual%7C1%2C2%2C3&nodata=0&format=png
        const bestAsset = bestAssets[0]
        feat.properties = {
          ...feat.properties,
          // 'resolution': f.assets.visual?.gsd || '0',
          // 'resolution': bestAsset.gsd,
          resolution: getResolution(f.assets),
          preview_uri: bestAssets.href,
          thumbnail_uri: bestAssets.href,
        }
      }

      return feat
    }),
    type: 'FeatureCollection',
  }
}

export default searchStac
