// Entry point — import order matters: globals first, then components (which
// register window.Icon/Modal/…), then the rest in dependency order, and
// finally app.jsx which mounts <App/> into #root.

import './globals.js';
import '../styles.css';

import './components.jsx';
import './documents.jsx';
import './signature-pad.jsx';
import './editor.jsx';
import './client-view.jsx';
import './app.jsx';
