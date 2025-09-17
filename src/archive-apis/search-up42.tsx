// Code for searching UP42 STAC API

import ky from 'ky'
import { getImageryPrice, up42ConstellationDict, providersDict, Providers, up42ProducersNames, processInChunks } from './search-utilities'
import { v4 as uuidv4 } from 'uuid'
import { log } from '../utilities'

/* -------------- */
/*      UP42      */
/* -------------- */
// UP 42 API: Producer (operates the satellite) | Hosts (image provider offering access) | Collections
// UP42 is actually a STAC endpoint search api
// https://docs.up42.com/developers/api#operation/getDataProducts
// CORS needed to reach UP42 api server
// UP42: Project ID and Project API Key that are found in the section Developers on the console. https://console.up42.com/ in the form of https://console.up42.com/projects/UUID-xxxx/developers

// TODO: Catalog search is deprecated, now requires host_name, search per host:
// https://docs.up42.com/developers/api#operation/searchByHost
// GET on https://api.up42.com/hosts results in json data
// host among [nearspacelabs, 21at, oneatlas, airbus, capellaspace, iceye, spectra, airbus, intermap]
// https://api.up42.com/catalog/hosts/${hostname}/stac/search

const UP42_LIMIT = 100 // can be 500
const lookForNextPage = true
const UP42_TIMEOUT_MS = 20_000
const producerList = providersDict[Providers.UP42].map((constellation) => up42ProducersNames[constellation])
const useDeprecatedApi = false
const excludeHosts = ['airbus-elevation', 'intermap', 'airbus'] // 'hexagon', 'head-aerospace', 'satellogic', 'iceye', 'spectra']
// Worlddem from Airbus, Intermap Nextmap are DEMs, airbus is not needed since host oneatlas returns pleiades+neo

/*
https://api.up42.com/catalog/oneatlas/image/cccc4352-ed18-433e-b18d-0b132af3face/thumbnail
https://api.up42.com/catalog/oneatlas/image/fd7500c9-6ea2-48e8-8561-69bed4f30eef/quicklook

previewType = ['thumbnail', 'quicklook']
// `https://api.up42.com/catalog/oneatlas/image/${f.properties.sceneId}/${previewType}`
with authorization: Bearer ...
returns a base64 image  
*/

const UP42_SEARCH_URL = 'https://api.up42.com/catalog/stac/search'

const getUp42Bearer = async (
  email?: string,
  password?: string,
  setters?: Record<string, (...args: any[]) => void>
): Promise<string> => {
  const username = email && email.trim() !== "" ? email : process.env.REACT_APP_UP42_ACCOUNT_EMAIL;
  const pwd = password && password.trim() !== "" ? password : process.env.REACT_APP_UP42_ACCOUNT_PASSWORD;
  const formData = new URLSearchParams();
  if (!username || !pwd) {
    throw new Error("Missing credentials: email or password is undefined");
  }
  formData.append("username", username);
  formData.append("password", pwd);
  formData.append('grant_type', 'password');
  formData.append('client_id', 'up42-api');

  try {
    const up42OauthJson = await ky
      .post('https://auth.up42.com/realms/public/protocol/openid-connect/token', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })
      .json();

    const up42BearerJson = `Bearer ${(up42OauthJson as any).access_token}`;
    return up42BearerJson;
  } catch (err: any) {
    setters?.setLoadingResults(false)
    setters?.setSnackbarOptions({
      open: true,
      message: 'WARNING! Failed to authenticate with UP42. Please check email/password or API keys.',
    })
    console.error("Failed to authenticate UP42", err);
    return "";
  }
};

function getUp42Price(feature): number | null {
  return getImageryPrice(feature, feature.properties.constellation, up42ConstellationDict)
}

const getDataCollections = async (up42BearerJson: string | null = null, email: string, password: string, setters): Promise<any> => {
  if (!up42BearerJson) {
    up42BearerJson = await getUp42Bearer(email, password, setters)
  }
  const collectionsReq = await ky
    .get('https://api.up42.com/v2/collections', {
      headers: { Authorization: up42BearerJson },
      searchParams: {
        type: 'ARCHIVE',
        size: '50',
      }
    })
    .json()

  const collectionsList = (collectionsReq as any).content
  const collectionsListFiltered = collectionsList.filter(
    (c) => c.metadata?.productType === 'OPTICAL'
  );


  return collectionsListFiltered
}

// Get data products, filter OPTICAL + ARCHIVE, and then get all providers that have this
//METHODE1
// https://api.up42.com/v2/providers?size=100  
//METHODE2
// https://api.up42.com/v2/data-products?size=300&includeHidden=true 
// f = data_products.content.filter(o => o.collection.type == 'ARCHIVE').filter(o => o.collection?.metadata?.productType == 'OPTICAL')
// (new Set(f.map(o => o.collection?.providers.map(p => p.name || "")).flat()))
//METHODE3

// https://api.up42.com/v2/collections?type=ARCHIVE&integrations=SEARCH_AVAILABLE&size=100
// new Set(collections.content.filter(c => c.metadata.productType == 'OPTICAL').map(c => c.providers.map(p => p.name)).flat())


async function searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson): Promise<any> {
  if (lookForNextPage) {
    const up42NextLinks = up42ResultsRaw.links ?? []
    const up42NextHref = up42NextLinks.find((l) => l.rel === 'next')?.href
    if (up42NextHref) {
      const nextResults = await searchUp42(searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson, up42NextHref)

      up42ResultsRaw?.features.push(...nextResults?.searchResultsJson?.features)
    }
  }
  return up42ResultsRaw
}
// Up42 hosts listing
let hostsList = []
const searchUp42 = async (searchSettings, up42Apikey, searchPolygon = null, setters = null, up42BearerJson: string | null = null, nextUrl = ''): Promise<any> => {

  if (!up42BearerJson) {
    try {
      up42BearerJson = await getUp42Bearer(up42Apikey.up42Email, up42Apikey.up42Password, setters)
    } catch (error) {
      const errorStr = 'Could not get UP42 Auth token, probably because you did not use the Allow-CORS plugin '
      setTimeout(
        () =>
          setters.setSnackbarOptions({
            open: true,
            message: errorStr,
          }),
        5000
      )
      console.log('Use this Allow-CORS plugins for example, \nChrome: https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf \nFirefox: https://addons.mozilla.org/en-US/firefox/addon/access-control-allow-origin/')
      throw new Error(errorStr)
    }
  }

  const up42Payload = {
    datetime: `${searchSettings.startDate.toISOString() as string}/${searchSettings.endDate.toISOString() as string}`,
    intersects: {
      type: 'Polygon',
      coordinates: searchSettings.coordinates,
    },
    limit: UP42_LIMIT,
    query: {
      cloudCoverage: {
        lte: searchSettings.cloudCoverage,
      },
      resolution: {
        gte: searchSettings.gsd.min,
        lte: searchSettings.gsd.max,
      },
    },
  }
  let up42ResultsRaw
  if (useDeprecatedApi || nextUrl !== '') {
    const up42SearchUrl = nextUrl !== '' ? nextUrl : UP42_SEARCH_URL
    up42ResultsRaw = await ky
      .post(up42SearchUrl, {
        headers: { Authorization: up42BearerJson },
        json: up42Payload,
      })
      .json()

    await searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson)
  } else {

    hostsList = await getDataCollections(up42BearerJson, up42Apikey.up42Email, up42Apikey.up42Password, setters)

    const searchPromises = Object.fromEntries(
      // build a dict from a dict via an array of key-value pairs
      hostsList.map((host) => {
        const payloadForThisHost = {
          ...up42Payload,
          collections: [host.name],    // to add a collection field
        };
        const hostname: string = host.providers[0].name
        return [
          hostname,
          {
            promise: new Promise(async (resolve, reject) => {
              const up42SearchHostUrl = `https://api.up42.com/catalog/hosts/${hostname}/stac/search`
              try {
                const up42ResultsRaw = (await ky
                  .post(up42SearchHostUrl, {
                    headers: { Authorization: up42BearerJson },
                    json: payloadForThisHost,
                    timeout: UP42_TIMEOUT_MS,
                  })
                  .json()) as any
                log(`Host ${hostname} results: `, up42ResultsRaw)
                // Should update up42ResultsRaw.features
                // await searchForNextPage(up42ResultsRaw, searchSettings, up42Apikey, searchPolygon, setters, up42BearerJson)
                resolve({
                  hostname,
                  ...up42ResultsRaw
                });
              } catch (error) {
                let errorMsg = `Error on ky post for host ${hostname}: ${error.toString()}`
                try {
                  const errorJson = await error.response?.json();
                  if (errorJson?.error?.message) {
                    errorMsg = `Host ${hostname}: ${errorJson.error.message}`;
                  }
                } catch (_) { }
                resolve({ __error: errorMsg });
              }
            }),
          },
        ]
      })
    )

    await Promise.allSettled(Object.values(searchPromises).map((o) => o.promise))
      .then((results) => {
        log('\nFinished UP42 requests for all hosts promises\n', results)
        const requestsFeaturesFlat = results
          .filter((r) => r.status == 'fulfilled' && r.value?.features)
          .map(res => res.value.features.map(f => ({ ...f, hostname: res.value.hostname })))
          .flat()
        up42ResultsRaw = {
          features: requestsFeaturesFlat,
        }
        log('results_flat', up42ResultsRaw)

        results
          .filter(r => r.status === "fulfilled" && r?.value?.__error)
          .forEach(r => log('Handled error for user:', r?.value?.__error));

        return up42ResultsRaw
      })
      .catch((error) => {
        log('Error on promise', error)
      })
  }

  // TODO: TEST next
  const searchResultsJson = formatUp42Results(up42ResultsRaw, searchPolygon)
  if (setters) setters.setSearchResults(searchResultsJson)
  log('UP42 PAYLOAD: \n', up42Payload, '\nRAW UP42 search results: \n', up42ResultsRaw, '\nJSON UP42 search results: \n', searchResultsJson)



  // Initiate search for previews/thumbnails
  getUp42PreviewsAsync(searchResultsJson, up42BearerJson, 5, setters, searchPolygon);

  getUp42PricesAsync(searchResultsJson, up42BearerJson, 5, setters, searchPolygon);

  return {
    searchResultsJson,
    up42BearerJson,
  }
}

const getUp42PreviewUrls = (feature, up42BearerJson): any => {
  const previewUrls = {
    up42BearerJson,
    preview_uri: `https://api.up42.com/catalog/${feature.properties.providerName as string}/image/${feature.properties.id as string}/quicklook`,
    thumbnail_uri: `https://api.up42.com/catalog/${feature.properties.providerName as string}/image/${feature.properties.id as string}/thumbnail`,
  }
  return previewUrls
}
async function getUp42PreviewsAsync(up42Results, up42BearerJson, chunkSize, setters, searchPolygon) {
  await processInChunks(
    async (feature: any) => {
      if (!feature || !feature.properties) return;

      try {
        const previewUrls = getUp42PreviewUrls(feature, up42BearerJson);

        const [thumbBlob, previewBlob] = await Promise.all([
          ky.get(previewUrls.thumbnail_uri, {
            headers: { Authorization: up42BearerJson },
            timeout: 3000,
            retry: 2
          }).blob(),
          ky.get(previewUrls.preview_uri, {
            headers: { Authorization: up42BearerJson },
            timeout: 3000,
            retry: 2
          }).blob()
        ]);

        feature.properties.thumbnail_uri = URL.createObjectURL(thumbBlob);
        feature.properties.preview_uri = URL.createObjectURL(previewBlob);
      } catch (err) {
        if (err.name === 'TimeoutError') {
          console.warn("Timeout for feature", feature?.properties?.id);
        } else {
          console.warn("Preview failed for feature", feature?.properties?.id, err.message);
        }
      }
    },
    {
      items: up42Results.features || [],
      chunkSize,
      usePromiseAllSettled: true,
      onChunkComplete: () => {
        setters?.setSearchResults({
          input: searchPolygon,
          output: up42Results
        });
      }
    }
  );

  return up42Results;
}



// These blobs would need to be stored on IndexedDB, which has larger storage limitation than localStorage' 5MB
// See this example: https://levelup.gitconnected.com/how-to-use-blob-in-browser-to-cache-ee9577b77daa based on [jakearchibald/idb-keyval](https://github.com/jakearchibald/idb-keyval)

// Docs: https://docs.up42.com/developers/api-archive/api-data-estimation
// Painful, needs one request per item for which we want to estimate pricing
// const ESTIMATE_URL = `https://api.up42.com/workspaces/${process.env.UP42_WORKSPACE_ID as string}/orders/estimate`
const ESTIMATE_URL = `https://api.up42.com/v2/orders/estimate`
const DATA_PRODUCT_AIRBUS_ANALYTICS = '4f1b2f62-98df-4c74-81f4-5dce45deee99'
const DATA_PRODUCT_AIRBUS_DISPLAY = '647780db-5a06-4b61-b525-577a8b68bb54'
const DATA_PRODUCT_21AT_8BIT = '2398d8f5-5f7f-4596-884d-345c0b07af14'
const DATA_PRODUCT_21AT_16BIT = '37c26f4d-f6a9-47c9-ae4d-a095569ab8bc'
const DATA_PRODUCT_CAPELLA_SPACE = '1f2b0d7f-d3e2-4b3d-96b7-e7c184df7952'

const dataProductForFeature = {
  oneatlas: DATA_PRODUCT_AIRBUS_DISPLAY,
  '21at': DATA_PRODUCT_21AT_8BIT,
  capellaspace: DATA_PRODUCT_CAPELLA_SPACE,
}
async function estimateCreditCost(feature, searchPolygon, up42BearerJson, hostsList): Promise<number | null> {
  const collectionName =
    feature.properties.raw_result_properties?.collection ||
    feature.properties.constellation;

  if (!collectionName) {
    console.warn('Collection name not found in feature:', feature);
    return null;
  }

  const matchedCollection = hostsList.find(
    (collection) => collection.name === collectionName
  );

  if (matchedCollection && matchedCollection.providers?.[0].name === 'spectra') {
    return null;
  }

  if (!matchedCollection || !matchedCollection.dataProducts?.[0]?.id) {
    console.warn(`dataProductId not found for collection: ${collectionName}`);
    return null;
  }

  const dataProductId = matchedCollection.dataProducts[0].id;

  const estimatePayload = {
    dataProduct: dataProductId,
    displayName: `Estimate-${feature.properties.providerName}`,
    params: {

    },
    featureCollection: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: searchPolygon.geometry,
          properties: {
            id: feature.properties.id,
          },
        },
      ],
    },
  }

  let response;
  try {
    response = await ky.post(ESTIMATE_URL, {
      headers: {
        Authorization: up42BearerJson,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      json: estimatePayload,
    }).catch((err) => {
      console.error("Ky POST rejected", err);
      throw err;
    });

    const estimateJson: any = await response.json().catch((err) => {
      console.error("Ky JSON rejected", err);
      throw err;
    });

    const price = estimateJson?.results?.[0]?.credits / 100
    return price != null ? price : null;
  } catch (error) {
    console.warn(error);
    return null;
  }

}

const getUp42PricesAsync = async (
  up42Results,
  up42BearerJson,
  chunkSize,
  setters,
  searchPolygon
): Promise<void> => {
  if (!up42Results?.features?.length) return;

  await processInChunks(
    async (feature: any) => {
      try {
        const price = await estimateCreditCost(
          feature,
          searchPolygon,
          up42BearerJson,
          hostsList
        );
        feature.properties.price = price;

      } catch (err) {
        console.warn(err);
        feature.properties.price = null;
      }
    },
    {
      items: up42Results.features,
      chunkSize,
      usePromiseAllSettled: true,
      onChunkComplete: () => {
        if (setters?.setSearchResults) {
          setters.setSearchResults((prev) => {
            if (!prev || !prev.output?.features) return prev;

            const updatedFeatures = prev.output.features.map((feature) => {
              const updated = up42Results.features.find(
                (f) => f.properties.id === feature.properties.id
              );
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  price: updated?.properties?.price,
                },
              };
            });

            return {
              ...prev,
              output: {
                ...prev.output,
                features: updatedFeatures,
              },
            };
          });
        }
      }
    }
  );
};


const formatUp42Results = (up42ResultsRaw, searchPolygon): GeoJSON.FeatureCollection => {
  return {
    features: up42ResultsRaw.features.map((feature) => ({
      geometry: feature.geometry,
      properties: {
        id: feature.properties.sceneId ?? uuidv4(),
        constellation: up42ConstellationDict[feature.properties.constellation]?.constellation || feature.properties.constellation,
        price: null,
        shapeIntersection: null,
        providerPlatform: `${Providers.UP42}`,
        provider: `${Providers.UP42}/${feature.properties.producer as string}-${feature.properties.constellation as string}`,
        providerName: feature.properties.providerName,
        hostname: feature.hostname,
        sceneId: feature.properties.sceneId ?? uuidv4(),
        cloudCoverage: feature.properties.cloudCoverage,
        acquisitionDate: feature.properties.acquisitionDate,
        resolution: feature.properties.resolution,
        providerProperties: feature.properties.providerProperties,
        raw_result_properties: feature.properties,
      },
      type: 'Feature',
    })),
    type: 'FeatureCollection',
  }
}

// utils/up42DataBuilder.js
const extractUp42HostsWithGsd = (collectionsData) => {
  const hostMap = new Map() // Use Map to avoid duplicates and store GSD

  collectionsData.forEach(collection => {
    collection.providers?.forEach(provider => {
      if (provider.roles?.includes('HOST')) {
        const hostTitle = provider.title
        const gsd = collection.metadata?.resolutionValue?.minimum || null
        // Only keep the best (smallest) GSD for each host
        if (!hostMap.has(hostTitle) || hostMap.get(hostTitle).gsd > gsd) {
          hostMap.set(hostTitle, {
            title: hostTitle,
            gsd: gsd,
            satellites: []
          })
        }
      }
    })
  })

  return Array.from(hostMap.values())
}

export { searchUp42, getUp42Bearer, getDataCollections, extractUp42HostsWithGsd } 
