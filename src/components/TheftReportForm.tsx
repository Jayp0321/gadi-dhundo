import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  vehicleNo: z.string().min(1, 'Vehicle number is required'),
  description: z.string().min(10, 'Please provide at least 10 characters description'),
  radius: z.number().min(500).max(5000),
  expiryHours: z.number().min(1).max(24),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface TheftReportFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const TheftReportForm: React.FC<TheftReportFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      vehicleNo: '',
      description: '',
      radius: 1000,
      expiryHours: 2,
    },
  });

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('report-photos')
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('report-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      return null;
    }
  };

  const onSubmit = async (data: ReportFormData) => {
    if (!user || !location.latitude || !location.longitude) {
      toast({
        title: "Error",
        description: "Location access required to report theft",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let photoUrl = null;
      if (photo) {
        photoUrl = await uploadPhoto(photo);
      }

      const expiryAt = new Date(Date.now() + data.expiryHours * 60 * 60 * 1000);

      // The location field is auto-populated by a database trigger
      // but TypeScript requires it, so we'll provide a placeholder
      const locationPoint = `POINT(${location.longitude} ${location.latitude})`;

      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          vehicle_no: data.vehicleNo,
          description: data.description,
          photo_url: photoUrl,
          lat: location.latitude,
          lon: location.longitude,
          location: locationPoint as any, // Will be overridden by trigger
          radius_m: data.radius,
          expiry_at: expiryAt.toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Theft report submitted successfully",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Report submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (location.loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center">Getting your location...</p>
        </CardContent>
      </Card>
    );
  }

  if (location.error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <p className="text-center text-danger">
            Location access required to report theft. Please enable location services.
          </p>
          <Button className="w-full mt-4" onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-danger">Report Vehicle Theft</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vehicleNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="DL 01 XX 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Provide details about the theft incident..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Photo Evidence (Optional)</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </div>

            <FormField
              control={form.control}
              name="radius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Radius: {field.value}m</FormLabel>
                  <FormControl>
                    <Slider
                      min={500}
                      max={5000}
                      step={500}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Duration</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-danger hover:bg-danger/90"
                disabled={uploading}
              >
                {uploading ? 'Submitting...' : 'Report Theft'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};