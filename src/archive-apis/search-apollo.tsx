// Code for searching APOLLO MAPPING API

import ky from 'ky';
import { Providers, max_abs, filter_features_with_search_params } from './search-utilities';
import { v4 as uuidv4 } from 'uuid';
import bboxPolygon from '@turf/bbox-polygon';
import { log } from '../utilities';

// https://imagehunter.apollomapping.com/

const APOLLO_API_URL = 'https://imagehunter-api.apollomapping.com';
const APOLLO_DOMAIN = 'https://imagehunter.apollomapping.com';

const search_apollo = async (search_settings, apollo_apikey, searchPolygon = null, setters = null) => {
  const apollo_payload = {
    startDate: search_settings.startDate.toISOString().substring(0, 19), // '1970-01-01T12:00:00',
    endDate: search_settings.endDate.toISOString().substring(0, 19),
    coords: JSON.stringify(searchPolygon.geometry.coordinates[0]), // [[2.3299598693847656,48.8607622103356],[2.35107421875,48.867763659652354],[2.366352081298828,48.851500724507346],[2.3411178588867188,48.844384028766385],[2.322235107421875,48.8539856815748],[2.322235107421875,48.8539856815748]],

    cloudcover_max: search_settings.cloudCoverage,
    offnadir_max: max_abs(search_settings.offNadirAngle),
    resolution_min: search_settings.gsd.min,
    resolution_max: search_settings.gsd.max,

    lazyLoad: false,
    satellites: JSON.stringify(['HEX', 'EB', 'FS2', 'FS5', 'GS2', 'GF1H', 'GF2', 'GE1', 'BSG', 'IK', 'J14', 'J15', 'J1V', 'K2', 'K3', 'K3A', , 'KZ1', 'OVS1', 'OVS23', 'PNEO', 'P1', 'QB', 'SP6', 'SKYC', 'SV1', 'TeL', 'TS', 'WV1', 'WV2', 'WV3', 'WV4']),
    dem: false,
    stereo: false,
    seasonal: false,
  };
  const apollo_payload_body = new URLSearchParams(apollo_payload as any).toString();
  // Better have a look at maxar payload construction

  // WIP, returns 401 unauthorized because origin and referer headers are overwritten on post
  // return {
  //   search_results_json: {
  //     'features': [],
  //     type: 'FeatureCollection'
  //   }
  // }

  // Returns 401 Unauthorized probably because request is actually sent to http non-sll server url because dev server has no tls and origin and referer are overwritten by browser to localhost
  // Tried using a CORS proxy, with no luck like [cors-anywhere](https://github.com/Rob--W/cors-anywhere/#documentation) public one or [allorigins](https://allorigins.win/) or any recent one listed [here](https://nordicapis.com/10-free-to-use-cors-proxies/)

  // const requestOptions = {headers: { 'Host': APOLLO_DOMAIN,  'Origin': APOLLO_DOMAIN,  'Referer': APOLLO_DOMAIN, }, method: 'POST'};
  // let apolloRequest = new Request(APOLLO_SEARCH_URL, requestOptions);
  const apolloRequest = `${APOLLO_API_URL}/ajax/search`;
  // let apolloRequest = 'https://api.allorigins.win/get?url=https%3A%2F%2Freqres.in%2Fapi%2Fusers'
  // let apolloRequest = 'https://test.cors.workers.dev/?https%3A%2F%2Freqres.in%2Fapi%2Fusers'
  // apolloRequest = 'http://localhost:8010/proxy/ajax/search'
  // let apolloRequest = `https://api.allorigins.win/post?url=${encodeURIComponent(APOLLO_SEARCH_URL)}`
  const test_payload = {
    name: 'morpheudezetterz',
    job: 'letrezterzder',
  };

  const apollo_results_raw = await ky
    .post(apolloRequest, {
      headers: {
        Host: APOLLO_DOMAIN,
        Origin: APOLLO_DOMAIN,
        Referer: APOLLO_DOMAIN,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': `${apollo_payload_body.length}`,
        // 'Content-Length': '867'
      },
      body: apollo_payload_body, // test_payload, apollo_payload, fake_payload
    })
    .json();

  const search_results_json = format_apollo_results(apollo_results_raw);
  log('apollo PAYLOAD: \n', apollo_payload.toString(), '\nRAW apollo search results: \n', apollo_results_raw, '\nJSON apollo search results: \n', search_results_json);

  // Filter out unwanted features before searching previews
  search_results_json.features = search_results_json.features.filter((f) => filter_features_with_search_params(f, searchPolygon));

  // CAUTION This is heavy on request as it does one per image to preview
  // A better way could be to add a callback on hover in datagrid if preview does not exist to retrieve its url
  // Initiate search for previews/thumbnails
  get_apollo_previews_async(search_results_json).then((results) => {
    if (setters) {
      const searchResults = {
        input: searchPolygon,
        output: results,
      };
      // console.log('APOLLO search previews have been retrieved, setting react state')
      // setters.setSearchResults(searchResults)
    }
  });

  return {
    search_results_json,
  };
};

const format_apollo_results = (apollo_results_raw) => {
  return {
    features: apollo_results_raw.results.map((r) => {
      // slice(900, 1100)
      return {
        geometry: bboxPolygon([r.bottomright.x, r.bottomright.y, r.topleft.x, r.topleft.y]).geometry,
        properties: {
          id: r.objectid ?? uuidv4(), // or orderingID
          price: null,
          providerPlatform: `${Providers.APOLLO}`,
          provider: `${Providers.APOLLO}/${r.collection_vehicle_short}`,

          resolution: r.js_resolution, // or interpret resolution : "2.0 m"

          acquisitionDate: new Date((r.js_date || r.collection_date) + ' ' + (!r.acq_time || r.acq_time.includes('None') ? '' : r.acq_time)).toISOString(), // "10-16-2021" or js_date "October 16, 2021"/"10-16-2021"     acq_time : "21:36:00 UTC"
          cloudCoverage: r.cloud_cover_percent,
          shapeIntersection: null, // TODO
          providerProperties: {
            satelliteShortName: r.collection_vehicle_short,
            azimuthAngle: r.azimuth_angle, // and target_az
            incidenceAngle: r.offnadir,
            illuminationAzimuthAngle: r.sun_az,
            illuminationElevationAngle: r.sun_elev,
          },
          raw_result_properties: r,
          preview_uri: null, // r.preview_url,
          thumbnail_uri: null, // r.preview_url,
        },
        type: 'Feature',
      };
    }),
    type: 'FeatureCollection',
  };
};

const timer = async (ms) => await new Promise((res) => setTimeout(res, ms));

const get_apollo_previews_async = async (apollo_results) => {
  const chunkSize = 10;
  // Send batches of chunkSize POST requests to ApolloMapping API server
  for (let i = 0; i < apollo_results.features.length; i += chunkSize) {
    const chunk = apollo_results.features.slice(i, i + chunkSize);
    const errors = [];
    // Await all promises of chunk fetching
    await Promise.all(
      chunk.map(async (feature) => {
        const preview_payload = {
          catid: feature.properties.id,
          satellite: 'scene',
          satelliteShortName: feature.properties.providerProperties.satelliteShortName,
          isRefresh: false,
          forceHighestQuality: false, // Todo: test true
        };
        const preview_payload_body = new URLSearchParams(preview_payload as any).toString();
        // console.log('Fetching preview via ky.post for ', feature.properties.id)
        // console.log('REQUESTING APOLLO PREVIEW', preview_payload.catid, preview_payload, preview_url_object, feature.properties.thumbnail_uri)
        await ky
          .post(`${APOLLO_API_URL}/ajax/get_preview_image`, {
            headers: {
              Host: APOLLO_DOMAIN,
              Origin: APOLLO_DOMAIN,
              Referer: APOLLO_DOMAIN,
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'Content-Length': `${preview_payload_body.length}`,
            },
            body: preview_payload_body,
            timeout: 30000,
          })
          .json()
          .then((preview_url_object) => {
            // console.log('ApolloMapping, found preview ', preview_url_object)
            feature.properties.thumbnail_uri = APOLLO_API_URL + (preview_url_object as any).path;
            feature.properties.preview_uri = feature.properties.thumbnail_uri;
          })
          .catch((error) => {
            errors.push('Error during ky post request to get Apollo preview image');
          });
      })
    );

    if (errors.length > 0) {
      log(`ApolloMapping Previews fetch - Catched error during chunk previews fetch for loop ${i}, so break master loop by return`);
      throw new Error(`ApolloMapping Previews fetch - Catched error during chunk previews fetch for loop ${i}, so break master loop by return`);
      // throw new Error(errors.join());
      // return
    }
    await timer(3000);
  }
};

export default search_apollo;
