// Forked from Mapbox-Draw-Controls with editing polygon draw mode to rectangle since editing whole toolbar is a bit trickier
// https://github.com/visgl/react-map-gl/tree/7.0-release/examples/draw-polygon
// Full example code: https://nebula.gl/docs/api-reference/react-map-gl-draw/react-map-gl-draw code and 
// Custom Draw Modes: https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md
// https://visgl.github.io/react-map-gl/examples/draw-polygon

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import {useControl} from 'react-map-gl';
import type {MapRef, ControlPosition} from 'react-map-gl';
import CustomDrawRectangle from './CustomDrawRectangle';

type DrawControlProps = ConstructorParameters<typeof MapboxDraw>[0] & {
  position?: ControlPosition;

  onCreate?: (evt: {features: object[]}) => void;
  onUpdate?: (evt: {features: object[]; action: string}) => void;
  onDelete?: (evt: {features: object[]}) => void;
};

// Methods for Adding Custom Control UI Button to toolbar
// https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md
// https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/EXAMPLES.md
// Method 1 a bit more complex but more flexible: custom buttons toolbar: 
// https://github.com/mapbox/mapbox-gl-draw/issues/874
// Method 2: trick the toolbar in believing it is executing draw_polygon on line_string click
// Method 3: activateUiButton in control definition: 
// https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/MODES.md#thisactivateuibutton

const modes = MapboxDraw.modes as unknown as { [modeKey: string]: MapboxDraw.DrawMode | MapboxDraw.DrawCustomMode };
modes['draw_polygon'] = DrawRectangle;
modes['draw_rectangle'] = DrawRectangle;
// modes['draw_line_string'] = 'draw_polygon' // MapboxDraw.DrawModes.DRAW_POLYGON;
// .mapbox-gl-draw_line { background-image: url(''); }

export default function DrawControl(props: DrawControlProps) {
  // console.log('\n\n' + props.modes + '\n\n')
  // props.modes = {'draw_polygon_la': MapboxDraw.modes.DRAW_POLYGON}

  useControl<MapboxDraw>(
    ({map}: {map: MapRef}) => {
      map.on('draw.create', props.onCreate);
      map.on('draw.update', props.onUpdate);
      map.on('draw.delete', props.onDelete);
      const draw = new MapboxDraw({
        ...props,
        // defaultMode: 'draw_rectangle',
        modes,
      });
      // @ts-ignore
      // draw.changeMode('draw_rectangle');
      return (draw); 
    },
    ({map}: {map: MapRef}) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.update', props.onUpdate);
      map.off('draw.delete', props.onDelete);
    },
    {
      position: props.position
    }
  );

  return null;
}

DrawControl.defaultProps = {
  onCreate: () => {},
  onUpdate: () => {},
  onDelete: () => {}
};
