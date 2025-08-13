# Project Overview

This project is a modern TypeScript Minecraft clone that utilizes an Entity-Component-System (ECS) architecture for its game logic. It features both single-player and multi-player modes, with a dedicated WebSocket server for handling multi-player interactions, world data, and game state.

**Key Technologies:**

*   **Frontend:** TypeScript, Vite, Three.js (for 3D rendering)
*   **Backend:** TypeScript, Node.js, WebSockets (`ws` library)
*   **Architecture:** Entity-Component-System (ECS)

**Core Features:**

*   Procedural world generation
*   Player movement, physics, and collision detection
*   Block placement and destruction
*   Basic inventory system
*   Time of day and weather cycles
*   Multiplayer support via WebSockets

# Building and Running

This project uses `npm` for package management and `Vite` for the frontend build process. `tsx` is used to run the TypeScript server directly.

**Prerequisites:**

*   Node.js (LTS recommended)
*   npm

**Installation:**

1.  Navigate to the project root directory.
2.  Install dependencies:
    ```bash
    npm install
    ```

**Running in Development Mode (Frontend & Backend):**

This command starts both the frontend development server (Vite) and the backend WebSocket server with hot-reloading.

```bash
npm start
```

*   Frontend will be accessible at `http://localhost:3000`.
*   Backend WebSocket server will listen on `ws://localhost:8080`.

**Running Frontend Only (Development):**

```bash
npm run dev
```

**Running Backend Server Only (Development with hot-reloading):**

```bash
npm run server:dev
```

**Building the Project:**

To build the frontend for production:

```bash
npm run build
```

To build the backend server:

```bash
npm run build:server
```

**Previewing the Production Build:**

```bash
npm run preview
```

# Development Conventions

*   **Language:** TypeScript
*   **Frontend Framework:** Three.js with a custom ECS implementation.
*   **Backend:** Node.js with WebSockets.
*   **Code Structure:** The project follows an ECS pattern, with `src/core` containing the ECS implementation, `src/components` for data components, and `src/systems` for logic.
*   **Aliases:** The `@` alias is configured in `vite.config.ts` to resolve to the `src` directory, e.g., `import { ECS } from '@/core/ECS'`.
*   **Server-Client Communication:** Uses WebSockets for real-time updates between the client and server. Messages are JSON-formatted and typed using interfaces defined in `src/types/server.ts`.
*   **World Data:** The server loads and saves world block data to `world.json`.
*   **Game Modes:** Supports single-player and multi-player modes, determined by URL parameters on the frontend. Multi-player mode connects to the WebSocket server.
