import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Car, Clock, MapPin, AlertTriangle, Eye } from 'lucide-react';
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

export const UserReports = () => {
  const [reports, setReports] = useState<TheftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TheftReport | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { user } = useAuth();

  // Load user's theft reports
  const loadUserReports = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading user reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: TheftReport) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
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
        return <AlertTriangle className="h-3 w-3" />;
      case 'found':
        return <Car className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  };

  // Setup real-time subscription for user's reports
  useEffect(() => {
    loadUserReports();

    if (!user) return;

    // Subscribe to changes in user's reports
    const channel = supabase
      .channel('user_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('User report updated:', payload);
          loadUserReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            My Reports
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            My Reports
          </CardTitle>
          <CardDescription>
            View and manage your submitted theft reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-muted-foreground mb-2">No Reports Yet</h3>
              <p className="text-sm text-muted-foreground">You haven't submitted any theft reports</p>
            </div>
          ) : (
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
                            {report.status}
                          </Badge>
                          {new Date(report.expiry_at) > new Date() && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              Active
                            </Badge>
                          )}
                        </div>
                        
                        {report.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
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
                            className="h-auto p-0 text-xs"
                            onClick={() => handleViewDetails(report)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                      
                      {report.photo_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
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
          )}
        </CardContent>
      </Card>

      <ReportDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        report={selectedReport}
      />
    </>
  );
};