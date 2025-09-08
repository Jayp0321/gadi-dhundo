import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface SimpleMapProps {
  reports: Report[];
}

export const SimpleMap: React.FC<SimpleMapProps> = ({ reports }) => {
  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-green-50 p-4 flex flex-col">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MapPin className="h-8 w-8 text-primary" />
          <h2 className="text-xl font-bold">Live Theft Alert Map</h2>
        </div>
        <p className="text-muted-foreground">Interactive map coming soon - showing reports below</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reports.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">All Clear!</h3>
                <p className="text-muted-foreground">No active theft reports in your area</p>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Area Safe
                </Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Alerts ({reports.length})
            </h3>
            {reports.map((report) => (
              <Card key={report.id} className="border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>🚨 {report.vehicle_no}</span>
                    <Badge variant={report.status === 'verified' ? 'default' : 'destructive'}>
                      {report.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm mb-2">{report.description}</p>
                  <div className="text-xs text-muted-foreground">
                    📍 Location: {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    🕒 {new Date(report.created_at).toLocaleString()}
                  </div>
                  {report.photo_url && (
                    <img
                      src={report.photo_url}
                      alt="Evidence"
                      className="mt-2 w-full h-20 object-cover rounded"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};