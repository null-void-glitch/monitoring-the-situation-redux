# WebGL Threat Visualization & Outage Pulsing Updates

This document outlines the architectural changes, features, and optimizations implemented to upgrade the generic 3D globe into a high-performance, real-time cyber threat visualization map.

## Overview
The primary goal was to transition the globe from displaying static "discrete events" (dots/pins) into a highly dynamic, "pew-pew" style threat map. We achieved this by implementing a custom WebGL particle system for traffic flows (BGP Hijacks and Port Scans) and dynamic material updates for affected country polygons (Internet Outages). 

---

## 1. WebGL Particle Flow System (`ThreatParticleSystem`)

Instead of relying on standard React DOM elements or simple lines its using a raw, GPU-accelerated particle system using **Three.js** to run on top of `react-globe.gl`.

* **Custom Shaders**: The system utilizes a `ShaderMaterial` with custom Vertex and Fragment GLSL shaders. 
* **GPU-Side Mathematics**: All complex mathematics—including the Spherical Linear Interpolation (`slerp`) across the globe surface and parabolic altitude arcs—are executed concurrently on the GPU vertex shader. This eliminates CPU bottlenecking.
* **Continuous Flow**: Particles utilize a `uTime` uniform driven by a 60fps `requestAnimationFrame` loop, allowing them to flow continuously from their origin to major internet backbone hubs (e.g., Frankfurt, Ashburn, Tokyo).
* **Hard Capped Budget**: For maximum performance on lower-end machines, the buffer geometry is pre-allocated and strictly capped at `4000` active particles per frame. 

## 2. Dynamic Threat Mapping & Scaling

The particle system was generalized to accept multiple types of threats simultaneously, differentiated by color and intensity:

* **BGP Hijacks (Red - `#ef4444`)**: Hijack intensity is mapped directly to the event's `confidenceScore`. Higher confidence results in a denser stream of red particles flowing out of the victim country.
* **DShield Port Scans (Blue - `#60a5fa`)**: Scanning volume is mapped to the `reports` count from DShield. Massive botnets trigger heavy blue streams, while low-and-slow scanners emit only a few warning particles.
* **Guaranteed Visibility**: To ensure no threat goes entirely unnoticed, the scaling logic enforces a strict `Math.max(1, ...)` floor, guaranteeing at least one particle spawns even for lowest-volume events.
* **Precise IP Geolocation**: By integrating the `ip-api.com` service directly into the backend `Enricher` module, the visualization now resolves exact coordinate locations for malicious scanning sources instead of relying solely on generic country centroids.
* **Target-Based Particle Density**: The physical spread of the particle stream (`jitterScale`) dynamically adapts to the attacker's methodology. Targeted attacks (<= 10 distinct targets) route particles into a tight, deterministic beam hitting a single hub. Widespread internet sweeps (>= 100 distinct targets) trigger a massive jitter multiplier, scattering the particles randomly across the globe to visualize the "shotgun" approach.

## 3. Dynamic Outage Pulsing

When a country experiences an active internet outage, the dashboard now renders its physical landmass polygon in a pulsing red color, effectively turning the country into an active "alarm".

* **Non-Blocking Architecture**: Modifying React state at 60fps to change colors would force `react-globe.gl` to re-render the entire DOM structure continuously, ruining performance. Instead, we bypass React entirely by modifying the `globeRef` properties directly within an independent `requestAnimationFrame` loop.
* **Severity-Based Speed**: The speed/frequency of the pulse is scaled proportionally to the `asnsCount` (the number of Autonomous System Numbers affected). A country-wide blackout will pulse violently, while a localized ISP outage will pulse slowly.
* **Material Caching Optimization (The 10-Step Quantize)**: `react-globe.gl` caches Three.js polygon materials by their exact CSS string value. To prevent memory leaks from generating thousands of unique materials for every microsecond of a sine wave, we quantized the alpha transparency to exactly 10 distinct steps (e.g., `0.3`, `0.4`, `0.5`).

## 4. Notable Edge Cases Solved

* **The WebGL Frustum Culling Ghost Bug**: Because the CPU was unaware that the vertex shader was pushing particles thousands of miles across the globe, Three.js assumed all 2000 particles were sitting at `[0,0,0]` inside the earth. When the camera panned, it aggressively culled the entire layer. We resolved this by explicitly disabling Frustum Culling (`this.points.frustumCulled = false`).
* **Garbage Collection Deletion**: Passing an inline `[{}]` array to `react-globe.gl`'s `customLayerData` prop forced the engine to see a "new" layer on every hover interaction. This caused the engine to continuously `.dispose()` and permanently delete the GPU buffers. We fixed this by stabilizing the array reference via `useMemo`.

## 5. Intelligence Profile & Data Enrichment

The generic UI was heavily expanded to turn the dashboard into a more actionable threat intelligence platform.

* **Country Intelligence Profiles**: Replacing the basic counter, clicking on any country on the globe now triggers a full modal overlay. This profile dynamically filters all active frontend stores to present a consolidated dossier on the region, fully detailing local Outages, BGP Hijacks, Ransomware Victims, Active Scans, and Local News.
* **MITRE ATT&CK Enrichment**: Built a backend enrichment pipeline (`actor_tactics.yaml`) that tags known ransomware threat actors with their associated MITRE ATT&CK techniques (e.g., T1486 for Data Encrypted for Impact).
* **Interactive Intel Badges**: MITRE techniques are now rendered as interactive, color-coded badges next to victims in both the Ransomware Panel and Country Profile. Clicking a badge directly opens the official MITRE methodology documentation.
* **Unmapped Actor Logging**: Implemented a thread-safe background logger (`unmapped_actors.txt`) that tracks any newly discovered ransomware groups, allowing operators to quickly identify missing actors and update the YAML mapping.
* **Pipeline Resilience**: Debugged and resolved silent ingestion failures in the Cloudflare Radar pipeline by aligning struct tags with undocumented `snake_case` API changes and building a custom time parser to securely handle timestamps missing `Z` UTC offsets.

## 6. Performance Constraints & Pipeline Adjustments

* **Strict Particle Allocation Limits**: Due to the unpredictable volume of threat events (e.g., hundreds of simultaneous BGP hijacks), the single shared particle budget (`MAX_PARTICLES = 3000`) caused one threat type to monopolize the GPU queue and "drown out" other concurrent events like port scans. This also resulted in severe CPU overhead when processing unused spherical coordinates. We resolved this by implementing strict, per-type allocation caps (1500 particles per threat type) and short-circuiting the coordinate loops once the limit is hit.
* **Unbounded Confidence Scores**: Identified that Cloudflare Radar's BGP Hijack `confidence_score` operates on an unbounded, additive tag-based system rather than a strict 1-10 scale. Updated the JSON parsing schema to correctly map the `snake_case` API response keys, removed the confusing `/10` suffix from the UI profiles, and introduced a strict frontend rendering filter. To drastically reduce visual clutter on the 3D globe, BGP hijacks with a confidence score under 6 are now dropped from the particle stream entirely, while remaining accessible in the side panels and tickers.
* **UI Pacing**: Increased the Bottom Ticker marquee animation speed to 40px/s for improved readability and pacing alongside the active 3D visualization.

## 7. General UI and QoL additions
* **Option to place panels**: Added the option to drag panels to a different postion, making it possible to customize the panel locations.
* **Added some more colorthemes**: Added a number of different color-themes to add some variety.
* **Moved Tanstack button**: Moved the large Tanstack button on the bottom right up to the topbar.
* **More clickable items**: Made the CVE ids clickable to directly jump to the explanation.
* **Added additional Sources**: Added some newsfeeds (reuters, bleebingcomputer...) as well as some more stock exchange indices.
* **Limit earthquake pins**: Pins for earthquakes now only show up for quakes that are above 5 on the richter scale.
