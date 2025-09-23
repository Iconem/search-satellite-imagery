// // DateRange component based on simple mui datepickers since the daterange requires an muix-pro subscription
// // Forked from https://github.com/mui/material-ui/issues/17407 hamsishe code on https://codesandbox.io/s/edeyu
// // soon to be deployed in MUI-X probably

import * as React from 'react'
import { TreeView, TreeItem } from '@mui/lab'
import { Typography, Collapse, Checkbox, FormControlLabel, CircularProgress, Box } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faChevronRight, faSatellite } from '@fortawesome/free-solid-svg-icons'
import { useLocalStorage } from '../utilities'
import PropTypes from 'prop-types'
import { Providers } from '../archive-apis/search-utilities'

interface RenderTree {
  id: string
  name: string
  children?: RenderTree[]
  disabled?: boolean
  loading?: boolean
}

const treeviewRootId = 'treeview-provider-root'

function buildTreeviewData(providersDict, constellationDict, isUp42Loading = false, apiKeys): RenderTree {
  return {
    id: treeviewRootId,
    name: 'Satellite Sources',
    children: Object.keys(providersDict).map((providerKey: string) => {
      if (providerKey === Providers.UP42) {
        if (!apiKeys[Providers.UP42]?.up42Email || !apiKeys[Providers.UP42]?.up42Password) {
          return {
            id: `treeview-provider-${providerKey}`,
            name: `${providerKey} (Not configured)`,
            disabled: true,
            children: [{
              id: `${providerKey}-config`,
              name: 'Configure credentials in "SET API KEYS" bellow',
              disabled: true
            }]
          };
        }

        if (isUp42Loading) {
          return {
            id: `treeview-provider-${providerKey}`,
            name: `${providerKey} (Loading...)`,
            children: [{
              id: `treeview-constellation-${providerKey}-loading`,
              name: 'Loading...',
              loading: true,
              children: []
            }]
          };
        }
      }
      return {
        id: `treeview-provider-${providerKey}`,
        name: providerKey,
        children: providersDict[providerKey].map((constellationKey: string) => ({
          id: `treeview-constellation-${providerKey}-${constellationKey}`,
          name: `${constellationKey} - ${100 * (constellationDict[constellationKey]?.gsd ?? 0)}cm`,
          // disabled: !(providerKey === Providers.UP42),
        })),
      };
    }),
  };
}

const sourcesTreeviewInitialSelection = (treeviewData: RenderTree): string[] => {
  const result = (treeviewData.children ?? [])
    .map((provider) => {
      const selIdx = (provider.children ?? []).map((source) => source.id)
      selIdx.push(provider.id)
      return selIdx
    })
    .flat()
  return result
}


RecursiveTreeView.propTypes = {
  providersTreeviewDataSelection: PropTypes.any,
  setProvidersTreeviewDataSelection: PropTypes.func,
  treeviewData: PropTypes.any
}

function RecursiveTreeView(props): React.ReactElement {

  const selectedSet = React.useMemo(() =>
    new Set(props.providersTreeviewDataSelection)
    , [props.providersTreeviewDataSelection])

  const parentMap = React.useMemo(() => {
    return goThroughAllNodes(props.treeviewData)
  }, [props.treeviewData])

  function goThroughAllNodes(nodes: RenderTree, map: Record<string, any> = {}): any {
    if (!nodes.children) {
      return null
    }
    map[nodes.id] = getAllChild(nodes).splice(1)
    for (const childNode of nodes.children) {
      goThroughAllNodes(childNode, map)
    }
    return map
  }

  function getAllChild(childNode: RenderTree | null, collectedNodes: any[] = []): any {
    if (childNode === null) return collectedNodes
    collectedNodes.push(childNode.id)
    if (Array.isArray(childNode.children)) {
      for (const node of childNode.children) {
        getAllChild(node, collectedNodes)
      }
    }
    return collectedNodes
  }

  const getChildById = (nodes: RenderTree, id: string): any => {
    const array: string[] = []
    const path: string[] = []

    function getNodeById(node: RenderTree, id: string, parentsPath: string[]): any {
      let result = null
      if (node.id === id) {
        return node
      } else if (Array.isArray(node.children)) {
        for (const childNode of node.children) {
          result = getNodeById(childNode, id, parentsPath)
          if (result) {
            parentsPath.push(node.id)
            return result
          }
        }
        return result
      }
      return result
    }

    const nodeToToggle = getNodeById(nodes, id, path)
    return { childNodesToToggle: getAllChild(nodeToToggle, array), path }
  }

  function getOnChange(checked: boolean, nodes: RenderTree): any {
    const { childNodesToToggle, path } = getChildById(props.treeviewData, nodes.id)

    let array = checked
      ? [...props.providersTreeviewDataSelection, ...childNodesToToggle]
      : props.providersTreeviewDataSelection
        .filter((value) => !childNodesToToggle.includes(value))
        .filter((value) => !path.includes(value))

    array = array.filter((v, i) => array.indexOf(v) === i)
    props.setProvidersTreeviewDataSelection(array)
  }

  const renderTree = (nodes: RenderTree): React.ReactElement => {

    const allSelectedChildren = parentMap[nodes.id]?.every((childNodeId: string) => selectedSet.has(childNodeId))
    const checked = selectedSet.has(nodes.id) || allSelectedChildren || false
    const indeterminate = parentMap[nodes.id]?.some((childNodeId: string) => selectedSet.has(childNodeId)) || false
    if (allSelectedChildren && !selectedSet.has(nodes.id)) {
      props.setProvidersTreeviewDataSelection([...props.providersTreeviewDataSelection, nodes.id])
    }

    return (
      <TreeItem
        key={nodes.id}
        nodeId={nodes.id}
        label={
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                indeterminate={!checked && indeterminate}
                onChange={(event) => getOnChange(event.currentTarget.checked, nodes)}
                onClick={(e) => e.stopPropagation()}
                disabled={nodes.disabled}
              />
            }
            // label={<Typography variant="subtitle2">{nodes.name}</Typography>}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2">{nodes.name}</Typography>
                {nodes.loading && <CircularProgress size={16} />}
              </Box>
            }
            key={nodes.id}
          />
        }
      >
        {Array.isArray(nodes.children) ? nodes.children.map((node) => renderTree(node)) : null}
      </TreeItem>
    )
  }

  return (
    <TreeView
      defaultExpanded={[treeviewRootId]}
      defaultCollapseIcon={<FontAwesomeIcon icon={faChevronDown} />}
      defaultExpandIcon={<FontAwesomeIcon icon={faChevronRight} />}
    >
      {renderTree(props.treeviewData)}
    </TreeView>
  )
}

SatelliteImagerySourcesTreeview.propTypes = {
  providersTreeviewDataSelection: PropTypes.any,
  setProvidersTreeviewDataSelection: PropTypes.func,
  treeviewData: PropTypes.any
}

function SatelliteImagerySourcesTreeview(props): React.ReactElement {
  const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = useLocalStorage('UI_collapsed_satelliteImagerySourcesTreeview', false)

  return (
    <>
      <Typography variant="subtitle2" onClick={() => setAdvancedSettingsCollapsed(!advancedSettingsCollapsed)} sx={{ cursor: 'pointer', zIndex: 10 }}>
        <FontAwesomeIcon icon={faSatellite} />
        &nbsp; Satellite Sources Selection &nbsp;
        {advancedSettingsCollapsed ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronUp} />}
      </Typography>
      {/* <Collapse in={!advancedSettingsCollapsed} timeout="auto" unmountOnExit>

        <RecursiveTreeView
          setProvidersTreeviewDataSelection={props.setProvidersTreeviewDataSelection}
          providersTreeviewDataSelection={props.providersTreeviewDataSelection}
          treeviewData={props.treeviewData}
        />

      </Collapse> */}
      <Collapse in={!advancedSettingsCollapsed} timeout="auto" unmountOnExit>
        <RecursiveTreeView
          setProvidersTreeviewDataSelection={props.setProvidersTreeviewDataSelection}
          providersTreeviewDataSelection={props.providersTreeviewDataSelection}
          treeviewData={props.treeviewData}
        />
      </Collapse>
    </>
  )
}

export { SatelliteImagerySourcesTreeview, sourcesTreeviewInitialSelection, buildTreeviewData }
