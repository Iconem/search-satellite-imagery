// Code for searching OpenAerialMap API

import ky from 'ky';
import bbox from '@turf/bbox';
import {
  Providers,
  shapeIntersection,
} from './search-utilities'

// https://api.openaerialmap.org/meta?order_by=acquisition_end&sort=desc&limit=100
const oam_limit = 1000
const oam_base_url = 'https://api.openaerialmap.org/meta'

const search_openaerialmap = async (search_settings, oam_apikey, searchPolygon=null, setters=null) => {
  const oam_url = new URL(oam_base_url);
  const bounds = bbox(searchPolygon)
  oam_url.search = new URLSearchParams({
    'limit': `${oam_limit}`, 
    'bbox': bounds.join(','),
    'gsd_from': `${search_settings.gsd.min}`,
    'gsd_to': `${search_settings.gsd.max}`, 
    'acquisition_from': search_settings.startDate.toISOString().substring(0,10),
    'acquisition_to': search_settings.endDate.toISOString().substring(0,10),
  }) as any; 
  const oam_search_url = oam_url.toString()
  console.log('oam_search_url', oam_search_url)
   
  // const oam_search_url = `${oam_base_url}?limit=${oam_limit}&bbox=135,31.95216223802496,146.25,40.97989806962013&gsd_from=${search_settings.gsd.min}&gsd_to=${search_settings.gsd.max}&acquisition_from=search_settings.endDate.toISOString().substring(0,10)`

  const search_results_raw = await ky.get(oam_search_url).json()

  console.log('OpenAerialMap PAYLOAD: \n', oam_search_url, '\nRAW OAM search results raw: \n', search_results_raw)
  const search_results_json = format_oam_results(search_results_raw, searchPolygon)
  console.log('OpenAerialMap PAYLOAD: \n', oam_search_url, '\nRAW OAM search results raw: \n', search_results_raw, '\nJSON OAM search results: \n', search_results_json)
  console.log(search_results_json.features[0])
  return { search_results_json, }
}

const format_oam_results = (oam_results_raw, searchPolygon=null) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    'features': oam_results_raw.results.map(r =>{
      const feat =  (
        {
          'geometry': {
            coordinates: r.geojson.coordinates[0],
             type: 'Polygon'
          },
          'properties': {
            'providerPlatform': `${Providers.OAM}`, 
            'provider': `${Providers.OAM}/${r.provider}/${r.platform}/${r.properties?.sensor ?? ''}`,
            'id': r.uuid, 
            'acquisitionDate': r.acquisition_end, 
            'resolution': r.gsd,
            'price': 0,
            'shapeIntersection': 100, // shapeIntersection(r.geojson, searchPolygon),
            
            'preview_uri': r.properties.thumbnail,
            'thumbnail_uri': r.properties.thumbnail,
            'providerProperties': {
              'preview_uri_tiles': {
                'url': r.properties.tms,
                'minzoom' : 0,
                'maxzoom' : 20,
              }
            }
          },
          'type': 'Feature'
        }
      )
      feat.geometry
      return feat
    }),
    'type': 'FeatureCollection'
  }
}

export default search_openaerialmap