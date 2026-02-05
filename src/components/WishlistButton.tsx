import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  variant?: 'icon' | 'full';
  className?: string;
}

const WishlistButton = ({ 
  productId, 
  productName,
  variant = 'icon',
  className 
}: WishlistButtonProps) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
    
    if (isWishlisted) {
      toast.info('Removido da lista de desejos');
    } else {
      toast.success(productName 
        ? `${productName} adicionado à lista de desejos` 
        : 'Adicionado à lista de desejos'
      );
    }
  };

  if (variant === 'full') {
    return (
      <Button
        variant="outline"
        onClick={handleClick}
        className={cn('gap-2', className)}
      >
        <Heart 
          className={cn(
            'h-4 w-4 transition-all',
            isWishlisted && 'fill-destructive text-destructive'
          )} 
        />
        {isWishlisted ? 'Na lista de desejos' : 'Adicionar aos favoritos'}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        'h-9 w-9 rounded-full',
        isWishlisted && 'text-destructive',
        className
      )}
    >
      <Heart 
        className={cn(
          'h-5 w-5 transition-all',
          isWishlisted && 'fill-current'
        )} 
      />
    </Button>
  );
};

export default WishlistButton;
