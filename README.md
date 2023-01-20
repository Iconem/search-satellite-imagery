# search-satellite-imagery
Search satellite Imagery Archive on aggregators like [UP42](https://console.up42.com/catalog), [SKYWATCH EarthCache](https://console.earthcache.com/search-archive), [EOS Landviewer](https://eos.com/landviewer), [HEAD Aerospace](https://headfinder.head-aerospace.eu/sales), [MAXAR](https://discover.maxar.com) via their respective APIs (official or not)

## Possible todos: 
### Short Term
 - Stores some search params to localStorage
 - Offer ability to Cancel ongoing request/promise?
 - Displays hovered or selected imagery (TMS or preview)
 - Cleanup of search-utilities and make each search extends a search object class
### Long Term
 - Helps order making (no deep-links for any platform unfortunately): make selection, export requests email with scene IDs
 - Order imagery via API
 - Not really useful: Sync datagrid focus on feature when hovered from timeline

## Design choices
 - react-map-gl v7 + mapbox-gl v2 mapbox/mapbox-gl-draw
 - mui (previously material-ui) v5 components and datagrid
 - ky
 - font-awesome v6

![Screenshot](screenshot.jpg)

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
