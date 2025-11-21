# Power Tree Designer
![Screenshot](/src/assets/powertree.png)

A web-based interactive tool for hardware engineers and system designers to visualize power distribution networks (Power Trees) and calculate system efficiency in real-time.

## ⚡ Features

- Interactive Canvas: Drag and drop components (Batteries, DC/DC Converters, Loads) to organize your system architecture.
- Auto Layout Botton: Roughly places components for easy dragging
- Real-Time Simulation: Instantly calculates power requirements, currents, and voltages across the entire tree.

## Editable Parameters:
- Source: Set voltage limits.
- Converters: Adjust Output Voltage ($V_{out}$) and Efficiency ($\eta$).
- Loads: Set Current Draw ($I_{load}$).
- Cables: Set Resistance ($R_{cable}$).

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

Clone the repository (or create a new Vite project):

    npm create vite@latest power-tree -- --template react
    cd power-tree


Install Dependencies:
This project requires lucide-react for icons and a standard React setup.

    npm install
    npm install lucide-react

Setup Tailwind CSS:
This project relies heavily on Tailwind for styling just follow the install guide

https://tailwindcss.com/docs/installation/using-vite

Run the Development Server:

    npm run dev

Edit the Structure in the App.jsx

    const INITIAL_NODES = [
        { id: 'ac1', type: NODE_TYPES.SOURCE, x: 50, y: 250, label: 'QSW AC Source', data: { voltage: 90, powerMax: 200 } },
        { id: 'inputcable', type: NODE_TYPES.CABLE, x: 50, y: 250, label: 'Input Cable', data: { resistance: 0.01 } } ]
    

    const INITIAL_EDGES = [
        { id: 'e1', source: 'ac1', target: 'inputcable' },
        { id: 'e2', source: 'inputcable', target: 'boost' } ]
