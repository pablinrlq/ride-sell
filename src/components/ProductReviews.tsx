import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const StarRating = ({ 
  rating, 
  onRate, 
  interactive = false 
}: { 
  rating: number; 
  onRate?: (r: number) => void;
  interactive?: boolean;
}) => {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
          disabled={!interactive}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= (hover || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 0,
    title: '',
    comment: '',
  });

  const { data: reviews = [], refetch } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || formData.rating === 0) {
      toast.error('Preencha seu nome, email e avaliação');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          customer_name: formData.name,
          customer_email: formData.email,
          rating: formData.rating,
          title: formData.title || null,
          comment: formData.comment || null,
        });

      if (error) throw error;

      toast.success('Avaliação enviada! Será publicada após aprovação.');
      setFormData({ name: '', email: '', rating: 0, title: '', comment: '' });
      setShowForm(false);
      refetch();
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Avaliações</h2>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={Math.round(averageRating)} />
            <span className="text-sm text-muted-foreground">
              {reviews.length > 0
                ? `${averageRating.toFixed(1)} (${reviews.length} avaliações)`
                : 'Seja o primeiro a avaliar!'}
            </span>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          {showForm ? 'Cancelar' : 'Avaliar Produto'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-muted/50 p-6 rounded-lg mb-8 space-y-4">
          <h3 className="font-semibold">Avaliar: {productName}</h3>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Sua avaliação *</label>
            <StarRating
              rating={formData.rating}
              onRate={(r) => setFormData(prev => ({ ...prev, rating: r }))}
              interactive
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Seu nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="João Silva"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Seu email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="joao@email.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Título (opcional)</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Produto excelente!"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Comentário (opcional)</label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Conte sua experiência com o produto..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Avaliação'
            )}
          </Button>
        </form>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card border border-border p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{review.customer_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  <StarRating rating={review.rating} />
                  {review.title && (
                    <p className="font-semibold mt-2">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-muted-foreground text-sm mt-1">{review.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma avaliação ainda. Seja o primeiro a avaliar este produto!
        </p>
      )}
    </div>
  );
};

export default ProductReviews;
