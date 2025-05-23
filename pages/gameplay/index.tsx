import React from 'react';
import { createRoot } from 'react-dom/client';
import GameTable from './components/GameTable';

const root = createRoot(document.getElementById('root')!);
root.render(
    <React.StrictMode>
        <GameTable />
    </React.StrictMode>
); 