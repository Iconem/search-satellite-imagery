// Forked from Mapbox-Draw-Controls with editing polygon draw mode to rectangle since editing whole toolbar is a bit trickier
// https://github.com/visgl/react-map-gl/tree/7.0-release/examples/draw-polygon
// Full example code: https://nebula.gl/docs/api-reference/react-map-gl-draw/react-map-gl-draw code and
// Custom Draw Modes: https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md
// https://visgl.github.io/react-map-gl/examples/draw-polygon

// import {CommonSelectors, Constants} from '@mapbox/mapbox-gl-draw';

// import * as CommonSelectors from '../lib/common_selectors';
// import * as Constants from '../constants';

// const DrawPoint = {} as MapboxDraw.DrawMode;

// DrawPoint.onSetup = function() {
//   const point = this.newFeature({
//     type: Constants.geojsonTypes.FEATURE,
//     properties: {},
//     geometry: {
//       type: Constants.geojsonTypes.POINT,
//       coordinates: []
//     }
//   });

//   this.addFeature(point);

//   this.clearSelectedFeatures();
//   this.updateUIClasses({ mouse: Constants.cursors.ADD });
//   this.activateUIButton(Constants.types.POINT);

//   this.setActionableState({
//     trash: true
//   });

//   return { point };
// };

// DrawPoint.stopDrawingAndRemove = function(state) {
//   this.deleteFeature([state.point.id], { silent: true });
//   this.changeMode(Constants.modes.SIMPLE_SELECT);
// };

// DrawPoint.onTap = DrawPoint.onClick = function(state, e) {
//   this.updateUIClasses({ mouse: Constants.cursors.MOVE });
//   state.point.updateCoordinate('', e.lngLat.lng, e.lngLat.lat);
//   this.map.fire(Constants.events.CREATE, {
//     features: [state.point.toGeoJSON()]
//   });
//   this.changeMode(Constants.modes.SIMPLE_SELECT, { featureIds: [state.point.id] });
// };

// DrawPoint.onStop = function(state) {
//   this.activateUIButton();
//   if (!state.point.getCoordinate().length) {
//     this.deleteFeature([state.point.id], { silent: true });
//   }
// };

// DrawPoint.toDisplayFeatures = function(state, geojson, display) {
//   // Never render the point we're drawing
//   const isActivePoint = geojson.properties.id === state.point.id;
//   geojson.properties.active = (isActivePoint) ? Constants.activeStates.ACTIVE : Constants.activeStates.INACTIVE;
//   if (!isActivePoint) return display(geojson);
// };

// DrawPoint.onTrash = DrawPoint.stopDrawingAndRemove;

// DrawPoint.onKeyUp = function(state, e) {
//   if (CommonSelectors.isEscapeKey(e) || CommonSelectors.isEnterKey(e)) {
//     return this.stopDrawingAndRemove(state, e);
//   }
// };

// export default DrawPoint;

// // Add the new draw mode to the MapboxDraw object
// var draw = new MapboxDraw({
//   defaultMode: 'lots_of_points',
//   // Adds the LotsOfPointsMode to the built-in set of modes
//   modes: Object.assign({
//     lots_of_points: LotsOfPointsMode,
//   }, MapboxDraw.modes),
// });

import { kml } from '@tmcw/togeojson'

const LotsOfPointsMode = {
  onSetup: undefined,
  onClick: null,
  onKeyUp: null,
  toDisplayFeatures: null,
}

// When the mode starts this function will be called.
// The `opts` argument comes from `draw.changeMode('lotsofpoints', {count:7})`.
// The value returned should be an object and will be passed to all other lifecycle functions
LotsOfPointsMode.onSetup = function (opts) {
  // console.log('onsetup')
  const state = {
    count: opts.count || 0,
  }
  return state
}

// Whenever a user clicks on the map, Draw will call `onClick`
LotsOfPointsMode.onClick = function (state, e) {
  // console.log('onclick')
  // `this.newFeature` takes geojson and makes a DrawFeature
  const point = this.newFeature({
    type: 'Feature',
    properties: {
      count: state.count,
    },
    geometry: {
      type: 'Point',
      coordinates: [e.lngLat.lng, e.lngLat.lat],
    },
  })
  this.addFeature(point) // puts the point on the map
}

// Whenever a user clicks on a key while focused on the map, it will be sent here
LotsOfPointsMode.onKeyUp = function (state, e) {
  if (e.keyCode === 27) return this.changeMode('simple_select')
}

// This is the only required function for a mode.
// It decides which features currently in Draw's data store will be rendered on the map.
// All features passed to `display` will be rendered, so you can pass multiple display features per internal feature.
// See `styling-draw` in `API.md` for advice on making display features
LotsOfPointsMode.toDisplayFeatures = function (state, geojson, display) {
  display(geojson)
}

function handleKMLUpload2(event, _this, thisChangeMode): void {
  event.preventDefault()
  const kmlFile = event.target.files[0]
  console.log('kmlFile info', kmlFile)
  // console.log('props in handleKMLUpload', props)
  const reader = new FileReader()
  reader.onload = async (e) => {
    console.log(e)
    const kmlContent = e.target.result as string
    const xmlDoc = new DOMParser().parseFromString(kmlContent, 'text/xml')
    const geojsonFeatures = kml(xmlDoc)
    console.log('geojsonFeatures from kml', geojsonFeatures)

    // _this.addFeature(geojsonFeatures.features[0]); // puts the point on the map
    // _this.addFeature(geojsonFeatures.features[0]); // puts the point on the map
    // console.log('after')

    // Zoom on imported kml
    // const bounds = bb<ox(geojsonFeatures)
    // const [minLng, minLat, maxLng, maxLat] = bounds
    // console.log('mapRef', props)
    // props.mapRef.current.fitBounds(
    //   [
    //     [minLng, minLat],
    //     [maxLng, maxLat]
    //   ],
    //   {padding: 150, duration: 1000}
    // );

    // props.setDrawFeatures(
    //   {
    //     type: 'FeaureCollection',
    //     features: [
    //       {
    //         // id: uuidv4(),
    //         type: 'Feature',
    //         geometry: {
    //           coordinates: [geojsonFeatures.features[0].geometry.coordinates[0].map(co => co.slice(0,2))],
    //           type: 'Polygon'
    //         }
    //         // properties: {}
    //       }
    //     ]
    //   }
    // )
    // props.setDrawFeatures(
    //       {
    //         // id: uuidv4(),
    //         type: 'Feature',
    //         geometry: {
    //           coordinates: [geojsonFeatures.features[0].geometry.coordinates[0].map(co => co.slice(0,2))],
    //           type: 'Polygon'
    //         }
    //         // properties: {}
    //       }
    // )
    // props.setDrawFeatures({
    //   type: 'FeatureCollection',
    //   features: [{
    //   id: uuidv4(),
    //   ...geojsonFeatures.features[0]
    // }]})
    // console.log('props in onload', props)
    // props.setDrawFeatures(currFeatures => {
    //   const newFeatures = {...currFeatures};
    //   for (const f of geojsonFeatures.features) {
    //     f.id = uuidv4().replaceAll('-', '')
    //     f.properties = {}
    //     newFeatures[f.id] = f;
    //     console.log('load kml f', f)
    //   }
    //     console.log('load kml newFeatures', newFeatures)
    //   return newFeatures;
    // });

    // Not useful
    // props.map.fire("draw.create", {
    //   features: [geojsonFeatures.features[0]]
    // });

    thisChangeMode('simple_select')
    console.log('mode changed')
  }
  reader.readAsText(event.target.files[0], 'UTF-8')
}

const LotsOfPointsMode2 = {
  onSetup: null,
  onClick: null,
  onKeyUp: null,
  toDisplayFeatures: null,
}

// When the mode starts this function will be called.
// The `opts` argument comes from `draw.changeMode('lotsofpoints', {count:7})`.
// The value returned should be an object and will be passed to all other lifecycle functions
LotsOfPointsMode2.onSetup = function (opts) {
  // console.log('onsetup')
  const kmlUploadInput = document.getElementById('kmlUploadInput')
  kmlUploadInput.onchange = (e) => {
    handleKMLUpload2(e, this, this.changeMode)
  }
  kmlUploadInput.click()
}

// Whenever a user clicks on the map, Draw will call `onClick`
LotsOfPointsMode2.onClick = function (state, e) {
  // console.log('onclick')
  // // `this.newFeature` takes geojson and makes a DrawFeature
  // var point = this.newFeature({
  //   type: 'Feature',
  //   properties: {
  //     // count: state.count
  //   },
  //   geometry: {
  //     type: 'Point',
  //     coordinates: [0, 0]
  //     // coordinates: [e.lngLat.lng, e.lngLat.lat]
  //   }
  // });
  // this.addFeature(point); // puts the point on the map
}

// Whenever a user clicks on a key while focused on the map, it will be sent here
LotsOfPointsMode2.onKeyUp = function (state, e) {
  if (e.keyCode === 27) return this.changeMode('simple_select')
}

// This is the only required function for a mode.
// It decides which features currently in Draw's data store will be rendered on the map.
// All features passed to `display` will be rendered, so you can pass multiple display features per internal feature.
// See `styling-draw` in `API.md` for advice on making display features
LotsOfPointsMode2.toDisplayFeatures = function (state, geojson, display) {
  // display(geojson);
}

// // Add the new draw mode to the MapboxDraw object
// var draw = new MapboxDraw({
//   defaultMode: 'lots_of_points',
//   // Adds the LotsOfPointsMode2 to the built-in set of modes
//   modes: Object.assign({
//     lots_of_points: LotsOfPointsMode2,
//   }, MapboxDraw.modes),
// });

export { LotsOfPointsMode, LotsOfPointsMode2 }
