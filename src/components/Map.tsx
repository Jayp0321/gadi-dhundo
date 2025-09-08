import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '@/hooks/useLocation';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different report types
const dangerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const verifiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Report {
  id: string;
  vehicle_no: string;
  description: string;
  photo_url?: string;
  lat: number;
  lon: number;
  status: string;
  created_at: string;
}

interface MapProps {
  reports: Report[];
  onReportClick?: (report: Report) => void;
}

const LocationMarker: React.FC = () => {
  const location = useLocation();
  const map = useMap();

  useEffect(() => {
    if (location.latitude && location.longitude && !location.loading) {
      map.setView([location.latitude, location.longitude], 13);
    }
  }, [location, map]);

  if (location.loading || !location.latitude || !location.longitude) {
    return null;
  }

  return (
    <Marker position={[location.latitude, location.longitude]}>
      <Popup>Your current location</Popup>
    </Marker>
  );
};

export const Map: React.FC<MapProps> = ({ reports, onReportClick }) => {
  const location = useLocation();
  
  const defaultCenter: [number, number] = location.latitude && location.longitude 
    ? [location.latitude, location.longitude] 
    : [28.6139, 77.2090]; // Default to Delhi

  return (
    <div className="h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationMarker />
        
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.lat, report.lon]}
            icon={report.status === 'verified' ? verifiedIcon : dangerIcon}
            eventHandlers={{
              click: () => onReportClick?.(report)
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <h3 className="font-semibold text-danger mb-2">Theft Alert</h3>
                <p className="text-sm mb-1"><strong>Vehicle:</strong> {report.vehicle_no}</p>
                <p className="text-sm mb-2">{report.description}</p>
                {report.photo_url && (
                  <img 
                    src={report.photo_url} 
                    alt="Evidence" 
                    className="w-full h-24 object-cover rounded mb-2" 
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleString()}
                </p>
                <div className="mt-2 space-x-2">
                  <button className="text-xs bg-success text-success-foreground px-2 py-1 rounded">
                    I Saw This
                  </button>
                  <button className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    False Report
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};