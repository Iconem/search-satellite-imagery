// Forked from CustomOverlay https://github.com/visgl/react-map-gl/tree/7.0-release/examples/custom-overlay
// Minimal example here: https://visgl.github.io/react-map-gl/docs/get-started/adding-custom-data

import * as React from 'react'
import { useState, cloneElement } from 'react'
import { useControl } from 'react-map-gl'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'

import type { MapboxMap, IControl } from 'react-map-gl'

class OverlayControl implements IControl {
  _map: MapboxMap | null = null
  _container: HTMLElement
  _redraw: () => void

  constructor(redraw: () => void) {
    this._redraw = redraw
  }

  onAdd(map): HTMLElement {
    this._map = map
    map.on('move', this._redraw)
    /* global document */
    this._container = document.createElement('div')
    this._redraw()
    return this._container
  }

  onRemove(): void {
    this._container.remove()
    this._map?.off('move', this._redraw)
    this._map = null
  }

  getMap(): MapboxMap | null {
    return this._map
  }

  getElement(): HTMLElement {
    return this._container
  }
}

/**
 * A custom control that rerenders arbitrary React content whenever the camera changes
 */
CustomOverlay.propTypes = {
  position: PropTypes.string,
  // children: React.ReactElement,
}
function CustomOverlay(props): React.ReactElement {
  const [, setVersion] = useState(0)

  const ctrl = useControl<OverlayControl>(
    () => {
      const forceUpdate = (): void => {
        setVersion((v) => v + 1)
      }
      return new OverlayControl(forceUpdate)
    },
    { position: props.position }
  )

  const map = ctrl.getMap()
  return map && createPortal(cloneElement(props.children, { map }), ctrl.getElement())
}

export default React.memo(CustomOverlay)
