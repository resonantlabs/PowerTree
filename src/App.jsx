import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, Activity, ArrowRight, Battery, AudioWaveform, CircuitBoard, Cpu, Save, Cable, LayoutGrid } from 'lucide-react';

// --- Helper Types & Data ---

// Simple unique ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// Node Types
const NODE_TYPES = {
  SOURCE: 'source',
  CONVERTER: 'converter',
  LOAD: 'load',
  CABLE: 'cable'
};

// Initial Data State
const INITIAL_NODES = [
  { id: 'ac1', type: NODE_TYPES.SOURCE, x: 50, y: 250, label: 'QSW AC Source', data: { voltage: 90, powerMax: 200 } },

  { id: 'inputcable', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Input Cable', data: { resistance: 0.01 } },

  { id: 'boost', type: NODE_TYPES.CONVERTER, x: 450, y: 250, label: 'Emulated Boost', data: { vOut: 160, efficiency: 0.97 } },
  { id: 'resonant24', type: NODE_TYPES.CONVERTER, x: 650, y: 250, label: 'Forward 24V', data: { vOut: 24, efficiency: 0.97 } },
  { id: 'resonant34', type: NODE_TYPES.CONVERTER, x: 650, y: 350, label: 'Forward 34V', data: { vOut: 34, efficiency: 0.97 } },

  { id: 'dcdc12', type: NODE_TYPES.CONVERTER, x: 850, y: 200, label: 'Buck 12V', data: { vOut: 12, efficiency: 0.85 } },
  { id: 'dcdc575', type: NODE_TYPES.CONVERTER, x: 850, y: 300, label: 'Buck 5.75V', data: { vOut: 5.75, efficiency: 0.85 } },

  { id: 'cable24', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Out Cable 24V', data: { resistance: 0.01 } },
  { id: 'cable12', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Out Cable 12V', data: { resistance: 0.01 } },
  { id: 'cable575', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Out Cable 5.75V', data: { resistance: 0.01 } },
  { id: 'cable34', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Out Cable 34V', data: { resistance: 0.01 } },

  { id: 'load24', type: NODE_TYPES.LOAD, x: 850, y: 100, label: '24V Load', data: { current: 4 } },
  { id: 'load12', type: NODE_TYPES.LOAD, x: 1050, y: 200, label: '12V Load', data: { current: 1 } },
  { id: 'load575', type: NODE_TYPES.LOAD, x: 1050, y: 300, label: '5.75V Load', data: { current: 1 } },
  { id: 'load34', type: NODE_TYPES.LOAD, x: 850, y: 400, label: '34V Load', data: { current: 1 } },
];

const INITIAL_EDGES = [
  { id: 'e1', source: 'ac1', target: 'inputcable' },
  { id: 'e2', source: 'inputcable', target: 'boost' },
  { id: 'e3', source: 'boost', target: 'resonant24' },
  { id: 'e4', source: 'boost', target: 'resonant34' },
  { id: 'e5', source: 'resonant24', target: 'dcdc12' },
  { id: 'e6', source: 'resonant24', target: 'dcdc575' },
  { id: 'e7', source: 'resonant24', target: 'cable24' },
  { id: 'e8', source: 'dcdc12', target: 'cable12' },
  { id: 'e9', source: 'dcdc575', target: 'cable575' },
  { id: 'e10', source: 'resonant34', target: 'cable34' },
  { id: 'e11', source: 'cable24', target: 'load24' },
  { id: 'e12', source: 'cable12', target: 'load12' },
  { id: 'e13', source: 'cable575', target: 'load575' },
  { id: 'e14', source: 'cable34', target: 'load34' },
];

export default function PowerTreeDesigner() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [draggingId, setDraggingId] = useState(null);

  // CHANGE: Track ID instead of the object to keep panel in sync
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const [calculatedState, setCalculatedState] = useState({});
  const canvasRef = useRef(null);

  // --- Calculation Logic (Iterative 2-Pass approach to avoid recursion loops) ---
  useEffect(() => {
    const nodeStats = {};

    // Initialize all nodes with default 0 state
    nodes.forEach(n => {
      nodeStats[n.id] = {
        power: 0,
        voltageIn: 0,
        currentIn: n.type === NODE_TYPES.LOAD ? n.data.current : 0,
        currentOut: 0, // Added output current tracking
        waste: 0,
        powerOut: 0,
        voltageOut: (n.type === NODE_TYPES.SOURCE ? n.data.voltage : 0) || (n.type === NODE_TYPES.CONVERTER ? n.data.vOut : 0),
        resistance: (n.type === NODE_TYPES.CABLE ? n.data.resistance : 0)
      };
    });

    // PASS 1: Voltage Propagation (Downstream: Source -> Load)
    const queue = nodes.filter(n => n.type === NODE_TYPES.SOURCE).map(n => n.id);
    const processOrder = [];
    const visited = new Set(queue);

    let head = 0;
    while (head < queue.length) {
      const nodeId = queue[head++];
      processOrder.push(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      const stats = nodeStats[nodeId];

      let vOut = 0;
      if (node.type === NODE_TYPES.SOURCE) vOut = node.data.voltage;
      else if (node.type === NODE_TYPES.CONVERTER) vOut = node.data.vOut;


      const childrenEdges = edges.filter(e => e.source === nodeId);
      childrenEdges.forEach(edge => {
        const childId = edge.target;
        if (nodeStats[childId]) nodeStats[childId].voltageIn = vOut;
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
        }
      });
    }

    // PASS 2: Power & Current Calculation (Upstream: Load -> Source)
    for (let i = processOrder.length - 1; i >= 0; i--) {
      const nodeId = processOrder[i];
      const node = nodes.find(n => n.id === nodeId);

      if (node.type === NODE_TYPES.LOAD) {

        const loadStats = nodeStats[nodeId];
        const loadEdge = edges.filter(e => e.target === nodeId);
        const cableNode = nodes.find(n => n.id === loadEdge[0].source);
        const cableStats = nodeStats[cableNode.id];


        cableStats.currentIn = loadStats.currentIn;
        cableStats.currentOut = loadStats.currentIn;
        cableStats.voltageOut = cableStats.voltageIn - cableStats.resistance * cableStats.currentIn;
        loadStats.voltageIn = cableStats.voltageOut;
        loadStats.power = loadStats.voltageIn * loadStats.currentIn;
        cableStats.power = cableStats.currentIn * cableStats.resistance;

      }
      else if (node.type === NODE_TYPES.CONVERTER) {
        const converterStats = nodeStats[nodeId];
        const eff = node.data.efficiency || 1;
        const validEff = eff <= 0 ? 0.01 : eff;
        const outChildrenEdges = edges.filter(e => e.source === nodeId);
        outChildrenEdges.forEach(e => {
          const childStats = nodeStats[e.target];
          converterStats.currentOut += childStats.currentIn;
        });



        const inChildrenEdges = edges.filter(e => e.target === nodeId);
        const checkForCableNode = nodes.find(n => n.id === inChildrenEdges[0].source);
        const powerout = converterStats.currentOut * converterStats.voltageOut;
        converterStats.power = powerout / validEff;
        if (checkForCableNode.type == NODE_TYPES.CABLE) {
          const inputCableStats = nodeStats[checkForCableNode.id];
          const inputCableEdge = edges.filter(e => e.target === checkForCableNode.id);
          const sourceNode = nodes.find(n => n.id === inputCableEdge[0].source);
          const sourceStats = nodeStats[sourceNode.id];
          const a = inputCableStats.resistance;
          const b = -sourceStats.voltageOut;
          const c = converterStats.power;
          converterStats.currentIn = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);


          inputCableStats.currentIn = converterStats.currentIn;
          inputCableStats.currentOut = converterStats.currentIn;

          inputCableStats.voltageOut = inputCableStats.voltageIn - inputCableStats.resistance * inputCableStats.currentIn;
          converterStats.voltageIn = inputCableStats.voltageOut;
          sourceStats.currentOut = inputCableStats.currentIn;
          sourceStats.power = sourceStats.voltageOut * sourceStats.currentOut;
        }


        converterStats.currentIn = converterStats.power / converterStats.voltageIn;
        converterStats.waste = converterStats.power - powerout;





      }




      setCalculatedState(nodeStats);
    }
  }, [nodes, edges]);

  // --- Global System Stats Calculations ---
  const totalInputPower = nodes
    .filter(n => n.type === NODE_TYPES.SOURCE)
    .reduce((acc, n) => acc + (calculatedState[n.id]?.power || 0), 0);

  const totalLoadPower = nodes
    .filter(n => n.type === NODE_TYPES.LOAD)
    .reduce((acc, n) => acc + (calculatedState[n.id]?.power || 0), 0);

  const totalWaste = totalInputPower - totalLoadPower;
  const systemEfficiency = totalInputPower > 0 ? (totalLoadPower / totalInputPower) : 0;

  // --- Drag & Drop Handlers ---
  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    setDraggingId(id);
    // CHANGE: Just set ID here
    setSelectedNodeId(id);
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(nds => nds.map(n => {
      if (n.id === draggingId) {
        return { ...n, x: x - 50, y: y - 30 };
      }
      return n;
    }));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const updateNodeData = (id, field, value) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, [field]: parseFloat(value) } };
      }
      return n;
    }));
  };
  // --- Auto Layout Logic ---
  const handleAutoLayout = () => {
    const depths = {};
    const newNodes = nodes.map(n => ({ ...n })); // Clone to avoid mutation issues

    // Initialize roots (sources) to depth 0
    newNodes.forEach(n => {
      if (n.type === NODE_TYPES.SOURCE) depths[n.id] = 0;
      else depths[n.id] = -1; // Unknown
    });

    // Simple relaxation to find depths (longest path in DAG)
    // Run N times to propagate depths
    for (let i = 0; i < newNodes.length; i++) {
      edges.forEach(e => {
        if (depths[e.source] !== -1) {
          // Child depth is at least Parent + 1
          const newDepth = depths[e.source] + 1;
          if (newDepth > depths[e.target]) {
            depths[e.target] = newDepth;
          }
        }
      });
    }

    // Group by depth
    const layers = [];
    Object.entries(depths).forEach(([id, depth]) => {
      const d = depth === -1 ? 0 : depth; // Default disconnected to 0
      if (!layers[d]) layers[d] = [];
      layers[d].push(id);
    });

    // Assign positions
    const LAYER_WIDTH = 250;
    const NODE_HEIGHT = 120;
    const CANVAS_CENTER_Y = 350; // Approx center of visible area

    layers.forEach((layerIds, depth) => {
      // Sort nodes in layer to keep them somewhat stable? 
      // For now, simple stable sort by ID or just keep existing order
      layerIds.sort();

      const layerHeight = layerIds.length * NODE_HEIGHT;
      const startY = Math.max(50, CANVAS_CENTER_Y - (layerHeight / 2));

      layerIds.forEach((nodeId, index) => {
        const node = newNodes.find(n => n.id === nodeId);
        if (node) {
          node.x = 50 + (depth * LAYER_WIDTH);
          node.y = startY + (index * NODE_HEIGHT);
        }
      });
    });

    setNodes(newNodes);
  };


  // --- Rendering Components ---

  const renderConnection = (edge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!source || !target) return null;

    const startX = source.x + 160;
    const startY = source.y + 45;  // Slightly adjusted for new height
    const endX = target.x;
    const endY = target.y + 45;

    const c1x = startX + 50;
    const c1y = startY;
    const c2x = endX - 50;
    const c2y = endY;

    const pathData = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

    return (
      <g key={edge.id}>
        <path d={pathData} fill="none" stroke="#555" strokeWidth="2" />
        <path d={pathData} fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="5,5" className="animate-pulse opacity-50" />
      </g>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>

      {/* --- Left Sidebar: Controls --- */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col shadow-xl z-10">

        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold flex items-center gap-2 text-green-400">
              <Zap className="fill-current" /> PowerTree
            </h1>
            {/* Auto Layout Button */}
            <button
              onClick={handleAutoLayout}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
              title="Auto Layout Nodes"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          {/* NEW: System Metrics Badge */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/30 p-3 rounded-lg border border-gray-700 shadow-inner">
            <div className="text-gray-400 flex items-center">Efficiency:</div>
            <div className={`text-right font-bold ${systemEfficiency > 0.85 ? 'text-green-400' : systemEfficiency > 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>
              {(systemEfficiency * 100).toFixed(1)}%
            </div>

            <div className="text-gray-400 flex items-center">Wasted Pwr:</div>
            <div className="text-right text-red-400 font-bold">
              {totalWaste.toFixed(2)} W
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Drag nodes to arrange. Edit values to simulate.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedNode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{selectedNode.label}</h2>
                <span className="text-xs px-2 py-1 rounded bg-gray-700 uppercase text-gray-300">{selectedNode.type}</span>
              </div>

              <div className="space-y-4 bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                {selectedNode.type === NODE_TYPES.LOAD && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Load Current (Amps)</label>
                    <input
                      type="number" step="0.1"
                      value={selectedNode.data.current}
                      onChange={(e) => updateNodeData(selectedNode.id, 'current', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-green-400 font-mono focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                )}

                {selectedNode.type === NODE_TYPES.CONVERTER && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Output Voltage (V)</label>
                      <input
                        type="number" step="0.1"
                        value={selectedNode.data.vOut}
                        onChange={(e) => updateNodeData(selectedNode.id, 'vOut', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Efficiency (0.0 - 1.0)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range" min="0.5" max="0.99" step="0.01"
                          value={selectedNode.data.efficiency}
                          onChange={(e) => updateNodeData(selectedNode.id, 'efficiency', e.target.value)}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12">{(selectedNode.data.efficiency * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </>
                )}

                {selectedNode.type === NODE_TYPES.SOURCE && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Source Voltage (Vrms)</label>
                    <input
                      type="number" step="0.1"
                      value={selectedNode.data.voltage}
                      onChange={(e) => updateNodeData(selectedNode.id, 'voltage', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono"
                    />
                  </div>
                )}
                {selectedNode.type === NODE_TYPES.CABLE && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cable Resistance (Ohms)</label>
                    <input
                      type="number" step="0.1"
                      value={selectedNode.data.resistance}
                      onChange={(e) => updateNodeData(selectedNode.id, 'resistance', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {calculatedState[selectedNode.id] && (
                <div className="bg-black/40 p-4 rounded-lg space-y-2 font-mono text-sm border border-gray-700">
                  <div className="text-gray-400 text-xs uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">Live Telemetry</div>

                  {/* Detailed Panel Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-500">Voltage In:</div>
                    <div className="text-right text-blue-300">{calculatedState[selectedNode.id].voltageIn.toFixed(2)} V</div>

                    <div className="text-gray-500">Current In:</div>
                    <div className="text-right text-blue-300">{calculatedState[selectedNode.id].currentIn.toFixed(3)} A</div>

                    <div className="text-gray-500">Voltage Out:</div>
                    <div className="text-right text-green-300">{calculatedState[selectedNode.id].voltageOut.toFixed(2)} V</div>

                    <div className="text-gray-500">Current Out:</div>
                    <div className="text-right text-green-300">{calculatedState[selectedNode.id].currentOut.toFixed(3)} A</div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-gray-400">Power:</span>
                    <span className="text-yellow-400 text-lg font-bold">{calculatedState[selectedNode.id].power.toFixed(2)} W</span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center text-gray-500 mt-10 flex flex-col items-center">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a component to edit its parameters.</p>
            </div>
          )}
        </div>

        {/* Global Summary */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 text-sm font-mono">
          <div className="flex justify-between text-yellow-400 mt-1 text-lg font-bold">
            <span>Total Load (Output):</span>
            <span>{totalLoadPower.toFixed(2)} W</span>
          </div>
          <div className="flex justify-between text-yellow-400 mt-1 text-lg font-bold">
            <span>Total Draw (Input):</span>
            <span>{totalInputPower.toFixed(2)} W</span>
          </div>
        </div>
      </div>

      {/* --- Right Canvas --- */}
      <div className="flex-1 relative bg-black bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]" ref={canvasRef}>

        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {edges.map(renderConnection)}
        </svg>

        {nodes.map(node => {
          const stats = calculatedState[node.id] || { power: 0, voltageIn: 0, currentIn: 0, currentOut: 0, voltageOut: 0, waste: 0 };
          // CHANGE: Use derived selectedNode for styling check
          const isSelected = selectedNodeId === node.id;

          let borderColor = "border-gray-600";
          let icon = <Activity size={16} />;
          let bgColor = "bg-gray-800";

          if (node.type === NODE_TYPES.SOURCE) {
            borderColor = "border-yellow-600";
            icon = <AudioWaveform size={16} className="text-yellow-400" />;
            bgColor = "bg-gray-900";
          } else if (node.type === NODE_TYPES.LOAD) {
            borderColor = "border-blue-600";
            icon = <Cpu size={16} className="text-blue-400" />;
            bgColor = "bg-gray-900";
          } else if (node.type === NODE_TYPES.CONVERTER) {
            borderColor = "border-purple-600";
            icon = <CircuitBoard size={16} className="text-purple-400" />;
          } else if (node.type === NODE_TYPES.CABLE) {
            borderColor = "border-yellow-600";
            icon = <Cable size={16} className="text-purple-400" />;
          }


          return (
            <div
              key={node.id}
              className={`absolute w-40 rounded-md border-2 shadow-lg cursor-move select-none transition-shadow 
                ${borderColor} ${bgColor} ${isSelected ? 'ring-2 ring-white z-20' : 'z-10'} hover:shadow-2xl`}
              style={{ left: node.x, top: node.y, height: 90 }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              <div className="px-3 py-1 bg-gray-800/80 border-b border-gray-700 rounded-t flex items-center justify-between">
                <span className="text-xs font-bold text-gray-200 truncate">{node.label}</span>
                {icon}
              </div>

              <div className="p-2 text-[10px] font-mono space-y-1 leading-tight">
                {/* Voltage Row */}
                <div className="flex justify-between text-gray-400">
                  {node.type === NODE_TYPES.CONVERTER && <span>{stats.voltageIn.toFixed(2)}V</span>}
                  {node.type === NODE_TYPES.CONVERTER && <ArrowRight size={10} className="mt-0.5 opacity-50" />}
                  {node.type === NODE_TYPES.CONVERTER && <span>{stats.voltageOut.toFixed(2)}V</span>}
                  {node.type === NODE_TYPES.CABLE && <span>{stats.voltageIn.toFixed(2)}V</span>}
                  {node.type === NODE_TYPES.CABLE && <ArrowRight size={10} className="mt-0.5 opacity-50" />}
                  {node.type === NODE_TYPES.CABLE && <span>{stats.voltageOut.toFixed(2)}V</span>}

                  {node.type === NODE_TYPES.SOURCE && <span>{stats.voltageOut.toFixed(2)}Vrms</span>}
                  {node.type === NODE_TYPES.LOAD && <span>{stats.voltageIn.toFixed(2)}V</span>}
                </div>

                {/* Current Row (New) */}
                <div className="flex justify-between text-blue-300">
                  {node.type === NODE_TYPES.CONVERTER && <span>{stats.currentIn.toFixed(2)}A</span>}
                  {node.type === NODE_TYPES.CONVERTER && <ArrowRight size={10} className="mt-0.5 opacity-50" />}
                  {node.type === NODE_TYPES.CONVERTER && <span>{stats.currentOut.toFixed(2)}A</span>}
                  {node.type === NODE_TYPES.SOURCE && <span>{stats.currentOut.toFixed(2)}Arms</span>}
                  {node.type === NODE_TYPES.CABLE && <span>{stats.currentOut.toFixed(2)}Arms</span>}
                  {node.type === NODE_TYPES.LOAD && <span>{stats.currentIn.toFixed(2)}A</span>}
                </div>

                {/* Power Row */}
                <div className="flex justify-between text-yellow-500 font-bold pt-1 border-t border-gray-700 mt-1">
                  {node.type === NODE_TYPES.CONVERTER && <span>Budget: {stats.waste.toFixed(2)}W</span>}
                  {node.type === NODE_TYPES.CONVERTER && <span className="text-purple-400">η{(node.data.efficiency * 100).toFixed(0)}</span>}
                  {node.type === NODE_TYPES.CABLE && <span className="text-purple-400">{(node.data.resistance * 1000).toFixed(0)} mR</span>}
                  {node.type === NODE_TYPES.LOAD && <span>Power: {stats.power.toFixed(2)}W</span>}
                  {node.type === NODE_TYPES.SOURCE && <span>Power: {stats.power.toFixed(2)}W</span>}

                </div>
              </div>

              {node.type !== NODE_TYPES.SOURCE && <div className="absolute -left-1.5 top-10 w-3 h-3 bg-white border border-gray-500 rounded-full"></div>}
              {node.type !== NODE_TYPES.LOAD && <div className="absolute -right-1.5 top-10 w-3 h-3 bg-white border border-gray-500 rounded-full"></div>}
            </div>
          );
        })}

      </div>
    </div>
  );
}