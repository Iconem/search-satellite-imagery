// Code for searching EOS API

import ky from 'ky';
import { get_constellation_name, get_satellites_respecting_gsd, eos_constellation_dict, eos_names, Providers } from './search-utilities';
import { log } from '../utilities';

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

const eos_limit = 100;
const eos_timeout_ms = 20_000;

// let eos_search_highres_url = 'https://api.eos.com/api/v5/allsensors'
const eos_search_highres_url = 'https://lms-reselling.eos.com/api/v5/allsensors';
const search_eos_highres = async (search_settings, eos_apikey, searchPolygon = null, setters = null, eos_page_idx = 1) => {
  if (eos_apikey === '') {
    eos_apikey = process.env.EOS_APIKEY;
  }
  const satellites = get_satellites_respecting_gsd(search_settings.gsd);
  const eos_satellites = satellites.map((s) => eos_names[s]).filter((s) => s);

  // console.log('eos satellites', eos_satellites)
  const eos_payload_highres = {
    search: {
      satellites: eos_satellites,
      // [
      //   'KOMPSAT-2', 'KOMPSAT-3A', 'KOMPSAT-3', 'SuperView 1A', 'SuperView 1B', 'SuperView 1C', 'SuperView 1D', 'Gaofen 1', 'Gaofen 2', 'Ziyuan-3', 'TripleSat Constellation-1', 'TripleSat Constellation-2', 'TripleSat Constellation-3'
      // ],
      shape: {
        type: 'Polygon',
        coordinates: search_settings.coordinates,
      },
      date: {
        from: search_settings.startDate.toISOString().substring(0, 10), // YYYY-MM-DD date format
        to: search_settings.endDate.toISOString().substring(0, 10),
      },
      cloudCoverage: {
        from: 0,
        to: search_settings.cloudCoverage,
      },
      sunElevation: {
        from: search_settings.sunElevation[0],
        to: search_settings.sunElevation[1],
      },
      shapeIntersection: {
        from: search_settings.aoiCoverage,
        to: 100,
      },
    },
    sort: [{ field: 'date', order: 'desc' }],
    page: eos_page_idx,
    limit: eos_limit,
  };

  try {
    const search_results_raw = await ky
      .post(
        eos_search_highres_url, // + `?api_key=${eos_apikey}`,
        {
          // headers: { 'Authorization': `ApiKey ${eos_apikey}` },
          json: eos_payload_highres,
          timeout: eos_timeout_ms,
        }
      )
      .json();

    const search_results_json = format_eos_results(search_results_raw);
    log('EOS PAYLOAD: \n', eos_payload_highres, '\nRAW EOS search results raw: \n', search_results_raw, '\nJSON EOS search results: \n', search_results_json);
    return { search_results_json };
  } catch (error) {
    // if (error.name === 'AbortError') {
    console.log('Returning empty FeatureCollection, probably because of timeout', error);
    if (setters.setSnackbarOptions) {
      setters.setSnackbarOptions({
        open: false,
        message: '',
      });
      setters.setSnackbarOptions({
        open: true,
        message: `Search Results Request timed-out on EOS API after ${eos_timeout_ms / 1000}s`,
      });
    }
    return {
      search_results_json: {
        features: [],
        type: 'FeatureCollection',
      },
    };
  }
};

const format_eos_results = (eos_results_raw) => {
  // meta':{'limit':1,'page':1,'found':15},
  return {
    features: eos_results_raw.results.map((r) => ({
      geometry: r.dataGeometry,
      properties: {
        providerPlatform: `${Providers.EOS}`,
        provider: `${Providers.EOS}/${r.satellite}`,
        id: r.sceneID,
        acquisitionDate: new Date(r.date).toISOString(), // '2019-03-23T10:24:03.000Z',
        resolution: parseFloat(r.resolution?.replace(' m/pxl', '') ?? '0'), // '1.5 m/pxl'
        cloudCoverage: r.cloudCoverage,
        constellation: get_constellation_name(r.satellite, eos_constellation_dict),
        // 'constellation': r.satellite in eos_constellation_dict ? eos_constellation_dict[r.satellite].constellation : r.satellite,

        // 'constellation': eos_constellation_dict[r.satellite]?.constellation || r.satellite,

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
  };
};

/* -------------- */
/*   EOS LOWRES   */
/* -------------- */
const eos_search_lowres_url = 'https://gate.eos.com/api/lms/search/v2';
const search_eos_lowres = async (search_settings, eos_apikey, eos_page_idx = 1) => {
  const eos_payload_lowres = {
    fields: ['sunElevation', 'cloudCoverage', 'sceneID', 'date', 'path', 'storedInCollection', 'productID', 'sensor', 'row', 'dataCoveragePercentage'],
    limit: eos_limit,
    page: eos_page_idx,
    search: {
      satellites: ['sentinel2', 'landsat8', 'naip'], // , 'modis', 'cbers4', 'sentinel1', 'landsat7', 'landsat5', 'landsat4'],
      // 'date': {'from': '2019-08-01', 'to': '2020-06-01'},
      date: { from: search_settings.startDate.toISOString().substring(0, 10), to: search_settings.endDate.toISOString().substring(0, 10) },
      cloudCoverage: { from: 0, to: search_settings.cloudCoverage },
      sunElevation: { from: search_settings.sunElevation[0], to: search_settings.sunElevation[1] },
      shape: {
        type: 'Polygon',
        coordinates: search_settings.coordinates,
      },
    },
  };

  const search_results_json = await ky
    .post(eos_search_lowres_url + `?api_key=${eos_apikey}`, {
      json: eos_payload_lowres,
    })
    .json();
  log('EOS PAYLOAD: \n', eos_payload_lowres, '`n', 'EOS search results: \n', search_results_json);
  return {
    search_results_json,
  };
};

export default search_eos_highres;
