import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, ImageIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductImageUploadProps {
  productId?: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  disabled?: boolean;
}

const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  productId,
  images,
  onImagesChange,
  disabled = false,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Erro',
            description: `${file.name} não é uma imagem válida.`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'Erro',
            description: `${file.name} é muito grande. Máximo 5MB.`,
            variant: 'destructive',
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = productId ? `${productId}/${fileName}` : `temp/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) {
          toast({
            title: 'Erro',
            description: `Erro ao enviar ${file.name}: ${uploadError.message}`,
            variant: 'destructive',
          });
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImages.push({
          image_url: publicUrl,
          is_primary: images.length === 0 && i === 0,
          display_order: images.length + i,
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({
          title: 'Sucesso!',
          description: `${newImages.length} imagem(ns) adicionada(s).`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar imagens.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Remove from storage if possible
    try {
      const url = new URL(imageToRemove.image_url);
      const pathParts = url.pathname.split('/storage/v1/object/public/product-images/');
      if (pathParts.length > 1) {
        await supabase.storage
          .from('product-images')
          .remove([decodeURIComponent(pathParts[1])]);
      }
    } catch (e) {
      // Ignore errors when removing from storage
    }

    const newImages = images.filter((_, i) => i !== index);
    
    // If we removed the primary image, make the first one primary
    if (imageToRemove.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }

    // Update display orders
    newImages.forEach((img, i) => {
      img.display_order = i;
    });

    onImagesChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Fotos do Produto</label>
        <span className="text-xs text-muted-foreground">
          {images.length} imagem(ns)
        </span>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className={cn(
                'relative aspect-square rounded-lg border-2 overflow-hidden group',
                image.is_primary ? 'border-primary' : 'border-border'
              )}
            >
              <img
                src={image.image_url}
                alt={`Produto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Primary badge */}
              {image.is_primary && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Principal
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(index)}
                    disabled={disabled}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveImage(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
        <input
          type="file"
          id="product-images"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
        <label
          htmlFor="product-images"
          className={cn(
            'flex flex-col items-center gap-2 cursor-pointer',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Enviando...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <Upload className="h-6 w-6" />
              </div>
              <span className="text-sm text-muted-foreground">
                Clique para adicionar fotos
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WEBP (máx. 5MB cada)
              </span>
            </>
          )}
        </label>
      </div>
    </div>
  );
};

export default ProductImageUpload;
