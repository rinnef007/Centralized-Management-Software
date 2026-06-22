import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const statusColor = (status) => ({
  online: '#22c55e', offline: '#ef4444', warning: '#f59e0b', maintenance: '#3b82f6'
}[status] || '#94a3b8');

const typeConfig = {
  cctv: { radius: 5, label: 'CCTV' },
  vds: { radius: 7, label: 'VDS' },
  bridge: { radius: 5, label: 'Cầu vượt' },
  anpr: { radius: 5, label: 'ANPR' },
};

export default function GISMap() {
  const [gisData, setGisData] = useState({ cameras: [], vms: [], stations: [] });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get('/api/dashboard/gis').then(res => setGisData(res.data)).catch(() => {});
  }, []);

  const filteredCameras = filter === 'all' ? gisData.cameras : gisData.cameras.filter(c => c.camera_type === filter);

  const centerLat = 20.65;
  const centerLng = 106.4;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Bản đồ GIS - Tuyến đường</h3>
        <div className="flex gap-1">
          {['all', 'cctv', 'vds', 'bridge'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-2 py-1 rounded ${filter === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'all' ? 'Tất cả' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-2 text-xs text-slate-400">
        {[['#22c55e', 'Hoạt động'], ['#ef4444', 'Mất kết nối'], ['#f59e0b', 'Cảnh báo'], ['#3b82f6', 'Trạm']].map(([c, l]) => (
          <div key={l} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {l}
          </div>
        ))}
      </div>

      <div className="flex-1 rounded-lg overflow-hidden" style={{ minHeight: '350px' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Stations */}
          {gisData.stations.map(st => (
            st.lat && st.lng && (
              <Marker key={`st-${st.id}`} position={[st.lat, st.lng]}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{st.name}</p>
                    <p className="text-gray-600">KM: {st.km_marker}</p>
                    <p>Làn: {st.lane_count}</p>
                  </div>
                </Popup>
                <Tooltip>{st.code}</Tooltip>
              </Marker>
            )
          ))}

          {/* Cameras */}
          {filteredCameras.map(cam => (
            cam.lat && cam.lng && (
              <CircleMarker
                key={`cam-${cam.id}`}
                center={[cam.lat, cam.lng]}
                radius={typeConfig[cam.camera_type]?.radius || 5}
                pathOptions={{
                  fillColor: statusColor(cam.status),
                  color: statusColor(cam.status),
                  fillOpacity: 0.8,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{cam.name}</p>
                    <p className="text-gray-600">Loại: {typeConfig[cam.camera_type]?.label}</p>
                    <p>IP: {cam.ip_address}</p>
                    <p>VLAN: {cam.vlan_id}</p>
                    <p>Trạng thái: <span style={{ color: statusColor(cam.status) }}>{cam.status}</span></p>
                  </div>
                </Popup>
                <Tooltip>{cam.camera_code}</Tooltip>
              </CircleMarker>
            )
          ))}

          {/* VMS Signs */}
          {gisData.vms.map(vms => (
            vms.lat && vms.lng && (
              <CircleMarker
                key={`vms-${vms.id}`}
                center={[vms.lat, vms.lng]}
                radius={8}
                pathOptions={{ fillColor: '#f59e0b', color: '#d97706', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{vms.name}</p>
                    <p className="text-gray-600">Nội dung: {vms.current_message}</p>
                    <p>Trạng thái: {vms.status}</p>
                  </div>
                </Popup>
                <Tooltip>{vms.sign_code}</Tooltip>
              </CircleMarker>
            )
          ))}
        </MapContainer>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span>Camera: {filteredCameras.length}</span>
        <span>VMS: {gisData.vms.length}</span>
        <span>Trạm: {gisData.stations.length}</span>
      </div>
    </div>
  );
}
