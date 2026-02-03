import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_city: '',
    customer_state: '',
    customer_zip: '',
    notes: '',
  });

  const shippingCost = total >= 299 ? 0 : 29.90;
  const orderTotal = total + shippingCost;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orderItems = items.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
    }));

    try {
      const order = await createOrder.mutateAsync({
        ...formData,
        subtotal: total,
        shipping_cost: shippingCost,
        total: orderTotal,
        items: orderItems,
      });

      setOrderId(order.id);
      setOrderComplete(true);
      clearCart();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
    }
  };

  if (items.length === 0 && !orderComplete) {
    navigate('/carrinho');
    return null;
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md px-4">
            <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-6" />
            <h1 className="text-3xl font-bold mb-4">Pedido Confirmado!</h1>
            <p className="text-muted-foreground mb-2">
              Seu pedido foi realizado com sucesso.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Número do pedido: <span className="font-mono font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-muted-foreground mb-8">
              Você receberá um e-mail com os detalhes do pedido e instruções para pagamento.
            </p>
            <Link to="/produtos">
              <Button size="lg">Continuar Comprando</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Link to="/carrinho" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o carrinho
          </Link>

          <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer_name">Nome Completo *</Label>
                        <Input
                          id="customer_name"
                          name="customer_name"
                          value={formData.customer_name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer_email">E-mail *</Label>
                        <Input
                          id="customer_email"
                          name="customer_email"
                          type="email"
                          value={formData.customer_email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Telefone/WhatsApp *</Label>
                      <Input
                        id="customer_phone"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleInputChange}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Endereço de Entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_address">Endereço Completo *</Label>
                      <Input
                        id="customer_address"
                        name="customer_address"
                        value={formData.customer_address}
                        onChange={handleInputChange}
                        placeholder="Rua, número, complemento"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer_city">Cidade *</Label>
                        <Input
                          id="customer_city"
                          name="customer_city"
                          value={formData.customer_city}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer_state">Estado *</Label>
                        <Input
                          id="customer_state"
                          name="customer_state"
                          value={formData.customer_state}
                          onChange={handleInputChange}
                          placeholder="SP"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer_zip">CEP *</Label>
                        <Input
                          id="customer_zip"
                          name="customer_zip"
                          value={formData.customer_zip}
                          onChange={handleInputChange}
                          placeholder="00000-000"
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Alguma observação sobre o pedido? (opcional)"
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumo do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {items.map(item => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span>{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frete</span>
                        <span className={shippingCost === 0 ? 'text-green-600' : ''}>
                          {shippingCost === 0 ? 'Grátis' : formatPrice(shippingCost)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(orderTotal)}</span>
                    </div>

                    {total >= 299 && (
                      <p className="text-xs text-green-600">✓ Frete grátis aplicado!</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={createOrder.isPending}
                    >
                      {createOrder.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Confirmar Pedido'
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Após confirmar, você receberá instruções de pagamento por e-mail.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
