// Code for searching UP42, EOS, SkyWatch APIs using api keys env variables

import ky from 'ky';
import {encode as base64_encode} from 'base-64';

/*
SentinelHub cannot get API key with current plan with oauth 2 https://docs.sentinel-hub.com/api/latest/api/overview/authentication/
UP42: Project ID and Project API Key that are found in the section Developers on the console. https://console.up42.com/ in the form of https://console.up42.com/projects/UUID-xxxx/developers
EOS: https://api-connect.eos.com/user-dashboard/ https://doc.eos.com/api/#authorization-api
Skywatch: https://dashboard.skywatch.co/account/profile
*/

const up42_search_url = 'https://api.up42.com/catalog/stac/search'
const up42_limit = 10
const get_up42_bearer = async (up42_apikey) => {
const up42_projectApi = base64_encode(`${up42_apikey.projectId}:${up42_apikey.projectApiKey}`)
const up42_oauth_json = await ky.post(
    `https://api.up42.com/oauth/token`, 
    {
    headers: { 
        'Authorization': `Basic ${up42_projectApi}`,
        'Content-Type': 'application/x-www-form-urlencoded' 
    },
    body: 'grant_type=client_credentials'
    }
).json();

const up42_bearer_json = `Bearer ${up42_oauth_json['access_token']}`
console.log('up42_bearer_json', {up42_bearer: up42_bearer_json})
return up42_bearer_json
}

// UP 42 API: Producer (operates the satellite) | Hosts (image provider offering access) | Collections
// https://docs.up42.com/developers/api#operation/getDataProducts
// CORS needed to reach UP42 api server

const search_up42 = async (search_settings, up42_apikey, up42_bearer_json=null, up42_next_links=null) => {
if (!up42_bearer_json) {
    up42_bearer_json = await get_up42_bearer(up42_apikey)
}

const up42_payload = {
    // "datetime": "2019-01-01T00:00:00Z/2022-02-01T23:59:59Z",
    "datetime": `${search_settings.startDate.toISOString()}/${search_settings.endDate.toISOString()}`, 
    "intersects": {
    "type": "Polygon",
    "coordinates": search_settings.coordinates
    },
    "limit": up42_limit,
    // "collections": [
    //   "PHR"
    // ],
    "query": {
    "cloudCoverage": {
        "lte": search_settings.cloudCoverage
    },
    "resolution": {
        "gte": search_settings.gsd.min, 
        "lte": search_settings.gsd.max, 
    },
    "up42:usageType": {
        "in": [
        "DATA",
        ]
    },
    "producer": {
        "in": [
        "Airbus",
        "ESA",
        "CAPELLA_SPACE",
        "TWENTY_ONE_AT",
        "NEAR_SPACE_LABS"
        ]
    },
    }
    }
    // TODO: TEST next
    let next_url = ''
    if (up42_next_links) {
    const up42_next_href = up42_next_links.find(l => l.rel == 'next').href
    const up42_next_token = up42_next_href.substring(up42_next_href.lastIndexOf('/'))
    next_url = `?next=${up42_next_token}`
    }

const search_results_json = await ky.post(up42_search_url + next_url, {
    headers: {'Authorization': up42_bearer_json},
    json: up42_payload
}).json();
console.log('UP42 PAYLOAD: \n', up42_payload, '\n', 'UP42 search results: \n', search_results_json)

return {
    search_results_json,
    up42_bearer_json,
}
}

// EOS query wont let you search Pleiades, Head, Kompsat, but only landsat, sentinel, naip etc
const eos_limit = 10
// EOS API HighRes https://doc.eos.com/hires.search.api/#high-resolution-datasets
// EOS API : https://doc.eos.com/search.api/#multi-dataset-search
let eos_search_highres_url = 'https://api.eos.com/api/v5/allsensors' 
eos_search_highres_url = 'https://lms-reselling.eos.com/api/v5/allsensors'
const search_eos_highres = async (search_settings, eos_apikey, eos_page_idx=1) => {
const eos_payload_highres = {
    "search":{
        "satellites":[ 
        //   // "SPOT 5", "SPOT 6", "SPOT 7", 
        //  "Pleiades 1A", "Pleiades 1B", 
        //  "KOMPSAT-2", "KOMPSAT-3", "KOMPSAT-3A", 
        //  "SuperView-1", "SuperView-2", 
        //  // "Gaofen 1", "Gaofen 2", "Ziyuan 3"
        "KOMPSAT-2", "KOMPSAT-3A", "KOMPSAT-3", "SuperView 1A", "SuperView 1B", "SuperView 1C", "SuperView 1D", "Gaofen 1", "Gaofen 2", "Ziyuan-3", "TripleSat Constellation-1", "TripleSat Constellation-2", "TripleSat Constellation-3"
        ],
        "shape":{
        "type":"Polygon",
        "coordinates":search_settings.coordinates
        },
        "date":{
        "from": search_settings.startDate.toISOString().substring(0,10), // YYYY-MM-DD date format
        "to": search_settings.endDate.toISOString().substring(0,10)
        },
        "cloudCoverage":{
        "from": 0,
        "to": search_settings.cloudCoverage
        },
        "sunElevation":{
        "from": search_settings.sunElevation[0],
        "to": search_settings.sunElevation[1]
        },
        "shapeIntersection":{
        "from": search_settings.aoiCoverage,
        "to": 100
        },
    },
    "sort":[{"field":"date", "order": "desc"}],
    "page":eos_page_idx,
    "limit":eos_limit
}

const search_results_json = await ky.post(
    eos_search_highres_url + `?api_key=${eos_apikey}`, 
    {
    headers: {
        'Authorization': `ApiKey ${eos_apikey}`
    }, 
    json: eos_payload_highres
    }
).json();
console.log('EOS PAYLOAD: \n', eos_payload_highres, '\n', 'EOS search results: \n', search_results_json)
return {
    search_results_json,
}
}
const eos_search_lowres_url = 'https://gate.eos.com/api/lms/search/v2'
const search_eos_lowres = async (search_settings, eos_apikey, eos_page_idx=1) => {
const eos_payload_lowres = {
    "fields": [
    "sunElevation", "cloudCoverage", "sceneID", "date", "path", "storedInCollection",
        "productID", "sensor", "row", "dataCoveragePercentage"               
    ],
    "limit": eos_limit,
    "page": eos_page_idx,
    "search": {
    "satellites": ['sentinel2', 'landsat8', 'naip'], // , 'modis', 'cbers4', 'sentinel1', 'landsat7', 'landsat5', 'landsat4'],
    // "date": {"from": "2019-08-01", "to": "2020-06-01"},
    "date": {"from": search_settings.startDate.toISOString().substring(0,10), "to": search_settings.endDate.toISOString().substring(0,10)},
    "cloudCoverage": {"from": 0,"to": search_settings.cloudCoverage},
    "sunElevation": {"from": search_settings.sunElevation[0],"to": search_settings.sunElevation[1]},
    "shape": {
        "type": "Polygon",
        "coordinates": search_settings.coordinates
    }
    }
}

const search_results_json = await ky.post(eos_search_lowres_url + `?api_key=${eos_apikey}`, {
    json: eos_payload_lowres
}).json();
console.log('EOS PAYLOAD: \n', eos_payload_lowres, '`n', 'EOS search results: \n', search_results_json)
return {
    search_results_json,
}
}

const skywatch_search_url = 'https://api.skywatch.co/earthcache/archive/search'
const skywatch_limit = 10
const search_skywatch = async (search_settings, skywatch_apikey) => {
const skywatch_payload = {
    "location": {
    "type": "Polygon",
    "coordinates": search_settings.coordinates,
    // "bbox": [
    //   0,
    //   0,
    //   0,
    //   0
    // ]
    },
    "start_date": search_settings.startDate.toISOString().substring(0,10),
    "end_date": search_settings.endDate.toISOString().substring(0,10),
    "resolution": [
    "low", "medium", "high"
    ],
    "coverage": search_settings.cloudCoverage,
    "interval_length": 0,
    "order_by": [
    "resolution"
    ]
}

const searchId = await ky.post(skywatch_search_url, {
    headers: {
    'x-api-key': skywatch_apikey
    },
    json: skywatch_payload
}).json();

const search_results_json = await ky.get(skywatch_search_url + `/${searchId['data'].id}/search_results`, {
    headers: {
    'x-api-key': skywatch_apikey
    },
}).json();
console.log('SKYWATCH PAYLOAD: \n', skywatch_payload, '\n', 'SKYWATCH search results: \n', searchId, search_results_json)
return {
    search_results_json,
}
}

export {search_up42, search_eos_highres, search_skywatch}