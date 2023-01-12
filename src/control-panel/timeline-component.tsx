// Timeline Component 
// based on visx

import * as React from 'react';
import { ThemeProvider, lighten, darken } from '@mui/material/styles';
import {theme} from '../theme';
// import {Typography, Box} from '@mui/material';

import {GlyphCircle} from '@visx/glyph'
import {
  XYChart, GlyphSeries, Axis, Grid,
  Annotation, AnnotationCircleSubject, AnnotationLabel,
  BarSeries, AnnotationConnector, AnnotationLineSubject, Tooltip
} from '@visx/xychart';


const accessors = {
  xAccessor: d => (d?.properties?.acquisitionDate && new Date(d?.properties?.acquisitionDate)) || null,
  yAccessor: d => 0, // d.y,
};

function TimelineComponent(props) {
  return (
    <ThemeProvider theme={theme}>
        <div 
        className="control-panel" 
        style={{
          background: theme.palette.background.default,
          color: theme.palette.text.primary, 
          backgroundColor: 'transparent',
          width: '100%',
          // width: '1450px',

          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          outline: 'none',
          overflow: 'auto',
          // position:'relative',
          pointerEvents: 'none',
          alignSelf: 'flex-end'
        }}
      >
        <div
          style={{
            // position: 'absolute',
            width: '100%',
            // bottom: 0,
            backgroundColor: 'white',
          }}
        >
        {props.searchResults && props.searchResults['features'] && props.searchResults['features'].length > 0 &&
          <XYChart 
            height={110} 
            xScale={{ type: 'time' }} 
            yScale={{ type: "linear", domain: [0, 1], zero: false }}
          >
            <Axis orientation="bottom" />
            <Grid rows={false} columns={false} numTicks={4} />
            <GlyphSeries 
              dataKey="Acquisition Dates" 
              data={props.searchResults['features']} 
              {...accessors} 
              renderGlyph={({ x, y }: any) => ( //  { left: number; top: number }
                <GlyphCircle 
                  left={x} top={y}
                  stroke={'#777'} // theme.palette.primary.main}
                  fill={'#fff'}
                  strokeWidth={2}
                />
              )}
              onFocus={(e) => console.log(e)}
            />
            {props.footprintFeatures && 
              <GlyphSeries 
                dataKey="Selected Result" 
                data={[props.footprintFeatures]} 
                {...accessors} 
                renderGlyph={({ x, y }: any) => ( 
                  <GlyphCircle 
                    left={x} top={y}
                    stroke={theme.palette.primary.main} // '#ff0000'} // 
                    fill={'#fff'}
                    strokeWidth={3}
                    size={100}
                    fillOpacity={1}
                  />
                )}
              />
            }

            {props.footprintFeatures && 
            
            <Annotation
              dataKey={"Selected Result"}
              datum={props.footprintFeatures}
              dx={0}
              dy={20} 
            >
              {/* <AnnotationConnector /> */}
              {/* <AnnotationLineSubject /> */}
              <AnnotationCircleSubject 
                stroke={'#000'}
              />
              <AnnotationLabel
                title={`${accessors.xAccessor(props.footprintFeatures)?.toISOString().split('T')[0]}`}
                subtitle={''}
                width={135}
                // anchorLineStroke= {'rgba(0,255,0,0)'}
                showAnchorLine={false}
                backgroundProps={{
                  // fillOpacity: 0.6,
                  strokeWidth: 0,
                  // stroke: '#555',
                  strokeOpacity: 0,
                }}
              />
            </Annotation>}
            
          </XYChart>
      }
        </div>
      </div>
    </ThemeProvider>
  );
}

export default React.memo(TimelineComponent);
