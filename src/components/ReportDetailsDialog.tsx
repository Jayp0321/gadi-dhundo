import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Car, AlertTriangle, ExternalLink, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EvidenceImage } from './EvidenceImage';

interface TheftReport {
  id: string;
  vehicle_no: string;
  description: string;
  lat: number;
  lon: number;
  status: string;
  created_at: string;
  expiry_at: string;
  photo_url: string | null;
  radius_m: number;
  user_id: string;
}

interface ReportDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TheftReport | null;
}

export const ReportDetailsDialog: React.FC<ReportDetailsDialogProps> = ({
  open,
  onOpenChange,
  report
}) => {
  if (!report) return null;

  const openInMaps = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}&z=15`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'pending':
        return 'destructive';
      case 'found':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'pending':
        return <AlertTriangle className="h-4 w-4" />;
      case 'found':
        return <Car className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-destructive" />
            Theft Report Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this vehicle theft report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(report.status)} className="flex items-center gap-1">
                {getStatusIcon(report.status)}
                {report.vehicle_no}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Status: {report.status}
              </Badge>
            </div>
            
            {report.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description:</h4>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {report.description}
                </p>
              </div>
            )}
          </div>

          {/* Evidence Photo */}
          {report.photo_url && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Camera className="h-4 w-4" />
                Evidence Photo:
              </h4>
              <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                <EvidenceImage
                  photoUrl={report.photo_url}
                  alt="Evidence"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Location & Time Info */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reported:</span>
              <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Alert Radius:</span>
              <span>{(report.radius_m / 1000).toFixed(1)}km</span>
            </div>

            <Button
              onClick={() => openInMaps(report.lat, report.lon)}
              className="w-full"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Location on Maps
            </Button>
          </div>

          {/* Report ID */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Report ID: {report.id.slice(0, 8)}...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};