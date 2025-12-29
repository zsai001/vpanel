/**
 * Docker Plugin Routes
 * 
 * This file defines all routes for the Docker plugin.
 * The plugin manages its own routing internally.
 */

import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load all pages
const Containers = lazy(() => import('./pages/Containers'));
const ContainerDetail = lazy(() => import('./pages/ContainerDetail'));
const Images = lazy(() => import('./pages/Images'));
const Networks = lazy(() => import('./pages/Networks'));
const Volumes = lazy(() => import('./pages/Volumes'));
const Compose = lazy(() => import('./pages/Compose'));

/**
 * Docker plugin route component
 * Handles all /docker/* routes internally
 */
export default function DockerRoutes() {
  return (
    <Routes>
      <Route path="containers" element={<Containers />} />
      <Route path="containers/:id" element={<ContainerDetail />} />
      <Route path="images" element={<Images />} />
      <Route path="networks" element={<Networks />} />
      <Route path="volumes" element={<Volumes />} />
      <Route path="compose" element={<Compose />} />
      {/* Default redirect to containers */}
      <Route path="" element={<Containers />} />
      <Route path="*" element={<Containers />} />
    </Routes>
  );
}

