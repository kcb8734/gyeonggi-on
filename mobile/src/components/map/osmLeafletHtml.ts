export const OSM_LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#e5e7eb; }
    .leaflet-container { width:100%; height:100%; }
    .leaflet-marker-icon, .leaflet-div-icon, .onandon-pin {
      background: transparent !important; border: none !important;
    }
    .onandon-pin { display:flex; align-items:center; justify-content:center; }
    .onandon-pin-hit { display:flex; align-items:center; justify-content:center; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var COLOR = { red:'#E0392A', green:'#16A34A', orange:'#F59E0B', blue:'#2563EB', violet:'#7C3AED', teal:'#0D9488', gray:'#6B7280' };
    var map = L.map('map', { zoomControl: true, fadeAnimation: false, zoomAnimation: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map);
    var layer = L.layerGroup().addTo(map);
    map.setView([37.4138, 127.5183], 9);
    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function regionToZoom(d) {
      if (d > 1.2) return 8;
      if (d > 0.6) return 9;
      if (d > 0.35) return 10;
      if (d > 0.15) return 11;
      if (d > 0.06) return 13;
      if (d > 0.03) return 14;
      return 15;
    }
    window.__onandonSetView = function(lat, lng, delta) {
      map.setView([lat, lng], regionToZoom(delta || 0.2), { animate: false });
      setTimeout(function() { map.invalidateSize(); }, 50);
    };
    window.__onandonFit = function(coords, pad) {
      if (!coords || !coords.length) return;
      if (coords.length === 1) {
        map.setView([coords[0].latitude, coords[0].longitude], 13);
        return;
      }
      var bounds = L.latLngBounds(coords.map(function(p) { return [p.latitude, p.longitude]; }));
      map.fitBounds(bounds, { padding: [pad || 40, pad || 40] });
    };
    window.__onandonPaint = function(overlays) {
      layer.clearLayers();
      (overlays || []).forEach(function(item) {
        if (item.type === 'line') {
          var pts = (item.points || []).map(function(p) { return [p.latitude, p.longitude]; });
          if (pts.length < 2) return;
          L.polyline(pts, {
            color: item.color || '#0047FF',
            weight: item.weight || 4,
            dashArray: (item.dash || [6, 8]).join(', '),
            opacity: 0.8
          }).addTo(layer);
          return;
        }
        var color = COLOR[item.pinColor] || item.pinColor || '#E0392A';
        var emphasized = !!item.emphasized;
        var width = item.badgeLabel ? (emphasized ? 44 : 36) : 22;
        var height = item.badgeLabel ? (emphasized ? 28 : 24) : 22;
        var fontSize = emphasized ? 12 : 11;
        var html = item.badgeLabel
          ? '<div class="onandon-pin-hit" style="width:' + width + 'px;height:' + height + 'px"><div style="min-width:' + height + 'px;height:' + height + 'px;padding:0 7px;background:' + color + ';color:#fff;border:2px solid #fff;border-radius:' + (height / 2) + 'px;box-shadow:0 2px 6px rgba(0,0,0,.25);font:800 ' + fontSize + 'px/' + (height - 4) + 'px sans-serif;text-align:center;white-space:nowrap">' + item.badgeLabel + '</div></div>'
          : '<div class="onandon-pin-hit" style="width:' + width + 'px;height:' + height + 'px"><div style="width:16px;height:16px;background:' + color + ';border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div></div>';
        var pin = L.marker([item.latitude, item.longitude], {
          icon: L.divIcon({ className: 'leaflet-div-icon onandon-pin', html: html, iconSize: [width, height], iconAnchor: [width / 2, height / 2] }),
          title: item.title || '',
          interactive: item.interactive !== false,
          zIndexOffset: Number(item.zIndex || 0) * 10
        });
        if (item.interactive !== false) {
          pin.on('click', function() { post({ type: 'press', id: item.id }); });
        }
        pin.addTo(layer);
      });
    };
    window.__onandonInvalidate = function() { map.invalidateSize(); };
    map.on('moveend', function() {
      var c = map.getCenter();
      var z = map.getZoom();
      var delta = z >= 14 ? 0.02 : z >= 12 ? 0.06 : z >= 10 ? 0.2 : 0.8;
      post({ type: 'region', latitude: c.lat, longitude: c.lng, latitudeDelta: delta, longitudeDelta: delta });
    });
    setTimeout(function() {
      map.invalidateSize();
      post({ type: 'ready' });
    }, 80);
  </script>
</body>
</html>`;
