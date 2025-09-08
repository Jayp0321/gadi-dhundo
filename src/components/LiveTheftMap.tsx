import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, AlertTriangle, Clock, Car, Users, ExternalLink, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ReportDetailsDialog } from './ReportDetailsDialog';
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

export const LiveTheftMap = () => {
  const [reports, setReports] = useState<TheftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TheftReport | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Load active theft reports
  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('category', 'vehicle')
        .gte('expiry_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open location in maps
  const openInMaps = (lat: number, lon: number, vehicleNo: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}&z=15`;
    window.open(url, '_blank');
  };

  // Handle view details
  const handleViewDetails = (report: TheftReport) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'destructive';
      case 'found':
        return 'default';
      case 'resolved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-3 w-3" />;
      case 'found':
        return <Car className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    loadReports();

    // Subscribe to new reports
    const channel = supabase
      .channel('live_reports')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
          filter: 'category=eq.vehicle'
        },
        (payload) => {
          console.log('New report received:', payload);
          loadReports(); // Reload to maintain proper ordering
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reports',
          filter: 'category=eq.vehicle'
        },
        (payload) => {
          console.log('Report updated:', payload);
          loadReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Live Theft Alert Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeReports = reports.filter(r => r.status === 'active');
  const foundReports = reports.filter(r => r.status === 'found');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Live Theft Alert Map
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {activeReports.length} Active
            </Badge>
            {foundReports.length > 0 && (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                <Car className="h-3 w-3" />
                {foundReports.length} Found
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Real-time theft reports and recovery updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-700 mb-2">All Clear!</h3>
            <p className="text-sm text-muted-foreground">No active theft reports in your area</p>
            <Badge variant="outline" className="mt-2 text-green-700 border-green-300">
              Area Safe
            </Badge>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4 border-b border-border">
              <h3 className="font-semibold text-destructive mb-2 flex items-center justify-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts
              </h3>
              <p className="text-sm text-muted-foreground">
                Interactive map functionality coming soon
              </p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {reports.map((report) => (
                <Card key={report.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getStatusColor(report.status)} className="flex items-center gap-1">
                            {getStatusIcon(report.status)}
                            {report.vehicle_no}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(report.radius_m / 1000).toFixed(1)}km radius
                          </Badge>
                        </div>
                        
                        {report.description && (
                          <p className="text-sm text-muted-foreground">
                            {report.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </div>
                          
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs mr-2"
                            onClick={() => openInMaps(report.lat, report.lon, report.vehicle_no)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Location
                          </Button>

                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => handleViewDetails(report)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                      
                      {report.photo_url && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                          <EvidenceImage
                            photoUrl={report.photo_url}
                            alt="Evidence"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <ReportDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        report={selectedReport}
      />
    </Card>
  );
};