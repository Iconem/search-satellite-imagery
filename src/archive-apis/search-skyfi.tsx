// Code for searching UP42 STAC API

import ky from 'ky';
import { Providers } from './search-utilities';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utilities';

import { parse as wkt_parse, stringify as wkt_stringify } from 'wellknown';

/* -------------- */
/*      SKYFI     */
/* -------------- */
// App: https://app.skyfi.com/explore
// POST on https://app.skyfi.com/api/archive-available
// Payload: {"clientType":"DESKTOP","fromDate":"2018-12-31T23:00:00.000Z","toDate":"2023-01-24T10:21:44.465Z","maxCloudCoveragePercent":20,"resolutions":["VERY HIGH","HIGH"],"sensors":["DAY","NIGHT","MULTISPECTRAL"],"imageCropping":{"wktString":"POLYGON((-77.05679665567264 38.899388312735795,-77.02040942302703 38.899388312735795,-77.02040942302703 38.92503663542644,-77.05679665567264 38.92503663542644,-77.05679665567264 38.899388312735795))"},"page":0,"pageSize":25}

const skyfi_search_url = 'https://app.skyfi.com/api/archive-available';
const pageSize = 25;
const look_for_next_page = true;
const skyfi_api_key = 'eh6qPPge7f88EJPp';

// Not useful at the moment
const get_skyfi_bearer = async (apikey) => {
  const skyfi_oauth_json = {
    name: '',
    iss: 'https://securetoken.google.com/skyfi-prod',
    aud: 'skyfi-prod',
    auth_time: 1674556045,
    user_id: 'bqZ0B6WZPihZ6jwnjC0nnFu2qKI2',
    sub: 'bqZ0B6WZPihZ6jwnjC0nnFu2qKI2',
    iat: 1674559757,
    exp: 1674563357,
    email: '',
    email_verified: false,
    firebase: {
      identities: {
        email: [''],
      },
      sign_in_provider: 'password',
    },
  };
  const skyfi_bearer_json = `Bearer ${skyfi_oauth_json.access_token}`;
  return skyfi_bearer_json;
};

const search_skyfi = async (search_settings, skyfi_apikey, searchPolygon = null, setters = null, pageIdx = 0) => {
  const resolution_array = [];
  if (search_settings.gsd.min <= 0.5) resolution_array.push('VERY HIGH');
  if ((search_settings.gsd.min <= 0.5 && search_settings.gsd.max >= 0.5) || (search_settings.gsd.min <= 1 && search_settings.gsd.max >= 1)) resolution_array.push('HIGH');
  if ((search_settings.gsd.min <= 1 && search_settings.gsd.max >= 1) || (search_settings.gsd.min <= 5 && search_settings.gsd.max >= 5)) resolution_array.push('MEDIUM');

  // const coordinates_wkt = "POLYGON((-77.05679665567264 38.899388312735795,-77.02040942302703 38.899388312735795,-77.02040942302703 38.92503663542644,-77.05679665567264 38.92503663542644,-77.05679665567264 38.899388312735795))"
  const coordinates_wkt = wkt_stringify(searchPolygon);

  // Up42 hosts listing
  const skyfi_payload = {
    fromDate: search_settings.startDate.toISOString(), // "2018-12-31T23:00:00.000Z",
    toDate: search_settings.endDate.toISOString(), // "2023-01-24T10:21:44.465Z",
    maxCloudCoveragePercent: search_settings.cloudCoverage,
    resolutions: resolution_array,
    clientType: 'DESKTOP',
    sensors: ['DAY', 'NIGHT', 'MULTISPECTRAL'],
    imageCropping: {
      wktString: coordinates_wkt,
    },
    page: pageIdx,
    pageSize,
  };
  log('skyfi PAYLOAD: \n', skyfi_payload);

  const skyfi_results_raw = await ky
    .post(skyfi_search_url, {
      headers: {
        'skyfi-api-key': skyfi_api_key,
        'content-length': `${JSON.stringify(skyfi_payload).length}`,
        // 'Authorization': skyfi_bearer_json,
      },
      json: skyfi_payload,
    })
    .json();
  log(`FOUND ${(skyfi_results_raw as any).numReturnedArchives}/${(skyfi_results_raw as any).numTotalArchives}, 'skyfi skyfi_results_raw: \n', skyfi_results_raw, `);

  const search_results_json = format_skyfi_results(skyfi_results_raw, searchPolygon);
  log('skyfi PAYLOAD: \n', skyfi_payload, '\nRAW skyfi search results: \n', skyfi_results_raw, '\nJSON skyfi search results: \n', search_results_json);

  if (look_for_next_page && (skyfi_results_raw as any).numTotalArchives > pageSize * pageIdx) {
    const nextResults = await search_skyfi(search_settings, skyfi_apikey, searchPolygon, setters, pageIdx + 1);
    // Looking for next results
    search_results_json?.features.push(...nextResults?.search_results_json?.features);
  }

  return {
    search_results_json,
  };
};

// parse('POINT(1 2)');

const format_skyfi_results = (skyfi_results_raw, searchPolygon) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: skyfi_results_raw.archives.map((feature) => {
      const feat = {
        geometry: wkt_parse(feature.footprint),
        // "footprint": "POLYGON ((-77.2127 39.0983,-76.9662 39.0562,-77.0204 38.8647,-77.2663 38.9068,-77.2127 39.0983))",
        // "sw": { "lat": 38.8647, "lon": -77.2663 }, "ne": { "lat": 39.0983, "lon": -76.9662},
        properties: {
          // ...feature.properties,
          id: feature.archiveId ?? uuidv4(),
          sceneId: feature.archiveId ?? uuidv4(),
          providerPlatform: `${Providers.SKYFI}`,
          provider: `${Providers.SKYFI}/${feature.provider}-${feature.name}`,
          resolution: feature.platformResolution / 100,
          acquisitionDate: new Date(feature.date).toISOString(), // "2022-11-26T14:49:32+00:00"
          cloudCoverage: feature.cloudCoveragePercent,
          price: feature.totalPrice,
          providerProperties: {
            azimuthAngle: feature.offNadirAngle,
            preview_uri_tiles: {
              url: feature.previewUrl,
              // 'scheme': 'tms',
              // minzoom : 0,
              // maxzoom : 20,
              sensor_day_night_ms: feature.sensor,
            },
          },
          preview_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null, // feature.previewUrl, // feature.thumbnailBase64,
          thumbnail_uri: Object.values(feature?.thumbnailUrls)?.at(-1) || null, // "thumbnailUrls": { "300x300": 'url'}

          constellation: `${feature.provider}/${feature.name}`,
          providerName: feature.providerName,
          shapeIntersection: null,
          raw_result_properties: feature,
        },
        type: 'Feature',
      };
      return feat;
    }),
    type: 'FeatureCollection',
  };
};

const a = {
  provider: 'JILIN',
  name: 'DailyVision',
  sensor: 'DAY',
};

export default search_skyfi;
