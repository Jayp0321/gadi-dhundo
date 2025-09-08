import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Users, AlertTriangle, Camera, Send } from 'lucide-react';

interface TheftReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TheftReportDialog = ({ open, onOpenChange }: TheftReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    vehicleNo: '',
    description: '',
    message: ''
  });
  const [alertRadius, setAlertRadius] = useState([1000]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [usersInRange, setUsersInRange] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate users in range when radius changes
  React.useEffect(() => {
    if (location.latitude && location.longitude && !location.loading) {
      calculateUsersInRange();
    }
  }, [alertRadius, location.latitude, location.longitude]);

  const calculateUsersInRange = async () => {
    if (!location.latitude || !location.longitude) return;

    try {
      const { data, error } = await supabase.rpc('get_users_in_range', {
        center_lat: location.latitude,
        center_lon: location.longitude,
        radius_meters: alertRadius[0]
      });

      if (error) throw error;
      setUsersInRange(data?.length || 0);
    } catch (error) {
      console.error('Error calculating users in range:', error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // For private buckets, we need to get a signed URL instead of public URL
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('evidence')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        // Fallback to the path, we'll handle signed URLs in display components
        return filePath;
      }

      return signedUrl.signedUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const sendAlertsToUsers = async (reportId: string) => {
    if (!location.latitude || !location.longitude) return;

    try {
      console.log('Getting users in range for alerts...');
      
      // Get users in range
      const { data: usersInRange, error: usersError } = await supabase.rpc('get_users_in_range', {
        center_lat: location.latitude,
        center_lon: location.longitude,
        radius_meters: alertRadius[0]
      });

      if (usersError) {
        console.error('Error getting users in range:', usersError);
        throw usersError;
      }

      console.log('Users in range found:', usersInRange);

      // Create notification alerts for each user in range
      const alerts = usersInRange.map((userInRange: any) => ({
        report_id: reportId,
        recipient_user_id: userInRange.user_id,
        sender_user_id: user?.id,
        message: formData.message || `🚨 THEFT ALERT: ${formData.vehicleNo} stolen near your location. Check the live map for details.`,
        distance_meters: userInRange.distance_meters
      }));

      console.log('Prepared alerts:', alerts);

      if (alerts.length > 0) {
        const { error: alertError } = await supabase
          .from('notification_alerts')
          .insert(alerts);

        if (alertError) {
          console.error('Error inserting alerts:', alertError);
          throw alertError;
        }

        console.log('Alerts inserted successfully');
      }

      return alerts.length;
    } catch (error) {
      console.error('Error sending alerts:', error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location.latitude || !location.longitude) return;

    setIsSubmitting(true);

    try {
      console.log('Starting theft report submission...');
      
      // Upload photo if provided
      let photoUrl = null;
      if (photo) {
        console.log('Uploading photo...');
        photoUrl = await uploadPhoto(photo);
        console.log('Photo uploaded:', photoUrl);
      }

      // Create the theft report
      console.log('Creating theft report with data:', {
        user_id: user.id,
        vehicle_no: formData.vehicleNo,
        description: formData.description,
        photo_url: photoUrl,
        lat: location.latitude,
        lon: location.longitude,
        location: `POINT(${location.longitude} ${location.latitude})`,
        radius_m: alertRadius[0],
        category: 'vehicle'
      });

      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          vehicle_no: formData.vehicleNo,
          description: formData.description,
          photo_url: photoUrl,
          lat: location.latitude,
          lon: location.longitude,
          location: `POINT(${location.longitude} ${location.latitude})`,
          radius_m: alertRadius[0],
          category: 'vehicle'
          // Remove status field to use default 'pending' status
        })
        .select()
        .single();

      if (reportError) {
        console.error('Report creation error:', reportError);
        throw reportError;
      }

      console.log('Report created successfully:', report);

      // Send alerts to users in range
      console.log('Sending alerts to users in range...');
      const alertsSent = await sendAlertsToUsers(report.id);
      console.log('Alerts sent:', alertsSent);

      toast({
        title: "Theft Report Submitted!",
        description: `Report created and ${alertsSent} users in ${alertRadius[0]/1000}km radius have been notified.`,
      });

      // Reset form
      setFormData({ vehicleNo: '', description: '', message: '' });
      setPhoto(null);
      setAlertRadius([1000]);
      onOpenChange(false);

    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit theft report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (location.loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center p-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 animate-pulse text-primary" />
              <span className="text-sm text-muted-foreground">Getting your location...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (location.error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Location Required
            </DialogTitle>
            <DialogDescription>
              Please enable location access to report a theft. We need your location to send alerts to nearby users.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Report Stolen Vehicle
          </DialogTitle>
          <DialogDescription>
            Submit a theft report and alert nearby community members instantly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Number */}
          <div className="space-y-2">
            <Label htmlFor="vehicleNo">Vehicle Number *</Label>
            <Input
              id="vehicleNo"
              placeholder="e.g., MH 12 AB 1234"
              value={formData.vehicleNo}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicleNo: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Vehicle details, color, model, theft location details..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Custom Alert Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Custom Alert Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Custom message to send to nearby users..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo">Evidence Photo (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {photo && <Camera className="h-4 w-4 text-green-600" />}
            </div>
          </div>

          {/* Alert Radius */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Alert Radius</Label>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {usersInRange} users in range
              </Badge>
            </div>
            <div className="px-2">
              <Slider
                value={alertRadius}
                onValueChange={setAlertRadius}
                max={5000}
                min={500}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>500m</span>
                <span className="font-medium">{alertRadius[0]/1000}km</span>
                <span>5km</span>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Location: {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
            </span>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.vehicleNo}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Submitting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Alert to {usersInRange} Users
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};