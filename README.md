# search-satellite-imagery
Search satellite Imagery Archive on aggregators like UP42, skywatch, EOS via their respective APIs

## Design choices
 - react-map-gl v7 + mapbox-gl v2 mapbox/mapbox-gl-draw
 - mui (previously material-ui) v5 components and datagrid
 - ky
 - font-awesome v6

### React-map module
react-map-gl vs react-mapbox-gl
 - nebula.gl built a [react-map-gl-draw](https://github.com/uber/nebula.gl/tree/master/examples/react-map-gl-draw) on top of react-map-gl [live example](https://nebula.gl/docs/interactive-examples/react-map-gl-draw-example) which is library agnostic (mapbox, maplibre, etc)
 - react-map-gl pre v7.0 had [perf drawbacks](https://github.com/visgl/react-map-gl/issues/1646), so they decided to use mapbox-gl as a peer-dependency (while letting the capability to use maplibre)
v7 is also better to use [3rd-party libs](https://github.com/visgl/react-map-gl/blob/master/docs/whats-new.md) like mapbox-gl-draw, mapbox-gl-geocoder rather than the react-map-gl-draw (which latest released version package.json uses react-map-gl ^5.0.0)

Two options:
 - CHOICE: go the react-map-gl route with mapbox-gl 3rd party libs [example](https://visgl.github.io/react-map-gl/examples/draw-polygon) more up to date already, but without the draw rectangle mode that can be added unless as a custom draw module (which was done)
 - use this nebula.gl [react-map-gl-draw-example](https://nebula.gl/docs/interactive-examples/react-map-gl-draw-example) and update react-map-gl-draw to v1.0.3 and react-map-gl to v6 works + react v16. updating to v7 requires following [this guide](https://github.com/visgl/react-map-gl/blob/master/docs/upgrade-guide.md), among which updating api key, adding mapbox-gl as dependency. Currently, react-mapbox-gl-draw does not support react-map-gl v7 as seen [here](https://github.com/HSLdevcom/jore4/issues/657), neither supports react 18 as of yet (same github board). So this solution was not chosen.


## Fetching POST/REST
ky (built on the Fetch api, has retries, simpler syntax) > axios (built on the older XmlHttpRequest api)

 - use ky (based on fetch) or axios (based on xmlhttprequest older) or pure fetch which are browser based
 - Other [lsit](https://developer.vonage.com/blog/2020/09/23/5-ways-to-make-http-requests-in-node-js-2020-edition)
 - Previous alternative discontinued: [request](https://nodesource.com/blog/express-going-into-maintenance-mode)


## Electron Alternatives for building web desktop apps
Quick overview to build native apps ala electron
React based: 
 - [Electron](https://www.electronjs.org/) (most used, nice react integration, large bundle size and ram hungry but benefits easyness of dev and docs)
 - [React Native Windows (+ macOS)](https://microsoft.github.io/react-native-windows)
 - [Tauri](https://github.com/tauri-apps/tauri) supports all frameworks that compile to HTML/JS and seem to work well with react, like electron, and reuse the desktop webview so low memory and disk footprint, but node+rust backend

Lists
 - [Electron Alternatives list](https://github.com/sudhakar3697/electron-alternatives) + some electron hurdles: 
 - Other react native [official recommendations](https://reactnative.dev/docs/out-of-tree-platforms) for desktop apps 

Non react based
 - [Flutter](https://flutter.dev/) is the trending framework to build native apps, both desktop and smartphone,but requires coding in Dart 
 - [NWjs](https://github.com/nwjs/nw.js)
 - Less maintained: [proton native](https://github.com/kusti8/proton-native)  et [react-nodegui](https://github.com/nodegui/react-nodegui) 