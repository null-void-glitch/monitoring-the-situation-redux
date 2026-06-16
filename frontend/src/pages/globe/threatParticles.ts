// ©AngelaMos | 2026
// threatParticles.ts

// @ts-ignore
import * as THREE from 'three'
import type { GlobePoint } from '@/stores/globeEvents'

const MAX_PARTICLES = 3000
const GLOBE_RADIUS = 100

// Major BGP hubs to simulate traffic flow to/from
const HUBS = [
  { lat: 39.04, lng: -77.48 }, // Ashburn
  { lat: 50.11, lng: 8.68 },   // Frankfurt
  { lat: 35.67, lng: 139.65 }, // Tokyo
  { lat: 51.50, lng: -0.12 },  // London
  { lat: 1.35, lng: 103.81 },  // Singapore
  { lat: -33.86, lng: 151.20 },// Sydney
]

const vertexShader = `
uniform float uTime;
attribute vec3 startPos;
attribute vec3 endPos;
attribute float arcHeight;
attribute float startTime;
attribute float speed;
attribute vec3 customColor;

varying float vAlpha;
varying vec3 vColor;

void main() {
    // Determine lifecycle of particle
    float t = fract((uTime - startTime) * speed);
    
    // spherical interpolation (slerp)
    vec3 pA = normalize(startPos);
    vec3 pB = normalize(endPos);
    float cosOmega = dot(pA, pB);
    float omega = acos(cosOmega);
    
    vec3 pos;
    if (omega < 0.001) {
        pos = pA;
    } else {
        float sinOmega = sin(omega);
        pos = (sin((1.0 - t) * omega) / sinOmega) * pA + (sin(t * omega) / sinOmega) * pB;
    }
    
    // Add parabolic arc altitude
    float r = ${GLOBE_RADIUS.toFixed(1)} + sin(t * 3.14159265359) * arcHeight;
    pos *= r;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation based on distance
    gl_PointSize = 4.0 * (150.0 / -mvPosition.z);
    
    // Fade in/out at ends of arc
    vAlpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t);
    vColor = customColor;
}
`

const fragmentShader = `
varying float vAlpha;
varying vec3 vColor;

void main() {
    // Circular particle
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float a = vAlpha * smoothstep(0.5, 0.2, dist);
    gl_FragColor = vec4(vColor, a);
}
`

function polarToCartesian(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (90 - lng) * (Math.PI / 180)
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  )
}

export class ThreatParticleSystem {
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points

  private startPos: Float32Array
  private endPos: Float32Array
  private arcHeight: Float32Array
  private startTime: Float32Array
  private speed: Float32Array
  private customColor: Float32Array

  private activeCount = 0

  constructor() {
    this.geometry = new THREE.BufferGeometry()

    this.startPos = new Float32Array(MAX_PARTICLES * 3)
    this.endPos = new Float32Array(MAX_PARTICLES * 3)
    this.arcHeight = new Float32Array(MAX_PARTICLES)
    this.startTime = new Float32Array(MAX_PARTICLES)
    this.speed = new Float32Array(MAX_PARTICLES)
    this.customColor = new Float32Array(MAX_PARTICLES * 3)

    // Initialize with zeroes
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3))
    this.geometry.setAttribute('startPos', new THREE.BufferAttribute(this.startPos, 3))
    this.geometry.setAttribute('endPos', new THREE.BufferAttribute(this.endPos, 3))
    this.geometry.setAttribute('arcHeight', new THREE.BufferAttribute(this.arcHeight, 1))
    this.geometry.setAttribute('startTime', new THREE.BufferAttribute(this.startTime, 1))
    this.geometry.setAttribute('speed', new THREE.BufferAttribute(this.speed, 1))
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.customColor, 3))

    this.geometry.setDrawRange(0, 0)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    
    // WebGL vertex-shader displacement requires disabling frustum culling,
    // otherwise Three.js culls the object when the original (0,0,0) bounding box is out of view.
    this.points.frustumCulled = false
  }

  getObject = () => this.points

  update = () => {
    this.material.uniforms.uTime.value = performance.now() / 1000.0
  }

  syncEvents = (hijacks: GlobePoint[], scans: GlobePoint[]) => {
    let idx = 0
    const now = performance.now() / 1000.0

    const addParticles = (
      pts: GlobePoint[], 
      getCount: (p: GlobePoint) => number, 
      getDest: (p: GlobePoint, i: number) => THREE.Vector3,
      r: number, g: number, b: number,
      maxLimit: number
    ) => {
      let typeIdx = 0
      for (const p of pts) {
        if (typeIdx >= maxLimit) break
        if (idx >= MAX_PARTICLES) break

        const particlesForThis = getCount(p)
        const source = polarToCartesian(p.lat, p.lng)

        for (let i = 0; i < particlesForThis && typeIdx < maxLimit && idx < MAX_PARTICLES; i++) {
          const dest = getDest(p, i)

          this.startPos[idx * 3] = source.x
          this.startPos[idx * 3 + 1] = source.y
          this.startPos[idx * 3 + 2] = source.z

          this.endPos[idx * 3] = dest.x
          this.endPos[idx * 3 + 1] = dest.y
          this.endPos[idx * 3 + 2] = dest.z

          this.customColor[idx * 3] = r
          this.customColor[idx * 3 + 1] = g
          this.customColor[idx * 3 + 2] = b

          // Height proportional to distance
          const dist = source.distanceTo(dest)
          this.arcHeight[idx] = dist * 20.0 + Math.random() * 5.0

          this.startTime[idx] = now - Math.random() * 10.0 // stagger start times
          this.speed[idx] = 0.2 + Math.random() * 0.2 // 0.2 to 0.4 Hz

          idx++
          typeIdx++
        }
      }
    }

    // Hijacks: Red (#ef4444) -> 239, 68, 68
    addParticles(
      hijacks,
      (p) => {
        const score = (p.meta?.confidenceScore as number) ?? 10
        // Hijacks are critical and rare, they deserve a massive red stream.
        // If score is out of 10 (e.g. 7), this gives 150 + 7*15 = 255 particles
        // If score is out of 100 (e.g. 90), this maxes out at 150 + 200 = 350 particles
        return 150 + Math.min(200, score * 15)
      },
      (p, i) => {
        const hub = HUBS[i % HUBS.length]
        const dest = polarToCartesian(hub.lat, hub.lng)
        dest.x += (Math.random() - 0.5) * 0.2
        dest.y += (Math.random() - 0.5) * 0.2
        dest.z += (Math.random() - 0.5) * 0.2
        return dest.normalize()
      },
      239 / 255, 68 / 255, 68 / 255,
      1500
    )

    // Scans: Blue (#60a5fa) -> 96, 165, 250
    addParticles(
      scans,
      (p) => Math.max(1, Math.min(100, Math.floor(((p.meta?.reports as number) ?? 10) / 10))),
      (p, i) => {
        const targets = (p.meta?.targets as number) ?? 1

        // Targeted attack: focused beam
        if (targets <= 10) {
          const hubIdx = Math.floor(Math.abs(p.lat + p.lng)) % HUBS.length
          const hub = HUBS[hubIdx]
          const dest = polarToCartesian(hub.lat, hub.lng)
          dest.x += (Math.random() - 0.5) * 0.02
          dest.y += (Math.random() - 0.5) * 0.02
          dest.z += (Math.random() - 0.5) * 0.02
          return dest.normalize()
        } 
        
        // Wide scan: completely random scatter
        if (targets >= 50) {
          const dest = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          )
          return dest.normalize()
        }

        // Standard: default hub spread
        const hub = HUBS[i % HUBS.length]
        const dest = polarToCartesian(hub.lat, hub.lng)
        dest.x += (Math.random() - 0.5) * 0.4 // Slightly wider default
        dest.y += (Math.random() - 0.5) * 0.4
        dest.z += (Math.random() - 0.5) * 0.4
        return dest.normalize()
      },
      96 / 255, 165 / 255, 250 / 255,
      1500
    )

    this.activeCount = idx
    this.geometry.setDrawRange(0, this.activeCount)

    this.geometry.attributes.startPos.needsUpdate = true
    this.geometry.attributes.endPos.needsUpdate = true
    this.geometry.attributes.arcHeight.needsUpdate = true
    this.geometry.attributes.startTime.needsUpdate = true
    this.geometry.attributes.speed.needsUpdate = true
    this.geometry.attributes.customColor.needsUpdate = true
  }
}
