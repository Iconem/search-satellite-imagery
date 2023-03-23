// Code for searching Head Aerospace API reverse engineered

import ky from 'ky'
import { getImageryPrice, headConstellationDict, constellationDict, Providers, headSearchNames, providersDict, maxAbs } from './search-utilities'
import { fitBounds } from '@math.gl/web-mercator'
import bbox from '@turf/bbox'
import { log } from '../utilities'

/* ------------------- */
/*    HEAD Aerospace   */
/* ------------------- */
// https://headfinder.head-aerospace.eu/sales
// https://catalyst.earth/catalyst-system-files/help/references/gdb_r/gdb2N127.html
// Note: Head only allow for public retrieve of their catalog past 3 months

const HEAD_LIMIT = 300
const HEAD_BASE_URL = 'https://headfinder.head-aerospace.eu/satcat-db02/'

const HEAD_API_LIMIT = 200
const HEAD_API_BASE_URL = 'https://headfinder.head-aerospace.eu/search-ext-01'
// const headSatellitesSel = '$SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3$'

const unique = (value, index, self): boolean => self.indexOf(value) === index
const _headSatellitesSel =
  '$' +
  providersDict[Providers.HEADAEROSPACE]
    .map((constellation) => constellationDict[constellation].satellites.map((sat) => headSearchNames[sat]))
    .flat()
    .filter(unique)
    .join('$') +
  '$'

const headSatellitesSel = '$SuperView-NEO$Jilin-GF04$GFMM$SuperView-2$SuperView$EarthScanner-KF1$GaoFen-7$Jilin-GXA$DailyVision1m-JLGF3$Jilin-GF02A/B$GaoFen-2$'

// Sat names:
// https://api-01.eoproc.com/cat-01/group-configs/satsel-setup-for-all.js
const headSearchSatSel = ['SuperView', 'EarthScanner-KF1', 'DailyVision1m-JLGF3', 'Jilin-GXA', 'Jilin-GF02A/B', 'GaoFen-2', 'NIGHTVISION / VIDEO', 'SuperView-NEO', 'GFMM', 'NaturEYE 2m', 'ZY-Tri-Stereo', 'HyperScan-GP1/2', 'NaturEYE 16m', 'Jilin-GF04', 'SuperView-2', 'GaoFen-7', 'HiSea-1 Radar']

const headSatellitesSelNew = `$${headSearchSatSel.join('$')}$`

// in https://headfinder.head-aerospace.eu/cat-01/_ML-lib-01.js?2021-12-27
// in https://headfinder.head-aerospace.eu/cat-01/V-073.js?2022-05-11
function crc32(r): any {
  for (var a, o = [], c = 0; c < 256; c++) {
    a = c
    for (let f = 0; f < 8; f++) a = 1 & a ? 3988292384 ^ (a >>> 1) : a >>> 1
    o[c] = a
  }
  for (var n = -1, t = 0; t < r.length; t++) n = (n >>> 8) ^ o[255 & (n ^ r.charCodeAt(t))]
  return (-1 ^ n) >>> 0
}
function getHeadPrice(feature): number | null {
  return getImageryPrice(feature, feature.properties.sensor, headConstellationDict)
}

const defaultHEADSearchParams = {
  // 'category': `search-browser-01`,
  browserfp: `605607837`,
  session: `812167136`,
  searchcnt: `2`,
  mousemovecnt: `818`,
  tilescnt: `861`,
  sessionsecs: `118`,
  catalogue: `PU`,
  catconfigid: `HEAD-wc37`,
}
const searchHead = async (searchSettings, headApiKey: string | undefined = '', searchPolygon = null, setters = null): Promise<any> => {
  if (!headApiKey || headApiKey === '') {
    headApiKey = process.env.HEAD_APIKEY
  }

  const polygonStr = JSON.stringify(searchSettings.coordinates.map((c) => c.slice(0, -1).map((xy) => [xy[1], xy[0]])))
  const polygonCoords = polygonStr.replaceAll('[', '(').replaceAll(']', ')')

  // const headSearchUrl = new URL(HEAD_API_BASE_URL)
  const headSearchParams = new URLSearchParams({
    req: 'd01',
    category: 'searchapi-01',
    user: headApiKey as string,
    aoi: `polygon${polygonCoords}`,
    maxscenes: `${HEAD_API_LIMIT}`, // max indicated is 50
    datestart: `${new Date(searchSettings.startDate - 1).toISOString().substring(0, 10)}`,
    dateend: `${new Date(searchSettings.endDate - 1).toISOString().substring(0, 10)}`,
    cloudmax: `${searchSettings.cloudCoverage as string}`,
    offnadirmax: `${maxAbs(searchSettings.offNadirAngle)}`,
    overlapmin: `${searchSettings.aoiCoverage as string}`,
    scenename: ``,
    satellites: `${headSatellitesSel}&`,
  }) as any

  const decodedSearchParams = decodeURIComponent(headSearchParams)
  const headSearchUrl = `${HEAD_API_BASE_URL}?${decodedSearchParams}`
  // console.log('\n\nHEAD SEARCH URL COMPARISON\n', headSearchUrl, '\n', headSearchUrl_old, '\n\n')

  const result = await processHeadSearch(headSearchUrl, headApiKey, setters)
  return result
}

async function processHeadSearch(headSearchUrl, headApiKey, setters): Promise<any> {
  const resText = await ky.get(headSearchUrl).text()
  if (!resText.includes('ERROR: APP failed')) {
    const payloadStr = resText.substring(resText.indexOf('jsonscenelist=') + 14, resText.lastIndexOf(']') + 1)
    const searchResultsRaw = JSON.parse(payloadStr).slice(1)

    if (searchResultsRaw) {
      const searchResultsJson = formatHeadResults(searchResultsRaw, headApiKey)
      log('HEAD Search URL: \n', headSearchUrl, '\nRAW HEAD search results: \n', searchResultsRaw, '\nJSON HEAD search results: \n', searchResultsJson)
      return { searchResultsJson }
    }
  }
  console.log('Probable failure in HEAD request, ', headSearchUrl, ' with resText', resText, 'probably because search was beyond their 3 most recent months public limitation')
  setters.setSnackbarOptions({
    open: true,
    message: 'Probable failure in HEAD request resulted in error, probably because search was beyond their 3 most recent months public limitation',
  })
  return {
    searchResultsJson: {
      features: [],
      type: 'FeatureCollection',
    },
    errorOnFetch: true,
  }
}

const searchHeadReverseEngineered = async (searchSettings, apikey = '', searchPolygon = null, setters = null): Promise<any> => {
  const polygonStr = JSON.stringify(searchSettings.coordinates.map((c) => c.slice(0, -1).map((xy) => [xy[1], xy[0]])))
  const polygonCoords = polygonStr.replaceAll('[', '(').replaceAll(']', ')')

  // Setup request string for HEAD with hash in get url
  // const request_string = `&category=search-browser-01&browserfp=605607837&session=812167136&searchcnt=2&mousemovecnt=818&tilescnt=861&sessionsecs=118&catalogue=PU&catconfigid=HEAD-wc37&aoi=polygon${polygonCoords}&maxscenes=${HEAD_LIMIT}&datestart=${(new Date(searchSettings.startDate - 1)).toISOString().substring(0,10)}&dateend=${(new Date(searchSettings.endDate - 1)).toISOString().substring(0,10)}&cloudmax=${searchSettings.cloudCoverage}&offnadirmax=${maxAbs(searchSettings.offNadirAngle)}&overlapmin=${searchSettings.aoiCoverage}&scenename=&satellites=${headSatellitesSel}&`
  // const k17string = request_string.substring(request_string.indexOf('category=') + 9).toLowerCase()
  // const headSearchUrl_old = `${HEAD_BASE_URL}?req=d01-nl-${request_string}&user=_${crc32(k17string)}&`

  const searchParams =
    'search-browser-01&' +
    decodeURIComponent(
      new URLSearchParams({
        ...defaultHEADSearchParams,
        aoi: `polygon${polygonCoords}`,
        maxscenes: `${HEAD_LIMIT}`,
        datestart: `${new Date(searchSettings.startDate - 1).toISOString().substring(0, 10)}`,
        dateend: `${new Date(searchSettings.endDate - 1).toISOString().substring(0, 10)}`,
        cloudmax: `${searchSettings.cloudCoverage as string}`,
        offnadirmax: `${maxAbs(searchSettings.offNadirAngle)}`,
        overlapmin: `${searchSettings.aoiCoverage as string}`,
        scenename: ``,
        satellites: `${headSatellitesSel}&`,
      }).toString()
    )
  const userStr = crc32(searchParams.toLowerCase())
  const headSearchUrl = `${HEAD_BASE_URL}?req=d01-nl-&category=${searchParams}&user=_${userStr as string}&`
  // console.log('\n\nHEAD SEARCH URL COMPARISON\n', headSearchUrl, '\n', headSearchUrl_old, '\n\n')

  const result = await processHeadSearch(headSearchUrl, userStr, setters)
  return result
}

// Payload for request for invoice: https://api-01.eoproc.com/api-01/?&-xdebug-step-&category=satcat-make-rq-html

const headTileUrl = (r, tileZoom, tileX, tileY, ext): string => `https://api-02.eoproc.com/cat-02-tiles/?&sat=${r.sensor as string}&scdate=${r.datedir as string}&scid=${tileZoom as string}-${tileX as string}-${tileY as string}-${r.identifier as string}.${ext as string}&OK&`

const getWebmercatorTileIdx = (pt, zoomShift = 0): any => {
  const latRad = (pt.latitude * Math.PI) / 180
  const zoom = Math.ceil(pt.zoom) + zoomShift
  const scale = Math.pow(2, zoom)
  const tileX = Math.floor(scale * (((pt.longitude as number) + 180) / 360))
  const tileY = Math.floor((scale * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2)
  return {
    tileX,
    tileY,
    zoom,
  }
}
const headPreviewUrl = (userStr: string, sceneName: string): string => `https://headfinder.head-aerospace.eu/cat-01-tiles/?req=d01&category=getpreview-jpg-01&user=${userStr}&scenename=${sceneName}`

const getWebmercatorTileCovering = (polygon, zoomShift = 0): any => {
  const bounds = bbox(polygon)
  const [minLng, minLat, maxLng, maxLat] = bounds
  const boundsFit = fitBounds({
    width: 800,
    height: 800,
    bounds: [
      [minLng, minLat], // southwest bound first
      [maxLng, maxLat],
    ],
  })
  const tileIdx = getWebmercatorTileIdx(boundsFit, zoomShift)
  return tileIdx
}

const formatHeadResults = (headResultsRaw, headApiKey: string | null = null): GeoJSON.FeatureCollection => {
  // 'pagination': { 'per_page': 0, 'total': 0, 'count': 0, 'cursor': {},}
  const headResults = {
    type: 'FeatureCollection',
    features: headResultsRaw.map((r) => {
      const feature = {
        geometry: {
          type: 'Polygon',
          coordinates: [r.footprintlon.slice(1).map((lon, idx: number) => [lon, r.footprintlat[1 + idx]])],
        },
        properties: {
          providerPlatform: Providers.HEADAEROSPACE,
          provider: `${Providers.HEADAEROSPACE}/${(headConstellationDict[r.sensor]?.constellation || r.sensor) as string}`,
          id: r.identifier,
          acquisitionDate: `${r.acquisitiontime.replace(' ', 'T') as string}.0003Z`, // or new Date(r.datedir).toISOString()
          resolution: constellationDict[headConstellationDict[r.sensor]?.constellation]?.gsd || null,
          cloudCoverage: parseFloat(r.cloudcover),
          constellation: `${(headConstellationDict[r.sensor]?.constellation || r.sensor) as string}`,
          sensor: r.sensor,

          // Other interesting properties on EOS results
          shapeIntersection: null,
          price: null,
          preview_uri: null,
          thumbnail_uri: null,
          providerProperties: {
            preview_uri_tiles: null,
            illuminationElevationAngle: r.sunel === -999 ? null : r.sunel,
            incidenceAngle: r.offnadir === -999 ? null : r.offnadir,
            azimuthAngle: null,
            illuminationAzimuthAngle: null,
          },
          raw_result_properties: r,
        },
        type: 'Feature',
      }
      feature.properties.price = getHeadPrice(feature)

      // Set preview uri by tapping into the TMS tiles (no other way, pretty bad)
      // const tileExt = r.sensor.includes('SV') && false ? 'png' : 'jpg'
      let tileExt = 'png'
      let zoomShift = 1
      if (r.sensor.includes('SV')) {
        // For a few portion of SV images, extension is png
        zoomShift = 0
      }
      const tileCoords = getWebmercatorTileCovering(feature, zoomShift)
      // feature.properties.preview_uri = headTileUrl(r, tileCoords.zoom, tileCoords.tileX, tileCoords.tileY, tileExt)
      feature.properties.preview_uri = headPreviewUrl(headApiKey, r.identifier)

      let minzoom = (tileCoords.zoom as number) - 2
      let maxzoom = (tileCoords.zoom as number) + 2
      const tilesArr = r.tiles
      if (tilesArr) {
        minzoom = tilesArr.findIndex((tilesAtZoom) => tilesAtZoom[0].length > 0)
        maxzoom =
          tilesArr.length -
          tilesArr
            .slice()
            .reverse()
            .findIndex((tilesAtZoom) => tilesAtZoom[0].length > 0)
        // console.log('a', minzoom, maxzoom, tilesArr)
        const tilesArrFlat = tilesArr.flat(2)
        tileExt = tilesArrFlat && tilesArrFlat.length > 0 && tilesArrFlat[0]?.slice(-1) === 'P' ? 'png' : 'jpg'
      }
      feature.properties.providerProperties.preview_uri_tiles = {
        url: headTileUrl(r, '{z}', '{x}', '{y}', tileExt),
        minzoom,
        maxzoom,
      }
      feature.properties.thumbnail_uri = feature.properties.preview_uri

      return feature
    }),
  }
  headResults.features = headResults.features.filter((f) => f.properties.sensor !== 'TEST1')
  return headResults
}

// MAP NOT WORKING https://api-02.eoproc.com/cat-02-tiles/?&sat=SV-1&scdate=2021-12-30&scid=13-4148-2816-SV-1-02_PMS_20211230_0_4417815.png&OK&
// WORKING: https://api-02.eoproc.com/cat-02-tiles/?&sat=SV-1&scdate=2022-05-14&scid=12-2073-1407-SV-1-03_PMS_20220514_0_4716909.png&OK&

export default searchHead
