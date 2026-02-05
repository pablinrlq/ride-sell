import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Star, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  products?: { name: string } | null;
}

const AdminReviewsPage = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: async () => {
      let query = supabase
        .from('product_reviews')
        .select('*, products(name)')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Review[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: approved })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(approved ? 'Avaliação aprovada!' : 'Avaliação rejeitada');
    },
    onError: () => toast.error('Erro ao atualizar avaliação'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Avaliação excluída!');
    },
    onError: () => toast.error('Erro ao excluir avaliação'),
  });

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avaliações de Produtos</h1>
          <p className="text-muted-foreground">
            Modere as avaliações enviadas pelos clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pendentes
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            Aprovadas
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhuma avaliação encontrada</h3>
          <p className="text-muted-foreground">
            {filter === 'pending'
              ? 'Não há avaliações pendentes de aprovação'
              : 'Nenhuma avaliação nesta categoria'}
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">
                    {review.products?.name || 'Produto removido'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{review.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.customer_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StarDisplay rating={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {review.title && (
                      <p className="font-medium text-sm truncate">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground truncate">
                        {review.comment}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(review.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                      {review.is_approved ? 'Aprovada' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!review.is_approved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary"
                          onClick={() =>
                            approveMutation.mutate({ id: review.id, approved: true })
                          }
                          title="Aprovar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Excluir esta avaliação?')) {
                            deleteMutation.mutate(review.id);
                          }
                        }}
                        title="Excluir"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminReviewsPage;
