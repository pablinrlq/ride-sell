import { Link } from 'react-router-dom';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [observations, setObservations] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const shippingCost = total >= 299 ? 0 : 29.90;
  const orderTotal = total + shippingCost;

  const generateWhatsAppMessage = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let message = `🚲 *NOVO PEDIDO - DANIEL BIKE SHOP*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📅 *Data:* ${dateStr} às ${timeStr}\n`;
    message += `👤 *Cliente:* ${customerName || 'Não informado'}\n\n`;
    message += `📦 *PRODUTOS:*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    items.forEach((item, index) => {
      message += `\n${index + 1}. *${item.product.name}*\n`;
      message += `   Qtd: ${item.quantity}x\n`;
      message += `   Preço unit.: ${formatPrice(item.product.price)}\n`;
      message += `   Subtotal: ${formatPrice(item.product.price * item.quantity)}\n`;
    });
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *RESUMO FINANCEIRO:*\n`;
    message += `   Subtotal: ${formatPrice(total)}\n`;
    message += `   Frete: ${shippingCost === 0 ? 'GRÁTIS 🎉' : formatPrice(shippingCost)}\n`;
    message += `   *TOTAL: ${formatPrice(orderTotal)}*\n`;
    
    if (observations.trim()) {
      message += `\n📝 *Observações:*\n${observations}\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `_Pedido enviado via site Daniel Bike Shop_`;
    
    return encodeURIComponent(message);
  };

  const handleSendToWhatsApp = () => {
    if (!customerName.trim()) {
      toast.error('Por favor, informe seu nome');
      return;
    }
    
    const whatsappNumber = '5531995326386';
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    clearCart();
    toast.success('Redirecionando para o WhatsApp...');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Seu carrinho está vazio</h1>
            <p className="text-muted-foreground mb-6">Adicione alguns produtos incríveis!</p>
            <Link to="/produtos">
              <Button className="gap-2">
                Explorar Produtos
                <ArrowRight className="h-4 w-4" />
              </Button>
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
          <h1 className="text-3xl font-bold mb-8">Carrinho de Compras</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-4 p-4 bg-card border border-border">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(item.product.price)} cada
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <span className="font-bold">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={clearCart} className="text-destructive">
                Limpar Carrinho
              </Button>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>
                <div className="space-y-3 text-sm">
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
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(orderTotal)}</span>
                    </div>
                    {total >= 299 && (
                      <p className="text-xs text-green-600 mt-1">Você ganhou frete grátis!</p>
                    )}
                  </div>
                </div>
                {!showCheckout ? (
                  <Button 
                    className="w-full mt-6 gap-2" 
                    size="lg"
                    onClick={() => setShowCheckout(true)}
                  >
                    Finalizar Pedido
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Seu Nome *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Digite seu nome completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="observations">Observações (opcional)</Label>
                      <Textarea
                        id="observations"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Tamanho, cor, forma de pagamento..."
                        rows={3}
                      />
                    </div>
                    <Button 
                      className="w-full gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)]" 
                      size="lg"
                      onClick={handleSendToWhatsApp}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Enviar Pedido via WhatsApp
                    </Button>
                  </div>
                )}
                <Link to="/produtos" className="block text-center mt-4">
                  <Button variant="link" className="text-muted-foreground">
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
