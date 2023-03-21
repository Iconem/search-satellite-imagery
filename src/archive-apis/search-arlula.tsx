// Code for searching ARLULA API

import ky from 'ky';
import { encode as base64_encode } from 'base-64';
import { Providers, max_abs } from './search-utilities';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utilities';

// https://www.arlula.com/documentation

const ARLULA_SEARCH_URL = 'https://api.arlula.com/api/archive/search';
const get_arlula_auth = (arlula_apikey) => {
  if (arlula_apikey.apiKey === '' || arlula_apikey.apiSecurity === '') {
    arlula_apikey = {
      apiKey: process.env.ARLULA_APIKEY,
      apiSecurity: process.env.ARLULA_APISECURITY,
    };
  }
  return `Basic ${base64_encode(`${arlula_apikey.apiKey}:${arlula_apikey.apiSecurity}`)}`;
};

const search_arlula = async (search_settings, arlula_apikey, searchPolygon = null, setters = null, arlula_bearer_json = null, next_url = '') => {
  // /api/archive/search?start=2019-01-03&end=2019-04-13&res=low&lat=-33.8523&long=151.2108
  // polygon	JSON array or WKT polygon string

  const arlula_url = new URL(ARLULA_SEARCH_URL);
  arlula_url.search = new URLSearchParams({
    start: search_settings.startDate.toISOString().substring(0, 10),
    end: search_settings.endDate.toISOString().substring(0, 10),
    gsd: search_settings.gsd.max,
    cloud: search_settings.cloudCoverage,
    'off-nadir': `${max_abs(search_settings.offNadirAngle)}`,
    polygon: JSON.stringify(searchPolygon.geometry.coordinates),
  }) as any;

  const arlula_results_raw = await ky
    .get(arlula_url.toString(), {
      headers: {
        Authorization: get_arlula_auth(arlula_apikey),
      },
    })
    .json();

  // TODO: TEST next
  const search_results_json = format_arlula_results(arlula_results_raw);
  log('arlula PAYLOAD: \n', arlula_url.toString(), '\nRAW arlula search results: \n', arlula_results_raw, '\nJSON arlula search results: \n', search_results_json);

  return {
    search_results_json,
  };
};

const format_arlula_results = (arlula_results_raw) => {
  return {
    features: arlula_results_raw.results.map((r) => {
      // const parsedJwt = parseJwt(r.orderingID)
      return {
        geometry: {
          coordinates: r.bounding, // r.overlap.polygon,
          // coordinates: parsedJwt.polygon, // r.overlap.polygon,
          type: 'Polygon',
        },
        properties: {
          id: r.sceneID ?? uuidv4(), // or orderingID
          // constellation: arlula_constellation_dict[r.properties.constellation]?.constellation || r.properties.constellation,
          price: r.bundles?.length > 0 && Math.min(...r.bundles.map((o) => o.price / 100))[0],
          // 'price': parsedJwt.ordering?.length > 0 && Math.min(...parsedJwt.ordering.map(o => o.price / 100)),
          providerPlatform: `${Providers.ARLULA}`,
          provider: `${Providers.ARLULA}/${r.supplier}-${r.platform}`,
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
      };
    }),
    type: 'FeatureCollection',
  };
};

export default search_arlula;
