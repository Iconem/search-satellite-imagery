// Code for searching APOLLO MAPPING API

import ky from 'ky'
import { Providers, maxAbs, filterFeaturesWithSearchParams, processInChunks, ComputeSha256Hash } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import bboxPolygon from '@turf/bbox-polygon'
import { log } from '../utilities'

const APOLLO_API_URL = 'https://imagehunter-api.apollomapping.com'
const APOLLO_DOMAIN = 'https://imagehunter.apollomapping.com'

const searchApollo = async (searchSettings, apolloApikey, searchPolygon: any | null = null, setters: any | null = null): Promise<any> => {

  const generateXAuthToken = async (): Promise<string> => {
    const now = new Date();
    const day = now.getUTCDate();
    const hour = now.getUTCHours();
    const secret = "iGsZ1wMw8xERUZrxNPvBt2TlFTFcN3P2";
    const raw = `${day}${hour}${secret}`;
    const hashHex = await ComputeSha256Hash(raw)

    return hashHex;
  }

  const apolloPayload = {
    startDate: searchSettings.startDate.toISOString().substring(0, 19), // '1970-01-01T12:00:00',
    endDate: searchSettings.endDate.toISOString().substring(0, 19),
    coords: JSON.stringify(searchPolygon?.geometry.coordinates[0]), // [[2.3299598693847656,48.8607622103356],[2.35107421875,48.867763659652354],[2.366352081298828,48.851500724507346],[2.3411178588867188,48.844384028766385],[2.322235107421875,48.8539856815748],[2.322235107421875,48.8539856815748]],

    cloudcover_max: searchSettings.cloudCoverage,
    offnadir_max: maxAbs(searchSettings.offNadirAngle),
    resolution_min: searchSettings.gsd.min,
    resolution_max: searchSettings.gsd.max,

    lazyLoad: false,
    satellites: JSON.stringify(['HEX', 'EB', 'FS2', 'FS5', 'GS2', 'GF1H', 'GF2', 'GE1', 'BSG', 'IK', 'J14', 'J15', 'J1V', 'K2', 'K3', 'K3A', 'KZ1', 'OVS1', 'OVS23', 'PNEO', 'P1', 'QB', 'SP6', 'SKYC', 'SV1', 'TeL', 'TS', 'WV1', 'WV2', 'WV3', 'WV4']),
    dem: false,
    stereo: false,
    seasonal: false,
  }

  const apolloPayloadBody = new URLSearchParams(apolloPayload as any).toString()
  // Better have a look at maxar payload construction

  // WIP, returns 401 unauthorized because origin and referer headers are overwritten on post

  // Returns 401 Unauthorized probably because request is actually sent to http non-sll server url because dev server has no tls and origin and referer are overwritten by browser to localhost
  // Tried using a CORS proxy, with no luck like [cors-anywhere](https://github.com/Rob--W/cors-anywhere/#documentation) public one or [allorigins](https://allorigins.win/) or any recent one listed [here](https://nordicapis.com/10-free-to-use-cors-proxies/)

  const apolloRequest = `${APOLLO_API_URL}/ajax/search`
  const token = await generateXAuthToken()
  const apolloResultsRaw = await ky
    .post(apolloRequest, {
      headers: {
        Host: APOLLO_DOMAIN,
        Origin: APOLLO_DOMAIN,
        Referer: APOLLO_DOMAIN,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': `${apolloPayloadBody.length}`,
        "X-Auth-Token": token,
      },
      body: apolloPayloadBody,
    })
    .json()

  const searchResultsJson = formatApolloResults(apolloResultsRaw)
  log('apollo PAYLOAD: \n', JSON.stringify(apolloPayload), '\nRAW apollo search results: \n', apolloResultsRaw, '\nJSON apollo search results: \n', searchResultsJson)

  // Filter out unwanted features before searching previews
  searchResultsJson.features = searchResultsJson.features.filter((f) => filterFeaturesWithSearchParams(f, searchPolygon))

  // CAUTION This is heavy on request as it does one per image to preview
  // A better way could be to add a callback on hover in datagrid if preview does not exist to retrieve its url
  // Initiate search for previews/thumbnails
  // TODO REDO
  void getApolloPreviewsAsync(searchResultsJson, token).then((results) => {
    if (setters) {
      // const searchResults = {
      //   input: searchPolygon,
      //   output: results,
      // }
      // console.log('APOLLO search previews have been retrieved, setting react state')
      // setters.setSearchResults(searchResults)
    }
  })

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
            Host: APOLLO_DOMAIN,
            Origin: APOLLO_DOMAIN,
            Referer: APOLLO_DOMAIN,
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
