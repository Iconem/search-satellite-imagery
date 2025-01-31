// Code for utilities for searching archive APIs

import area from '@turf/area'
import intersect from '@turf/intersect'

function filterFeaturesWithSearchParams(f, searchPolygon): boolean {
  return true && searchPolygon.properties.gsd_min <= (f.properties.resolution || 0) && (f.properties.resolution || 0) <= searchPolygon.properties.gsd_max && (f.properties.cloudCoverage ?? 0) <= searchPolygon.properties.cloudCoverage && (f.properties.shapeIntersection ?? 100) >= searchPolygon.properties.aoiCoverage && new Date(f.properties.acquisitionDate) >= new Date(searchPolygon.properties.startDate) && new Date(f.properties.acquisitionDate) <= new Date(searchPolygon.properties.endDate)
}

// Shape intersection expressed as number in [0,100] of overlap of feature1 over feature2
const shapeIntersection = (feature1, feature2): number => {
  return Math.round((area(intersect(feature1, feature2)) / area(feature2)) * 100)
}
// Get imagery price given priceInfo {min_area, price_per_sq_km}
function getAreaPrice(featureArea, priceInfo): number | null {
  const price = Math.max(featureArea / 1_000_000, priceInfo.min_area) * priceInfo.price_per_sq_km
  return Math.round(price)
}
function getImageryPrice(feature, constellationName, constellationDict): number | null {
  if (constellationName in constellationDict) {
    const priceInfo = constellationDict[constellationName]
    return getAreaPrice(area(feature.geometry), priceInfo)
  } else {
    return null
  }
}

// We do not have access to a maxar price list, so using a default SentinelHub Pricing information
// 16.5 USD/km2, 5km2 min on SentinelHub, must be close to Maxar/Digital Globe Pricing
const maxarPriceInfo = {
  price_per_sq_km: 16.5, // (16.5 USD/km2) 5km2 min on SentinelHub, must be close to Maxar/Digital Globe Pricing
  min_area: 5,
}
function getMaxarPrice(feature): number | null {
  // return getImageryPrice(feature, feature.properties.constellation, maxarConstellationDict)
  return getAreaPrice(area(feature.geometry), maxarPriceInfo)
}

const maxAbs = (x): number => Math.max(...x.map(Math.abs))

// ENUM names are required for EOS get satellites matching gsd
enum Satellites {
  SuperView1 = 'SuperView 1',
  SuperView1A = 'SuperView 1A',
  SuperView1B = 'SuperView 1B',
  SuperView1C = 'SuperView 1C',
  SuperView1D = 'SuperView 1D',
  SuperView2 = 'SuperView 2',
  TripleSat1 = '21AT TripleSat 1',
  TripleSat2 = '21AT TripleSat 2',
  TripleSat3 = '21AT TripleSat 3',
  KompSat3 = 'KompSat 3',
  KompSat3A = 'KompSat 3A',
  KOMPSAT2 = 'KOMPSAT 2',
  Ziyuan3 = 'Ziyuan 3',
  Gaofen1 = 'Gaofen 1',
  Gaofen2 = 'Gaofen 2',
  Gaofen7 = 'Gaofen 7',
  GeoEye = 'GeoEye',
  JilinGXA = 'Jilin-GXA',
  JilinGF02AB = 'Jilin-GF02A/B',
  DailyVision1mJLGF3 = 'DailyVision1m-JLGF3',
  Pleiades = 'OneAtlas Pleiades',
  PleiadesNeo = 'OneAtlas PleiadesNeo',
  Worldview = 'Worldview',
  PlanetSkysat = 'PlanetSkysat',
  EarthScanner = 'EarthScanner',
  HxGN = 'HxGN',
  NearMap = 'NearMap',
  NearSpace = 'NearSpace',
  GeoEye1 = 'GeoEye-1',
  WorldView1 = 'WorldView-1',
  WorldView2 = 'WorldView-2',
  WorldView3 = 'WorldView-3',
  WorldView4 = 'WorldView-4',
  QuickBird2 = 'QuickBird-2',
  Ikonos1 = 'Ikonos-1',
  JL1GF03 = 'JL1GF03',
  JL101A = 'JL101A',
  JL104 = 'JL104',
  CapellaSpace = 'CapellaSpace',
}
enum Constellation {
  Pleiades = 'Pleiades',
  PleiadesNeo = 'Pleiades Neo',
  Superview1 = 'Superview 1',
  Superview2 = 'Superview 2',
  EarthScanner = 'EarthScanner',
  Kompsat3 = 'Kompsat 3',
  Kompsat2 = 'Kompsat 2',
  PlanetSkysat = 'Planet Skysat',
  HxGN = 'HxGN',
  NearMap = 'NearMap',
  TripleSat = 'TripleSat',
  Ziyuan3 = 'Ziyuan 3',
  Gaofen1 = 'Gaofen 1',
  Gaofen2 = 'Gaofen 2',
  Gaofen7 = 'Gaofen 7',
  GeoEye = 'GeoEye',
  DailyVision = 'DailyVision',
  GeoEye1 = 'GeoEye-1',
  WorldView_1_2 = 'WorldView-1-2',
  WorldView_3_4 = 'WorldView-3-4',
  QuickBird2 = 'QuickBird-2',
  Ikonos1 = 'Ikonos-1',
  JL1GF03 = 'JL1GF03',
  JL101A = 'JL101A',
  JL104 = 'JL104',
  SPOT = 'SPOT',
  NearSpace = 'NearSpace',
  CapellaSpace = 'CapellaSpace',
  Skyfi = 'Skyfi',
  OAM = 'OpenAerialMap',
  STAC = 'STAC',
}

enum Providers {
  UP42 = 'UP42',
  MAXAR_DIGITALGLOBE = 'MAXAR',
  EOS = 'EOS',
  SKYWATCH = 'SKYWATCH',
  SKYFI = 'SKYFI',
  OAM = 'OpenAerialMap',
  ARLULA = 'ARLULA',
  APOLLO = 'APOLLO MAPPING',
  STAC = 'STAC',
}

const providersDict = {
  [Providers.UP42]: [
    Constellation.Pleiades,
    Constellation.PleiadesNeo,
    Constellation.TripleSat,
    Constellation.SPOT,
    Constellation.NearSpace,
    Constellation.CapellaSpace,
    // Constellation.NearMap,
    // Constellation.HxGN,
  ],
  [Providers.MAXAR_DIGITALGLOBE]: [Constellation.GeoEye, Constellation.WorldView_1_2, Constellation.WorldView_3_4, Constellation.QuickBird2, Constellation.Ikonos1],
  [Providers.EOS]: [Constellation.Superview1, Constellation.Superview2, Constellation.Kompsat3, Constellation.Kompsat2, Constellation.Gaofen1],
  [Providers.SKYWATCH]: [Constellation.PlanetSkysat, Constellation.TripleSat, Constellation.Pleiades, Constellation.PleiadesNeo, Constellation.Kompsat3, Constellation.Kompsat2],
  [Providers.SKYFI]: [Constellation.DailyVision],
  [Providers.OAM]: [Constellation.OAM],
  [Providers.ARLULA]: [
    Constellation.GeoEye,
    Constellation.WorldView_1_2,
    Constellation.WorldView_3_4,
    Constellation.QuickBird2,
    Constellation.Ikonos1,
    Constellation.Kompsat3,
    Constellation.Kompsat2,
    Constellation.TripleSat,
    // TODO LatConnect 60
  ],
  [Providers.APOLLO]: [
    Constellation.Pleiades,
    Constellation.PleiadesNeo,
    // TODO COMPLETE
  ],
  [Providers.STAC]: [Constellation.STAC],
  // 'SENTINELHUB': [Constellation.Pleiades,  Constellation.Worldview],
}
// Maxar EUSI satellites https://docs.sentinel-hub.com/api/latest/static/files/data/maxar/world-view/resources/brochures/EUSI_Satellite_Booklet_digital.pdf

const constellationDict = {
  [Constellation.Superview1]: {
    satellites: [Satellites.SuperView1A, Satellites.SuperView1B, Satellites.SuperView1C, Satellites.SuperView1D, Satellites.SuperView1],
    gsd: 0.5,
  },
  [Constellation.Superview2]: {
    satellites: [Satellites.SuperView2],
    gsd: 0.4,
  },
  [Constellation.EarthScanner]: {
    satellites: [Satellites.EarthScanner],
    gsd: 0.5,
  },
  [Constellation.TripleSat]: {
    satellites: [Satellites.TripleSat1, Satellites.TripleSat2, Satellites.TripleSat3],
    gsd: 0.8,
  },
  [Constellation.Kompsat3]: {
    satellites: [Satellites.KompSat3, Satellites.KompSat3A],
    gsd: 0.5,
  },
  [Constellation.Kompsat2]: {
    satellites: [Satellites.KOMPSAT2],
    gsd: 1,
  },
  [Constellation.Ziyuan3]: {
    satellites: [Satellites.Ziyuan3],
    gsd: 2.5,
  },
  [Constellation.Gaofen1]: {
    satellites: [Satellites.Gaofen1],
    gsd: 2,
  },
  [Constellation.Gaofen2]: {
    satellites: [Satellites.Gaofen2],
    gsd: 0.8,
  },
  [Constellation.Gaofen7]: {
    satellites: [Satellites.Gaofen7],
    gsd: 0.65,
  },
  [Constellation.GeoEye]: {
    satellites: [Satellites.GeoEye],
    gsd: 0.4,
  },
  [Constellation.DailyVision]: {
    satellites: [Satellites.JilinGXA, Satellites.JilinGF02AB, Satellites.DailyVision1mJLGF3],
    gsd: 0.75,
  },
  [Constellation.Pleiades]: {
    satellites: [Satellites.Pleiades],
    gsd: 0.5,
  },
  [Constellation.PleiadesNeo]: {
    satellites: [Satellites.PleiadesNeo],
    gsd: 0.3,
  },
  [Constellation.PlanetSkysat]: {
    satellites: [Satellites.PlanetSkysat],
    gsd: 0.5,
  },
  [Constellation.HxGN]: {
    satellites: [Satellites.HxGN],
    gsd: 0.3,
  },
  [Constellation.NearMap]: {
    satellites: [Satellites.NearMap],
    gsd: 0.3,
  },
  [Constellation.GeoEye1]: {
    satellites: [Satellites.GeoEye1],
    gsd: 0.4,
  },
  [Constellation.WorldView_1_2]: {
    satellites: [Satellites.WorldView1, Satellites.WorldView2],
    gsd: 0.5,
  },
  [Constellation.WorldView_3_4]: {
    satellites: [Satellites.WorldView3, Satellites.WorldView4],
    gsd: 0.3,
  },
  [Constellation.QuickBird2]: {
    satellites: [Satellites.QuickBird2],
    gsd: 0.6,
  },
  [Constellation.Ikonos1]: {
    satellites: [Satellites.Ikonos1],
    gsd: 0.8,
  },

  [Constellation.JL1GF03]: {
    satellites: [Satellites.JL1GF03],
    gsd: 1,
  },
  [Constellation.JL101A]: {
    satellites: [Satellites.JL101A],
    gsd: 0.7,
  },
  [Constellation.JL104]: {
    satellites: [Satellites.JL104],
    gsd: 1,
  },

  [Constellation.NearSpace]: {
    satellites: [Satellites.NearSpace],
    gsd: 0.3,
  },
  [Constellation.CapellaSpace]: {
    satellites: [Satellites.CapellaSpace],
    gsd: 0.5,
  },
  [Constellation.OAM]: {
    satellites: [],
    gsd: 0.005,
  },
  [Constellation.STAC]: {
    satellites: [],
    gsd: 0.01,
  },
}

const eosNames = {
  [Satellites.SuperView1A]: 'SuperView 1A',
  [Satellites.SuperView1]: 'SuperView 1',
  [Satellites.SuperView1B]: 'SuperView 1B',
  [Satellites.SuperView1C]: 'SuperView 1C',
  [Satellites.SuperView1D]: 'SuperView 1D',
  [Satellites.TripleSat1]: 'TripleSat Constellation-1',
  [Satellites.TripleSat2]: 'TripleSat Constellation-2',
  [Satellites.TripleSat3]: 'TripleSat Constellation-3',
  [Satellites.KompSat3]: 'KOMPSAT-3',
  [Satellites.KompSat3A]: 'KOMPSAT-3A',
  [Satellites.KOMPSAT2]: 'KOMPSAT-2',
  [Satellites.Ziyuan3]: 'Ziyuan-3',
  [Satellites.Gaofen1]: 'Gaofen 1',
  [Satellites.Gaofen2]: 'Gaofen 2',
}
const maxarNames = {
  [Satellites.GeoEye1]: 'GE01',
  [Satellites.WorldView1]: 'WV01',
  [Satellites.WorldView2]: 'WV02',
  [Satellites.WorldView3]: 'WV03',
  [Satellites.WorldView4]: 'WV04',
  [Satellites.QuickBird2]: 'QB02',
  [Satellites.Ikonos1]: 'IK01',
}

// const headNames = {
//   [Constellation.Superview1]: 'SV-1',
//   [Constellation.Superview2]: 'SV-2',
//   [Satellites.EarthScanner]: 'JL1KF01-PMS',
//   [Satellites.JilinGXA]: 'JilinGXA',
//   [Satellites.JilinGF02AB]: 'JL1GF02-PMS',
//   [Satellites.DailyVision1mJLGF3]: 'JL1GF03-PMS',
//   [Satellites.Gaofen2]: 'GF-2',
//   [Satellites.Gaofen7]: 'GF-7',
// }
const headSearchNames = {
  [Satellites.SuperView1]: 'SuperView',
  [Satellites.SuperView2]: 'SuperView',
  [Satellites.EarthScanner]: 'EarthScanner-KF1', //
  [Satellites.JilinGXA]: 'Jilin-GXA',
  [Satellites.JilinGF02AB]: 'Jilin-GF02A/B',
  [Satellites.DailyVision1mJLGF3]: 'DailyVision1m-JLGF3',
  [Satellites.Gaofen2]: 'GaoFen-2',
  // [Satellites.Gaofen7]: 'GaoFen-7',
}

const headConstellationDict = {
  'SV-1': {
    constellation: Constellation.Superview1,
    min_area: 25,
    price_per_sq_km: 9,
  },
  'SV-2': {
    constellation: Constellation.Superview2,
    min_area: 25,
    price_per_sq_km: 12,
  },
  'JL1KF01-PMS': {
    constellation: Constellation.EarthScanner,
    min_area: 25,
    price_per_sq_km: 7,
  },
  'JL1GF02-PMS': {
    constellation: Constellation.DailyVision,
    min_area: 25,
    price_per_sq_km: 5,
  },
  'GF-2': {
    constellation: Constellation.Gaofen2,
    min_area: 25,
    price_per_sq_km: 5,
  },
  'GF-7': {
    constellation: Constellation.Gaofen7,
    min_area: 25,
    price_per_sq_km: 6,
  },
  'JL1GF03-PMS': {
    constellation: Constellation.JL1GF03,
  },
  JL101A: {
    constellation: Constellation.JL101A,
  },
  'JL104-PMS': {
    constellation: Constellation.JL104,
  },
}

const up42ConstellationDict = {
  phr: {
    constellation: Constellation.Pleiades,
    price_per_sq_km: 10, // (10EUR/km2) no min
    min_area: 0,
  },
  pneo: {
    constellation: Constellation.PleiadesNeo,
    price_per_sq_km: 15, // TODO: check pricing and min_area
    min_area: 0,
  },
  triplesat: {
    constellation: Constellation.TripleSat,
    price_per_sq_km: 15, // TODO: check pricing and min_area
    min_area: 0,
  },
  // 'HEAD SuperView': {
  //   constellation: 'SuperView',
  //   price_per_sq_km: 9, // (9EUR/km2) 25km² min
  //   min_area: 25
  // },
  // 'HEAD EarthScanner': {
  //   constellation: 'EarthScanner',
  //   price_per_sq_km: 7, // (7EUR/km2) 25km² min
  //   min_area: 25
  // },
}

const up42ProducersNames = {
  [Constellation.Pleiades]: 'Airbus',
  [Constellation.PleiadesNeo]: 'Airbus',
  [Constellation.TripleSat]: 'TWENTY_ONE_AT',
  [Constellation.SPOT]: 'ESA',
  [Constellation.NearSpace]: 'NEAR_SPACE_LABS',
}

function getConstellationRespectingGsd(gsd): any[] {
  return Object.keys(constellationDict).filter((key) => gsd.min <= constellationDict[key].gsd && constellationDict[key].gsd <= gsd.max)
}

function getSatellitesRespectingGsd(gsd): any[] {
  return getConstellationRespectingGsd(gsd)
    .map((key) => constellationDict[key].satellites)
    .flat()
}

function getConstellationObj(satName, constellationDict): any {
  let constellationObj
  Object.keys(constellationDict).forEach((constellationName) => (constellationObj = constellationDict[constellationName].satellites.includes(satName) ? constellationDict[constellationName] : constellationObj))
  return constellationObj
}

function getConstellationName(satName, constellationDict): string | undefined {
  const constellationObj = getConstellationObj(satName, constellationDict)
  if (constellationObj) {
    // return constellationObj.name
    return Object.keys(constellationDict).find((key) => constellationDict[key] === constellationObj)
  } else {
    return satName
  }
}

// const eosConstellationDict =
//   Object.keys(constellationDict)
//     .reduce(function(result, key) {
//       if (false || providersDict[Providers.EOS].includes(Constellation[key])) {
//         result[key] = {
//           satellites: constellationDict[key].satellites.map(x => eosNames[x].eos_name)
//         }
//       }
//       return result
//   }, {})

// TODO
// Could be simplified

const eosConstellationDict = providersDict[Providers.EOS].reduce(function (result, constellation) {
  result[constellation] = {
    satellites: constellationDict[constellation].satellites.map((x) => eosNames[x] || x),
  }
  return result
}, {})

const maxarConstellationDict = providersDict[Providers.MAXAR_DIGITALGLOBE].reduce(function (result, constellation) {
  result[constellation] = {
    satellites: constellationDict[constellation].satellites.map((x) => maxarNames[x] || x),
  }
  return result
}, {})

// const headConstellationDict =
//   providersDict[Providers.HEADAEROSPACE]
//   .reduce(function(result, constellation) {
//       result[constellation] = {
//         satellites: constellationDict[constellation].satellites.map(x => headNames[x] || x)
//       }
//       return result
//     }
// , {})

export {
  // Methods
  filterFeaturesWithSearchParams,
  shapeIntersection,
  getImageryPrice,
  maxAbs,
  getConstellationName,
  getSatellitesRespectingGsd,

  // Enums
  Satellites,
  Constellation,
  Providers,

  // Generic Dicts
  constellationDict,
  providersDict,

  // Per provider exports
  eosConstellationDict,
  eosNames,
  getMaxarPrice,
  maxarConstellationDict,
  headConstellationDict,
  headSearchNames,
  up42ConstellationDict,
  up42ProducersNames,
}
