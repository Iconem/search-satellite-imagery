// Code for searching ARLULA API

import ky from 'ky'
import { encode as base64_encode } from 'base-64'
import { Providers, maxAbs } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import { log } from '../utilities'
import type GeoJSON from 'react-map-gl'

// https://www.arlula.com/documentation

const ARLULA_SEARCH_URL = 'https://api.arlula.com/api/archive/search'
const getArlulaAuth = (arlulaApikey): string => {
  if (arlulaApikey.apiKey === '' || arlulaApikey.apiSecurity === '') {
    arlulaApikey = {
      apiKey: process.env.ARLULA_APIKEY,
      apiSecurity: process.env.ARLULA_APISECURITY,
    }
  }
  return `Basic ${base64_encode(`${arlulaApikey.apiKey as string}:${arlulaApikey.apiSecurity as string}`) as string}`
}

const searchArlula = async (searchSettings, arlulaApikey, searchPolygon = null, setters = null, arlulaBearerJson = null, nextUrl = ''): Promise<any> => {
  // /api/archive/search?start=2019-01-03&end=2019-04-13&res=low&lat=-33.8523&long=151.2108
  // polygon	JSON array or WKT polygon string

  const arlulaUrl = new URL(ARLULA_SEARCH_URL)
  arlulaUrl.search = new URLSearchParams({
    start: searchSettings.startDate.toISOString().substring(0, 10),
    end: searchSettings.endDate.toISOString().substring(0, 10),
    gsd: searchSettings.gsd.max,
    cloud: searchSettings.cloudCoverage,
    'off-nadir': `${maxAbs(searchSettings.offNadirAngle)}`,
    polygon: JSON.stringify((searchPolygon as any).geometry.coordinates),
  }) as any

  const arlulaResultsRaw = await ky
    .get(arlulaUrl.toString(), {
      headers: {
        Authorization: getArlulaAuth(arlulaApikey),
      },
    })
    .json()

  // TODO: TEST next
  const searchResultsJson = formatArlulaResults(arlulaResultsRaw)
  log('arlula PAYLOAD: \n', arlulaUrl.toString(), '\nRAW arlula search results: \n', arlulaResultsRaw, '\nJSON arlula search results: \n', searchResultsJson)

  return {
    searchResultsJson,
  }
}

const formatArlulaResults = (arlulaResultsRaw): GeoJSON.FeatureCollection => {
  return {
    features: arlulaResultsRaw.results.map((r) => {
      // const parsedJwt = parseJwt(r.orderingID)
      return {
        geometry: {
          coordinates: r.bounding, // r.overlap.polygon,
          // coordinates: parsedJwt.polygon, // r.overlap.polygon,
          type: 'Polygon',
        },
        properties: {
          id: r.sceneID ?? uuidv4(), // or orderingID
          // constellation: arlula_constellationDict[r.properties.constellation]?.constellation || r.properties.constellation,
          price: r.bundles?.length > 0 && Math.min(...r.bundles.map((o) => o.price / 100))[0],
          // 'price': parsedJwt.ordering?.length > 0 && Math.min(...parsedJwt.ordering.map(o => o.price / 100)),
          providerPlatform: `${Providers.ARLULA}`,
          provider: `${Providers.ARLULA}/${r.supplier as string}-${r.platform as string}`,
          providerName: r.supplier,

          resolution: r.gsd,
          acquisitionDate: r.date,
          cloudCoverage: r.cloud,
          shapeIntersection: r.overlap.percent.scene,
          providerProperties: {
            azimuthAngle: r.offNadir, // or incidenceAngle
          },
          raw_result_properties: r,
          preview_uri: r.thumbnail,
          thumbnail_uri: r.thumbnail,
        },
        type: 'Feature',
      }
    }),
    type: 'FeatureCollection',
  }
}

export default searchArlula
