// Code for searching APOLLO MAPPING API
import ky from 'ky'
import { Providers, maxAbs, filterFeaturesWithSearchParams, processInChunks, computeSha256Hash } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import bboxPolygon from '@turf/bbox-polygon'
import { log } from '../utilities'
import CryptoJS from 'crypto-js'

const PROXY_BASE_URL = process.env.PROXY_BASE_URL
const APOLLO_API_URL = `${PROXY_BASE_URL}?url=https://imagehunter-api.apollomapping.com`
const APOLLO_DOMAIN = 'https://imagehunter.apollomapping.com'

// Generate token for requests to Apollo
export const generateXAuthToken = async (): Promise<string> => {
  const now = new Date();
  const day = now.getUTCDate();
  const hour = now.getUTCHours();
  const secret = "iGsZ1wMw8xERUZrxNPvBt2TlFTFcN3P2";
  const raw = `${day}${hour}${secret}`;
  const hashHex = await computeSha256Hash(raw);
  return hashHex;
};

// function to fetch a single preview on demand
export const fetchApolloPreview = async (
  feature: any,
  token: string
): Promise<string | null> => {
  const raw = feature.properties.raw_result_properties;

  const previewPayload = {
    catid: feature.properties.id,
    satellite: raw?.satellite ?? 'scene',
    satelliteShortName: feature.properties.providerProperties.satelliteShortName,
    imageFormat: 'PNG',
    isRefresh: false,
    forceHighestQuality: false,
  };

  const previewPayloadBody = new URLSearchParams(previewPayload as any).toString();

  try {
    //POST to get the path of the preview
    const previewUrlObject: any = await ky
      .post(`${APOLLO_API_URL}/ajax/get_preview_image`, {
        headers: {
          'X-Api-Key': process.env.PROXY_API_KEY,
          'x-custom-origin': APOLLO_DOMAIN,
          'x-custom-referer': APOLLO_DOMAIN,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': `${previewPayloadBody.length}`,
          'x-auth-token': token,
        },
        body: previewPayloadBody,
        timeout: 30000,
      })
      .json();

    if (!previewUrlObject?.path) return null;

    const imgUrl = `https://imagehunter-api.apollomapping.com${previewUrlObject.path}`
    return imgUrl

  } catch (err) {
    console.warn('fetchApolloPreview failed', err);
    return null;
  }
};

const uploadShape = async (coords, token) => {

  const cleanCoords = coords.slice(0, coords.length - 1).reverse();

  const body = new URLSearchParams({
    coords: JSON.stringify(cleanCoords)
  }).toString();

  const res = await ky.post(
    `${APOLLO_API_URL}/ajax/upload/shape`,
    {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
        'x-custom-origin': APOLLO_DOMAIN,
        'x-custom-referer': APOLLO_DOMAIN,
        'X-Auth-Token': token,
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': '*/*',
      },
      body
    }
  ).text();

  return res;
};

const rangeForPermalinkPayload = (start, stop, step) =>
  Array.from(
    { length: Math.ceil((stop - start) / step) },
    (_, i) => start + i * step,
  );


export const createApolloSearchPermalink = async ({
  searchSettings,
  sceneId,
  satellite,
  coords
}: {
  searchSettings: any;
  sceneId: string;
  satellite: string;
  coords: any;
}) => {
  const token = await generateXAuthToken();
  const shape_url = await uploadShape(coords, token);


  const permalikPayload = {
    startDate: searchSettings.startDate.toISOString(),
    endDate: searchSettings.endDate.toISOString(),
    cloudcover_max: searchSettings.cloudCoverage ?? 100,
    offnadir_max: Math.max(
      Math.abs(searchSettings.offNadirAngle?.[0] || 0),
      Math.abs(searchSettings.offNadirAngle?.[1] || 0)
    ),
    resolution_min: searchSettings.gsdIndex?.[0] ?? 0,
    resolution_max: searchSettings.gsdIndex?.[1] ?? 2,
    dateRange: true,
    dateFilter: JSON.stringify([
      {
        startDate: searchSettings.startDate.toISOString(),
        endDate: searchSettings.endDate.toISOString(),
      },
    ]),
    coords: [],
    satellites: JSON.stringify(["BJ3A", "BJ3N", "DSEO", "HEX", "EB", "FS2", "FS5", "GS2", "GF1H", "GF2", "GE1", "BSG", "IK02", "J14", "J15", "J1V", "K2", "K3", "K3A", "KZ1", "LG", "OVS1", "OVS23", "PNEO", "P1", "QB", "SP6", "SKYC", "SVN1", "SVN3", "SV1", "SV2", "TeL", "THS", "TSL", "TST", "TS", "WV1", "WV2", "WV3", "WV4"]),
    pageNum: 0,
    lazyLoad: false,
    dem: false,
    stereo: false,
    seasonal: false,
    monthly: false,
    sar: false,
    persistentScenes: null,
    selectedScenes: [
      {
        id: sceneId,
        satellite: satellite
      }
    ],
    months: rangeForPermalinkPayload(1, 13, 1).join(","),
    years: rangeForPermalinkPayload(1970, new Date().getFullYear() + 1, 1).join(","),
  };

  const body = new URLSearchParams({
    search: JSON.stringify(permalikPayload),
    shape_url: shape_url,
    token: "",
    quote: "false"
  }).toString();

  const resRaw = await ky.post(
    `${APOLLO_API_URL}/ajax/upload/search`,
    {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
        'x-custom-origin': APOLLO_DOMAIN,
        'x-custom-referer': APOLLO_DOMAIN,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Auth-Token': token,
        'accept': '*/*',
      },
      body,
    }
  ).json();

  const fullSearch = await ky.get(
    `${APOLLO_API_URL}/ajax/getsearch/${resRaw?.search_id}`,
    {
      headers: {
        'X-Api-Key': process.env.PROXY_API_KEY,
        'x-custom-origin': APOLLO_DOMAIN,
        'x-custom-referer': APOLLO_DOMAIN,
        'X-Auth-Token': token,
      }
    }
  ).json();
  console.log("FULL SEARCH:", fullSearch);
  console.log("APOLLO RESPONSE:", resRaw);

  return `https://imagehunter.apollomapping.com/search/${resRaw?.search_id}`;
};

function decryptApolloResponse(encryptedData: { data: string }) {
  if (!encryptedData || !encryptedData.data) return null;

  const [ivBase64, ciphertextBase64] = encryptedData.data.split(':');

  const iv = CryptoJS.enc.Base64.parse(ivBase64);
  const ciphertext = CryptoJS.enc.Base64.parse(ciphertextBase64);
  const key = CryptoJS.enc.Utf8.parse('oWyq4TXM8AJqg3mfrLGOrqay4OfHsWT4');

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext },
    key,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);

  return JSON.parse(decrypted);
}

const searchApollo = async (searchSettings, apolloApikey, searchPolygon: any | null = null, setters: any | null = null): Promise<any> => {

  const apolloPayload = {
    startDate: searchSettings.startDate.toISOString().substring(0, 19),
    endDate: searchSettings.endDate.toISOString().substring(0, 19),
    coords: JSON.stringify(searchPolygon?.geometry.coordinates[0]),
    cloudcover_max: searchSettings.cloudCoverage,
    offnadir_max: maxAbs(searchSettings.offNadirAngle),
    resolution_min: searchSettings.gsd.min,
    resolution_max: searchSettings.gsd.max,
    lazyLoad: false,
    satellites: JSON.stringify(["BJ3A", "BJ3N", "DSEO", "HEX", "EB", "FS2", "FS5", "GS2", "GF1H", "GF2", "GE1", "BSG", "IK02", "J14", "J15", "J1V", "K2", "K3", "K3A", "KZ1", "LG", "OVS1", "OVS23", "PNEO", "P1", "QB", "SP6", "SKYC", "SVN1", "SVN3", "SV1", "SV2", "TeL", "THS", "TSL", "TST", "TS", "WV1", "WV2", "WV3", "WV4"]),
    dem: false,
    stereo: false,
    seasonal: false,
    monthly: false,
    sar: false,
    pageNum: 0,
    persistentScenes: JSON.stringify([]),
    dateRange: true,
    dateFilter: JSON.stringify([{
      startDate: searchSettings.startDate.toISOString(),
      endDate: searchSettings.endDate.toISOString()
    }]),
  }
  const apolloPayloadBody = new URLSearchParams(apolloPayload as any).toString()
  const apolloRequest = `${APOLLO_API_URL}/ajax/search`
  const token = await generateXAuthToken()
  const apolloResultsRaw = await ky
    .post(apolloRequest, {
      headers: {
        // Host: APOLLO_DOMAIN,
        'X-Api-Key': process.env.PROXY_API_KEY,
        'x-custom-origin': APOLLO_DOMAIN,
        'x-custom-referer': APOLLO_DOMAIN,
        'accept': '*/*',
        'next-page-store': '{}',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': `${apolloPayloadBody.length}`,
        "X-Auth-Token": token,
      },
      body: apolloPayloadBody,
      timeout: 60000,
    })
    .json()

  const apolloResults = decryptApolloResponse(apolloResultsRaw as { data: string })
  const searchResultsJson = formatApolloResults(apolloResults)
  log('apollo PAYLOAD: \n', JSON.stringify(apolloPayload), '\nRAW apollo search results: \n', apolloResults, '\nJSON apollo search results: \n', searchResultsJson)

  // Filter out unwanted features before searching previews
  searchResultsJson.features = searchResultsJson.features.filter((f) => filterFeaturesWithSearchParams(f, searchPolygon))

  return {
    searchResultsJson,
  }
}

const formatApolloResults = (apolloResultsRaw): GeoJSON.FeatureCollection => {
  return {
    features: apolloResultsRaw.results.map((r) => {
      // slice(900, 1100)
      return {
        geometry: bboxPolygon([r.bottomright.x, r.bottomright.y, r.topleft.x, r.topleft.y]).geometry,
        properties: {
          id: r.objectid ?? uuidv4(), // or orderingID
          price: null,
          providerPlatform: `${Providers.APOLLO}`,
          provider: `${Providers.APOLLO}/${r.collection_vehicle_short as string}`,

          resolution: r.js_resolution, // or interpret resolution : "2.0 m"

          acquisitionDate: new Date(`${(r.js_date || r.collection_date) as string} ${!r.acq_time || r.acq_time.includes('None') ? '' : (r.acq_time as string)}`).toISOString(), // "10-16-2021" or js_date "October 16, 2021"/"10-16-2021"     acq_time : "21:36:00 UTC"
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
      }
    }),
    type: 'FeatureCollection',
  }
}

const timer = async (ms): Promise<any> => await new Promise((resolve) => setTimeout(resolve, ms))
const getApolloPreviewsAsync = async (apolloResults, token): Promise<void> => {
  const errors: string[] = [];

  await processInChunks(
    async (feature: any) => {
      const previewPayload = {
        catid: feature.properties.id,
        satellite: 'scene',
        satelliteShortName: feature.properties.providerProperties.satelliteShortName,
        isRefresh: false,
        forceHighestQuality: false,
      };

      const previewPayloadBody = new URLSearchParams(previewPayload as any).toString();

      await ky
        .post(`${APOLLO_API_URL}/ajax/get_preview_image`, {
          headers: {
            'X-Api-Key': process.env.PROXY_API_KEY,
            'x-custom-origin': APOLLO_DOMAIN,
            'x-custom-referer': APOLLO_DOMAIN,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Content-Length': `${previewPayloadBody.length}`,
            "x-auth-token": token,
          },
          body: previewPayloadBody,
          timeout: 30000,
        })
        .json()
        .then((previewUrlObject) => {
          feature.properties.thumbnail_uri = `${APOLLO_API_URL}${(previewUrlObject as any).path}`;
          feature.properties.preview_uri = feature.properties.thumbnail_uri;
        })
        .catch(() => {
          errors.push('Error during ky post request to get Apollo preview image');
        });
    },
    {
      items: apolloResults.features,
      chunkSize: 10,
      delayBetweenChunks: 500,
      usePromiseAllSettled: false, // Stop on error like original
      onChunkComplete: (chunk, chunkIndex, totalChunks) => {
        if (errors.length > 0) {
          throw new Error(`ApolloMapping Previews fetch - Error during chunk ${chunkIndex}`);
        }
      }
    }
  );
};

export default searchApollo
