Power Tree Designer

A web-based interactive tool for hardware engineers and system designers to visualize power distribution networks (Power Trees) and calculate system efficiency in real-time.

⚡ Features

Interactive Canvas: Drag and drop components (Batteries, DC/DC Converters, Loads) to organize your system architecture.

Real-Time Simulation: Instantly calculates power requirements, currents, and voltages across the entire tree.

Bi-Directional Logic:

Voltage Propagation: Flows downstream from Source to Loads.

Power Calculation: Flows upstream from Loads to Source, factoring in converter efficiency.

System Telemetry: Live dashboard showing Overall System Efficiency and Total Power Wasted (Heat).

Editable Parameters:

Source: Set voltage limits.

Converters: Adjust Output Voltage ($V_{out}$) and Efficiency ($\eta$).

Loads: Set Current Draw ($I_{load}$).

🚀 Getting Started

Prerequisites

Node.js (v14 or higher)

npm or yarn

Installation

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
