import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, MapPin, Clock, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationAlert {
  id: string;
  report_id: string;
  sender_user_id: string;
  message: string;
  alert_type: string;
  distance_meters: number;
  status: string;
  read_at: string | null;
  created_at: string;
}

interface Report {
  id: string;
  vehicle_no: string;
  lat: number;
  lon: number;
  status: string;
}

export const LiveNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [reports, setReports] = useState<{ [key: string]: Report }>({});
  const [loading, setLoading] = useState(true);

  // Load notifications and reports separately
  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      // Get notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notification_alerts')
        .select('*')
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationError) throw notificationError;
      
      setNotifications(notificationData || []);

      // Get related reports
      if (notificationData && notificationData.length > 0) {
        const reportIds = notificationData.map(n => n.report_id);
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('id, vehicle_no, lat, lon, status')
          .in('id', reportIds);

        if (reportError) throw reportError;

        // Create a map of report_id -> report data
        const reportMap: { [key: string]: Report } = {};
        reportData?.forEach(report => {
          reportMap[report.id] = report;
        });
        setReports(reportMap);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_alerts')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Open location in maps
  const openInMaps = (lat: number, lon: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, '_blank');
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notification_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_alerts',
          filter: `recipient_user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          // Show toast notification
          toast({
            title: "🚨 New Theft Alert!",
            description: payload.new.message?.slice(0, 100) + (payload.new.message?.length > 100 ? '...' : ''),
          });

          // Reload notifications to get the updated data
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Live Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Live Alerts
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Real-time theft alerts from your area
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No alerts yet</p>
            <p className="text-sm text-muted-foreground">You'll see theft reports from your area here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => {
              const report = reports[notification.report_id];
              return (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    notification.read_at 
                      ? 'bg-background border-border' 
                      : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {report && (
                          <Badge variant="destructive" className="text-xs">
                            {report.vehicle_no}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {(notification.distance_meters / 1000).toFixed(1)}km away
                        </Badge>
                        {report?.status === 'found' && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            Recovered
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-foreground">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                        
                        {report && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => openInMaps(report.lat, report.lon)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            View Location
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!notification.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {notification.read_at && (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};