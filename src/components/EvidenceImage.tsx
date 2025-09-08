import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera } from 'lucide-react';

interface EvidenceImageProps {
  photoUrl: string | null;
  alt?: string;
  className?: string;
}

export const EvidenceImage: React.FC<EvidenceImageProps> = ({
  photoUrl,
  alt = "Evidence",
  className = "w-full h-full object-cover"
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!photoUrl) {
        setLoading(false);
        return;
      }

      try {
        // If it's already a full URL (signed URL), use it directly
        if (photoUrl.startsWith('http')) {
          setImageUrl(photoUrl);
          setLoading(false);
          return;
        }

        // If it's a path, get a signed URL
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from('evidence')
          .createSignedUrl(photoUrl, 60 * 60 * 24); // 24 hours

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          setError(true);
        } else {
          setImageUrl(signedUrl.signedUrl);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [photoUrl]);

  if (!photoUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <Camera className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <Camera className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};