import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
}

const AdminCouponsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_order_value: 0,
    max_uses: '',
    expires_at: '',
  });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('discount_coupons')
        .insert({
          code: data.code.toUpperCase(),
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_value: data.min_order_value,
          max_uses: data.max_uses ? parseInt(data.max_uses) : null,
          expires_at: data.expires_at || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom criado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe um cupom com este código');
      } else {
        toast.error('Erro ao criar cupom');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Coupon> }) => {
      const { error } = await supabase
        .from('discount_coupons')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom atualizado!');
      resetForm();
    },
    onError: () => toast.error('Erro ao atualizar cupom'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discount_coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom excluído!');
    },
    onError: () => toast.error('Erro ao excluir cupom'),
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_order_value: 0,
      max_uses: '',
      expires_at: '',
    });
    setEditingCoupon(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type as 'percentage' | 'fixed',
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_uses: coupon.max_uses?.toString() || '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      updateMutation.mutate({
        id: editingCoupon.id,
        data: {
          code: formData.code.toUpperCase(),
          description: formData.description || null,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          min_order_value: formData.min_order_value,
          max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
          expires_at: formData.expires_at || null,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleActive = (coupon: Coupon) => {
    updateMutation.mutate({
      id: coupon.id,
      data: { is_active: !coupon.is_active },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-muted-foreground">
            Gerencie os cupons promocionais da loja
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="PROMO10"
                  className="uppercase"
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="10% de desconto em todo o site"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Desconto</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, discount_type: v as 'percentage' | 'fixed' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor do Desconto *</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData({ ...formData, discount_value: parseFloat(e.target.value) })
                    }
                    min={0}
                    step={formData.discount_type === 'percentage' ? 1 : 0.01}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pedido Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={formData.min_order_value}
                    onChange={(e) =>
                      setFormData({ ...formData, min_order_value: parseFloat(e.target.value) || 0 })
                    }
                    min={0}
                    step={0.01}
                  />
                </div>
                <div>
                  <Label>Limite de Uso</Label>
                  <Input
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) =>
                      setFormData({ ...formData, max_uses: e.target.value })
                    }
                    placeholder="Ilimitado"
                    min={1}
                  />
                </div>
              </div>

              <div>
                <Label>Data de Expiração</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) =>
                    setFormData({ ...formData, expires_at: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCoupon ? 'Salvar' : 'Criar Cupom'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum cupom cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro cupom de desconto
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">
                    {coupon.code}
                  </TableCell>
                  <TableCell>
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}%`
                      : `R$ ${coupon.discount_value.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {coupon.min_order_value > 0
                      ? `R$ ${coupon.min_order_value.toFixed(2)}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {coupon.current_uses}
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at
                      ? format(new Date(coupon.expires_at), 'dd/MM/yyyy')
                      : 'Sem limite'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => toggleActive(coupon)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Excluir este cupom?')) {
                            deleteMutation.mutate(coupon.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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

export default AdminCouponsPage;
