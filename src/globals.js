// Vendor globals — MUST be the first import in main.jsx.
//
// The app's modules were written against browser globals (window.React,
// window.pdfjsLib, bare `Icon`, …). Instead of rewriting ~200KB of JSX to
// explicit imports in one risky sweep, this module pins the exact same
// globals from npm packages (production builds, bundled by Vite) before any
// app module executes. App files register their own public symbols on
// `window` the same way.

import React from 'react';
import ReactDOM from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import LZString from 'lz-string';

window.React = React;
window.ReactDOM = ReactDOM;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
window.pdfjsLib = pdfjsLib;

window.jspdf = { jsPDF };
window.jsPDF = jsPDF;
window.html2canvas = html2canvas;
window.LZString = LZString;
