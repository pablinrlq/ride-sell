import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus, Package, Warehouse, AlertTriangle, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  brand: string | null;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_at: string;
  products?: { name: string } | null;
}

const AdminStockPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    movement_type: 'entrada' as 'entrada' | 'saida' | 'ajuste',
    quantity: '',
    notes: '',
  });

  // Fetch products with stock info
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-stock-products', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold, brand')
        .order('name');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch recent stock movements
  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['admin-stock-movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as StockMovement[];
    },
  });

  // Stock movement mutation
  const movementMutation = useMutation({
    mutationFn: async (data: {
      product_id: string;
      movement_type: 'entrada' | 'saida' | 'ajuste';
      quantity: number;
      notes: string;
      previous_quantity: number;
    }) => {
      let newQuantity: number;
      
      if (data.movement_type === 'entrada') {
        newQuantity = data.previous_quantity + data.quantity;
      } else if (data.movement_type === 'saida') {
        newQuantity = Math.max(0, data.previous_quantity - data.quantity);
      } else {
        newQuantity = data.quantity;
      }

      const { error } = await supabase.from('stock_movements').insert({
        product_id: data.product_id,
        movement_type: data.movement_type,
        quantity: data.quantity,
        previous_quantity: data.previous_quantity,
        new_quantity: newQuantity,
        notes: data.notes || null,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stock-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-count'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Sucesso!',
        description: 'Movimentação de estoque registrada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar movimentação.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      movement_type: 'entrada',
      quantity: '',
      notes: '',
    });
    setSelectedProduct(null);
  };

  const handleOpenMovement = (product: Product) => {
    setSelectedProduct(product);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Erro',
        description: 'Quantidade inválida.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.movement_type === 'saida' && quantity > selectedProduct.stock_quantity) {
      toast({
        title: 'Erro',
        description: 'Quantidade maior que o estoque disponível.',
        variant: 'destructive',
      });
      return;
    }

    movementMutation.mutate({
      product_id: selectedProduct.id,
      movement_type: formData.movement_type,
      quantity,
      notes: formData.notes,
      previous_quantity: selectedProduct.stock_quantity,
    });
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'entrada': return { label: 'Entrada', variant: 'default' as const };
      case 'saida': return { label: 'Saída', variant: 'destructive' as const };
      case 'ajuste': return { label: 'Ajuste', variant: 'secondary' as const };
      default: return { label: type, variant: 'outline' as const };
    }
  };

  const lowStockProducts = products?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];
  const displayedProducts = showLowStockOnly ? lowStockProducts : products;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Gerencie o estoque dos produtos</p>
        </div>
        {lowStockProducts.length > 0 && (
          <Button
            variant={showLowStockOnly ? "destructive" : "outline"}
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            {showLowStockOnly ? 'Ver todos' : `Ver estoque baixo (${lowStockProducts.length})`}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Products Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Estoque por Produto
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : displayedProducts && displayedProducts.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          {product.brand && (
                            <div className="text-sm text-muted-foreground">{product.brand}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            'font-bold text-lg',
                            product.stock_quantity <= product.low_stock_threshold && 'text-destructive'
                          )}>
                            {product.stock_quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenMovement(product)}
                          >
                            Movimentar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{showLowStockOnly ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
            <CardDescription>Últimas 20 movimentações</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {movementsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : movements && movements.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const { label, variant } = getMovementLabel(movement.movement_type);
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            {movement.products?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={variant}>{label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              'font-medium',
                              movement.movement_type === 'entrada' && 'text-green-600',
                              movement.movement_type === 'saida' && 'text-red-600'
                            )}>
                              {movement.movement_type === 'entrada' ? '+' : movement.movement_type === 'saida' ? '-' : ''}
                              {movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {format(new Date(movement.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma movimentação registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <span>
                  <strong>{selectedProduct.name}</strong> - Estoque atual: <strong>{selectedProduct.stock_quantity}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movement_type">Tipo de Movimentação</Label>
              <Select
                value={formData.movement_type}
                onValueChange={(value: 'entrada' | 'saida' | 'ajuste') => 
                  setFormData({ ...formData, movement_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      Entrada
                    </span>
                  </SelectItem>
                  <SelectItem value="saida">
                    <span className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-red-600" />
                      Saída
                    </span>
                  </SelectItem>
                  <SelectItem value="ajuste">Ajuste (definir quantidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {formData.movement_type === 'ajuste' ? 'Nova Quantidade' : 'Quantidade'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Motivo da movimentação..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={movementMutation.isPending}>
                {movementMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStockPage;
