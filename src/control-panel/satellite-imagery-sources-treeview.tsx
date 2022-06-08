// DateRange component based on simple mui datepickers since the daterange requires an muix-pro subscription

import * as React from 'react';
import { TextField, Typography, } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {Collapse, Checkbox, FormControlLabel, Typography} from '@mui/material';
import { 
  faChevronDown, faChevronUp, faChevronRight, faSatellite,
} from '@fortawesome/free-solid-svg-icons'

import {TreeView, TreeItem} from "@mui/lab";




enum Sensor {
  Pleiades,
  PleiadesNeo,
  HeadSuperview,
  HeadEarthscanner,
  Kompsat3,
  Kompsat2,
  PlanetSkysat,
  Worldview,
  HxGN,
  NearMap,
  TripleSat
}

const sensors = {
  [Sensor.Pleiades]: {gsd: 0.5},
  [Sensor.PleiadesNeo]: {gsd: 0.3},
  [Sensor.HeadSuperview]: {gsd: 0.5},
  [Sensor.HeadEarthscanner]: {gsd: 0.5},
  [Sensor.Kompsat3]: {gsd: 0.4},
  [Sensor.Kompsat2]: {gsd: 1},
  [Sensor.PlanetSkysat]: {gsd: 0.5},
  [Sensor.Worldview]: {gsd: 0.5},
  [Sensor.HxGN]: {gsd: 0.3},
  [Sensor.NearMap]: {gsd: 0.3},
  [Sensor.TripleSat]: {gsd: 0.8},
}

const providers = {
  'UP42': [Sensor.Pleiades, Sensor.PleiadesNeo, Sensor.HeadSuperview, Sensor.HeadEarthscanner, Sensor.HxGN, Sensor.NearMap],
  'SKYWATCH': [Sensor.Pleiades, Sensor.Kompsat3, Sensor.Kompsat2, Sensor.PlanetSkysat, Sensor.TripleSat],
  'EOS': [Sensor.Pleiades, Sensor.HeadSuperview, Sensor.Kompsat3, Sensor.Kompsat2],
  // 'SENTINELHUB': [Sensor.Pleiades, Sensor.Worldview],
  'HEAD-AEROSPACE': [Sensor.HeadSuperview, Sensor.HeadEarthscanner],
  'MAXAR-DIGITAL-GLOBE': [Sensor.Worldview],
}




interface RenderTree {
    id: string;
    name: string;
    children?: RenderTree[];
  }
  
const data: RenderTree = {
    id: "0",
    name: "Satellite Sources",
    children: [
      // UP42
      {
        id: "1",
        name: "UP42",
        children: [
          {
            id: "11",
            name: "Pleiades",
          },
          {
            id: "12",
            name: "Pleiades Neo",
          },
          {
            id: "13",
            name: "HxGN",
          },
          {
            id: "14",
            name: "NearMap",
          },
        ]
      },
      
      // EOS
      {
        id: "3",
        name: "EOS",
        children: [
          {
            id: "31",
            name: "Pleiades",
          },
          {
            id: "32",
            name: "Head Superview",
          },
          {
            id: "33",
            name: "Kompsat3",
          },
          {
            id: "34",
            name: "Kompsat2",
          },
        ]
      },
      
      // MAXAR
      {
        id: "4",
        name: "MAXAR",
        children: [
          {
            id: "41",
            name: "Worldview",
          },
          {
            id: "42",
            name: "GeoEye",
          },
        ]
      },
      
      // HEAD
      {
        id: "5",
        name: "HEAD Aerospace",
        children: [
          // SuperView$EarthScanner-KF1$Jilin-GXA$Jilin-GF02A/B$GaoFen-2$NightVision/Video$DailyVision1m-JLGF3
          {
            id: "51",
            name: "Superview",
          },
          {
            id: "52",
            name: "Earthscanner-KF1",
          },
          {
            id: "53",
            name: "Jilin-GXA",
          },
          {
            id: "54",
            name: "Jilin-GF02A/B",
          },
          {
            id: "55",
            name: "GaoFen-2",
          },
          {
            id: "56",
            name: "DailyVision1m-JLGF3",
          },
        ]
      },
      
      // SKYWATCH
      {
        id: "2",
        name: "SKYWATCH",
        children: [
          {
            id: "21",
            name: "Pleiades",
          },
          {
            id: "22",
            name: "Kompsat3",
          },
          {
            id: "21",
            name: "Kompsat2",
          },
          {
            id: "22",
            name: "PlanetSkysat",
          },
          {
            id: "21",
            name: "TripleSat",
          },
        ]
      },
    ]
  };
  const initialSelection = data.children.map(provider => {
    const sel_i = provider.children.map(source => source.id)
    sel_i.push(provider.id)
    return sel_i
  }).flat()
  function RecursiveTreeView() {
    const [selected, setSelected] = React.useState<string[]>(initialSelection);
    console.log(selected);
  
    const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  
    const parentMap = React.useMemo(() => {
      return goThroughAllNodes(data);
    }, []);
  
    // console.log("parentMAp", parentMap);
  
    function goThroughAllNodes(nodes: RenderTree, map: Record<string, any> = {}) {
      if (!nodes.children) {
        return null;
      }
  
      map[nodes.id] = getAllChild(nodes).splice(1);
  
      for (let childNode of nodes.children) {
        goThroughAllNodes(childNode, map);
      }
  
      return map;
    }
  
    // Get all children from the current node.
    function getAllChild(
      childNode: RenderTree | null,
      collectedNodes: any[] = []
    ) {
      if (childNode === null) return collectedNodes;
  
      collectedNodes.push(childNode.id);
  
      if (Array.isArray(childNode.children)) {
        for (const node of childNode.children) {
          getAllChild(node, collectedNodes);
        }
      }
  
      return collectedNodes;
    }
  
    const getChildById = (nodes: RenderTree, id: string) => {
      let array: string[] = [];
      let path: string[] = [];
  
      // recursive DFS
      function getNodeById(node: RenderTree, id: string, parentsPath: string[]) {
        let result = null;
  
        if (node.id === id) {
          return node;
        } else if (Array.isArray(node.children)) {
          for (let childNode of node.children) {
            result = getNodeById(childNode, id, parentsPath);
  
            if (!!result) {
              parentsPath.push(node.id);
              return result;
            }
          }
  
          return result;
        }
  
        return result;
      }
  
      const nodeToToggle = getNodeById(nodes, id, path);
      // console.log(path);
  
      return { childNodesToToggle: getAllChild(nodeToToggle, array), path };
    };
  
    function getOnChange(checked: boolean, nodes: RenderTree) {
      const { childNodesToToggle, path } = getChildById(data, nodes.id);
      console.log("childNodesToChange", { childNodesToToggle, checked });
  
      let array = checked
        ? [...selected, ...childNodesToToggle]
        : selected
            .filter((value) => !childNodesToToggle.includes(value))
            .filter((value) => !path.includes(value));
  
      array = array.filter((v, i) => array.indexOf(v) === i);
  
      setSelected(array);
    }
  
    const renderTree = (nodes: RenderTree) => {
      const allSelectedChildren = parentMap[
        nodes.id
      ]?.every((childNodeId: string) => selectedSet.has(childNodeId));
      const checked = selectedSet.has(nodes.id) || allSelectedChildren || false;
  
      const indeterminate =
        parentMap[nodes.id]?.some((childNodeId: string) =>
          selectedSet.has(childNodeId)
        ) || false;
  
      if (allSelectedChildren && !selectedSet.has(nodes.id)) {
        console.log("if allSelectedChildren");
  
        setSelected([...selected, nodes.id]);
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
                  onChange={(event) =>
                    getOnChange(event.currentTarget.checked, nodes)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={<Typography variant="subtitle2">{nodes.name}</Typography>}
              key={nodes.id}
            />
          }
        >
          {Array.isArray(nodes.children)
            ? nodes.children.map((node) => renderTree(node))
            : null}
        </TreeItem>
      );
    };
  
    return (
      <TreeView
        defaultExpanded={["0"]}
        // defaultChecked={true}
        defaultCollapseIcon={<FontAwesomeIcon icon={faChevronDown} />}
        defaultExpandIcon={<FontAwesomeIcon icon={faChevronRight} />}
      >
        {renderTree(data)}
      </TreeView>
    );
  }
  





function SatelliteImagerySourcesTreeview(props) {
    const [advancedSettingsCollapsed, setAdvancedSettingsCollapsed] = React.useState(false) // true
    
    return (
        <>
        <Typography 
            variant="subtitle2" 
            onClick={() => setAdvancedSettingsCollapsed(!advancedSettingsCollapsed)} 
            sx={{cursor: 'pointer', zIndex: 10}}
        >
            <FontAwesomeIcon icon={faSatellite} /> 
            &nbsp; Satellite Sources Selection &nbsp; 
            {
            advancedSettingsCollapsed ? 
            <FontAwesomeIcon icon={faChevronDown} /> : 
            <FontAwesomeIcon icon={faChevronUp} />
            }
        </Typography>
        <Collapse in={!advancedSettingsCollapsed} timeout="auto" unmountOnExit>
            <RecursiveTreeView />

        </Collapse>
        </>
    );
    }
  
export default React.memo(SatelliteImagerySourcesTreeview);
