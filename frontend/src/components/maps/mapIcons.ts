import L from 'leaflet';

/**
 * DivIcon markers (pure HTML/SVG) — avoids Leaflet's default PNG marker paths,
 * which break under bundlers.
 */
const svg = {
  store:
    '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
};

function makeIcon(path: string, bg: string, opts: { pulse?: boolean; size?: number } = {}): L.DivIcon {
  const size = opts.size ?? 36;
  const html = `
    <div class="qd-marker${opts.pulse ? ' qd-marker--pulse' : ''}" style="--qd-bg:${bg};width:${size}px;height:${size}px">
      <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.5)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
    </div>`;
  return L.divIcon({
    html,
    className: 'qd-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export const vendorIcon = makeIcon(svg.store, '#7c3aed');
export const destinationIcon = makeIcon(svg.home, '#2563eb');
export const riderIcon = makeIcon(svg.bike, '#059669', { pulse: true, size: 40 });
export const riderIdleIcon = makeIcon(svg.bike, '#64748b', { size: 34 });
export const customerIcon = makeIcon(svg.user, '#0ea5e9', { size: 30 });
export const pinIcon = makeIcon(svg.pin, '#dc2626');
