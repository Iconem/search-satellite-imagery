// Code for searching SkyWatch API

import ky from 'ky';
import { Providers } from './search-utilities';
import { log } from '../utilities';

/* -------------- */
/*    SKYWATCH    */
/* -------------- */
// Skywatch: https://dashboard.skywatch.co/account/profile

const skywatch_search_url = 'https://api.skywatch.co/earthcache/archive/search';
const skywatch_search_url_jwt = 'https://api.skywatch.co/auth0-jwt/earthcache/archive/search';
const perform_skywatch_search = async (skywatch_apikey, searchId) =>
  skywatch_apikey.includes('Bearer')
    ? await ky.get(`${skywatch_search_url_jwt}/${searchId.data.id}/search_results`, {
        headers: { authorization: skywatch_apikey },
      })
    : await ky.get(`${skywatch_search_url}/${searchId.data.id}/search_results`, {
        headers: { 'x-api-key': skywatch_apikey },
      });

const max_query_count = 8;

const search_skywatch = async (search_settings, skywatch_apikey, searchPolygon = null, setters = null) => {
  if (skywatch_apikey === '') {
    skywatch_apikey = process.env.SKYWATCH_APIKEY;
  }
  const resolution_array = []; // ['low', 'medium', 'high']
  if (search_settings.gsd.min <= 0.5) resolution_array.push('very_high');
  if (search_settings.gsd.min <= 1) resolution_array.push('high');
  if (search_settings.gsd.max >= 5) resolution_array.push('low');
  if ((search_settings.gsd.min <= 1.5 && search_settings.gsd.max >= 1.5) || (search_settings.gsd.min <= 5 && search_settings.gsd.max >= 5)) resolution_array.push('medium');

  const skywatch_payload = {
    location: {
      type: 'Polygon',
      coordinates: search_settings.coordinates,
    },
    start_date: search_settings.startDate.toISOString().substring(0, 10),
    end_date: search_settings.endDate.toISOString().substring(0, 10),
    resolution: resolution_array,
    coverage: search_settings.aoiCoverage,
    cloud_cover_percentage: search_settings.cloudCoverage,
    interval_length: 0,
    order_by: ['resolution', 'date', 'cost'],
    // "cloudCoverage": search_settings.cloudCoverage // not working
  };
  // console.log('SKYWATCH PAYLOAD: \n', skywatch_payload, '\n')

  const searchId = skywatch_apikey.includes('Bearer')
    ? await ky
        .post(skywatch_search_url_jwt, {
          headers: {
            authorization: skywatch_apikey,
            'content-length': `${JSON.stringify(skywatch_payload).length}`,
          },
          json: skywatch_payload,
        })
        .json()
    : await ky
        .post(skywatch_search_url, {
          headers: { 'x-api-key': skywatch_apikey },
          json: skywatch_payload,
        })
        .json();
  log('SKYWATCH searchId: \n', searchId, '\n');

  let search_results_raw;
  let n_queries = 0;
  let retry_delay = 1000;
  while (n_queries++ < max_query_count) {
    const search_query_response = await perform_skywatch_search(skywatch_apikey, searchId);
    console.log('n_queries', n_queries, 'retry_delay', retry_delay / 1000, 'sec. response status', search_query_response.status, search_query_response);
    if (search_query_response.status == 202) {
      // Wait for some delay before querying again search api
      await new Promise((resolve) => setTimeout(resolve, retry_delay));
      retry_delay *= 2;
    } else {
      search_results_raw = await search_query_response.json();
      n_queries = max_query_count;
    }
  }

  if (search_results_raw) {
    const search_results_json = format_skywatch_results(search_results_raw, search_settings);
    log('SKYWATCH PAYLOAD: \n', skywatch_payload, '\nRAW SKYWATCH search results: \n', search_results_raw, '\nJSON SKYWATCH search results: \n', search_results_json);
    return { search_results_json };
  }

  // Return Empty Feature Collection if search requests timed-out after all retries, and notice user via snackbar
  console.log('Returning empty FeatureCollection');
  if (setters.setSnackbarOptions) {
    setters.setSnackbarOptions({
      open: false,
      message: '',
    });
    setters.setSnackbarOptions({
      open: true,
      message: `Search Results Request timed-out on Skywatch after ${n_queries} tries and final delay of ${retry_delay / 1000}s`,
    });
  }
  return {
    search_results_json: {
      features: [],
      type: 'FeatureCollection',
    },
  };
};

const format_skywatch_results = (skywatch_results_raw, search_settings) => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  return {
    type: 'FeatureCollection',
    features: skywatch_results_raw.data
      // .filter(r => r.result_cloud_cover_percentage <= search_settings.cloudCoverage)
      .map((r) => ({
        geometry: r.location,
        properties: {
          providerPlatform: `${Providers.SKYWATCH}`,
          provider: `${Providers.SKYWATCH}/${r.source}`,
          id: r.product_name,
          skywatch_id: r.id,
          acquisitionDate: r.start_time, // or end_time '2019-03-23T10:24:03.000Z',
          resolution: r.resolution,
          cloudCoverage: r.result_cloud_cover_percentage,
          constellation: `${r.source}`,

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
  };
};

export default search_skywatch;
