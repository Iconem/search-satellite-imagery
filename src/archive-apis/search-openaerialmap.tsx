// Code for searching OpenAerialMap API

import ky from 'ky'
import bbox from '@turf/bbox'
import { Providers } from './search-utilities'
import { log } from '../utilities'

// https://api.openaerialmap.org/meta?order_by=acquisition_end&sort=desc&limit=100
const OAM_LIMIT = 1000
const OAM_BASE_URL = 'https://api.openaerialmap.org/meta'

const searchOpenaerialmap = async (searchSettings, oamApikey, searchPolygon = null, setters = null): Promise<any> => {
  const oamUrl = new URL(OAM_BASE_URL)
  const bounds = bbox(searchPolygon)
  oamUrl.search = new URLSearchParams({
    limit: `${OAM_LIMIT}`,
    bbox: bounds.join(','),
    gsd_from: `${searchSettings.gsd.min as string}`,
    gsd_to: `${searchSettings.gsd.max as string}`,
    acquisition_from: searchSettings.startDate.toISOString().substring(0, 10),
    acquisition_to: searchSettings.endDate.toISOString().substring(0, 10),
  }) as any
  const oamSearchUrl = oamUrl.toString()
  log('oamSearchUrl', oamSearchUrl)

  // const oamSearchUrl = `${OAM_BASE_URL}?limit=${OAM_LIMIT}&bbox=135,31.95216223802496,146.25,40.97989806962013&gsd_from=${searchSettings.gsd.min}&gsd_to=${searchSettings.gsd.max}&acquisition_from=searchSettings.endDate.toISOString().substring(0,10)`

  const searchResultsRaw = await ky.get(oamSearchUrl).json()

  const searchResultsJson = formatOamResults(searchResultsRaw, searchPolygon)
  log('OpenAerialMap PAYLOAD: \n', oamSearchUrl, '\nRAW OAM search results raw: \n', searchResultsRaw, '\nJSON OAM search results: \n', searchResultsJson)
  return { searchResultsJson }
}

const formatOamResults = (oamResultsRaw, searchPolygon = null): GeoJSON.FeatureCollection => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: oamResultsRaw.results.map((r) => {
      const feat = {
        geometry: {
          coordinates: r.geojson.coordinates[0],
          type: 'Polygon',
        },
        properties: {
          providerPlatform: `${Providers.OAM}`,
          provider: `${Providers.OAM}/${r.provider as string}/${r.platform as string}/${(r.properties?.sensor as string) ?? ''}/${r.title as string}`,
          id: r.uuid,
          acquisitionDate: r.acquisition_end,
          resolution: r.gsd,
          price: 0,
          shapeIntersection: null, // shapeIntersection(r.geojson, searchPolygon),

          preview_uri: r.properties.thumbnail,
          thumbnail_uri: r.properties.thumbnail,
          providerProperties: {
            preview_uri_tiles: {
              url: r.properties.tms,
            },
          },
          raw_result_properties: { ...r },
        },
        type: 'Feature',
      }
      return feat
    }),
    type: 'FeatureCollection',
  }
}

export default searchOpenaerialmap
