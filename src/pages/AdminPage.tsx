import { useState } from 'react';
import { Package, ShoppingCart, BarChart3, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { products } from '@/data/products';
import { Product } from '@/types/product';
import logo from '@/assets/logo.png';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [productList, setProductList] = useState<Product[]>(products);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleDeleteProduct = (id: string) => {
    setProductList(prev => prev.filter(p => p.id !== id));
    toast.success('Produto removido com sucesso!');
  };

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as Product['category'],
      stock: parseInt(formData.get('stock') as string),
      image: formData.get('image') as string,
    };

    if (editingProduct) {
      setProductList(prev => 
        prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p)
      );
      toast.success('Produto atualizado com sucesso!');
    } else {
      const newProduct: Product = {
        ...productData as Product,
        id: Date.now().toString(),
      };
      setProductList(prev => [...prev, newProduct]);
      toast.success('Produto adicionado com sucesso!');
    }
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const stats = [
    { label: 'Produtos', value: productList.length, icon: Package },
    { label: 'Em Estoque', value: productList.reduce((sum, p) => sum + p.stock, 0), icon: ShoppingCart },
    { label: 'Valor Total', value: formatPrice(productList.reduce((sum, p) => sum + p.price * p.stock, 0)), icon: BarChart3 },
  ];

  const mockOrders = [
    { id: '001', customer: 'João Silva', total: 3499, status: 'pending', date: '2024-01-15' },
    { id: '002', customer: 'Maria Santos', total: 899, status: 'completed', date: '2024-01-14' },
    { id: '003', customer: 'Pedro Costa', total: 5899, status: 'shipped', date: '2024-01-13' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 hidden lg:block">
        <Link to="/" className="block mb-8">
          <img src={logo} alt="Daniel Bike Shop" className="h-12 w-auto" />
        </Link>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'products' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            <Package className="h-5 w-5" />
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeTab === 'orders' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            Pedidos
          </button>
        </nav>
        <div className="absolute bottom-6 left-6 right-6">
          <Link to="/">
            <Button variant="outline" className="w-full">Voltar à Loja</Button>
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-card border-b border-border p-4 flex items-center justify-between">
        <Link to="/">
          <img src={logo} alt="Daniel Bike Shop" className="h-10 w-auto" />
        </Link>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'products' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64 p-6 lg:p-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {stats.map(stat => (
                <div key={stat.label} className="bg-card border border-border p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className="h-10 w-10 text-primary opacity-50" />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border p-6">
              <h2 className="text-xl font-bold mb-4">Pedidos Recentes</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map(order => (
                      <tr key={order.id} className="border-b border-border">
                        <td className="py-3 px-2 text-sm">#{order.id}</td>
                        <td className="py-3 px-2 text-sm">{order.customer}</td>
                        <td className="py-3 px-2 text-sm">{formatPrice(order.total)}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-1 ${
                            order.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-600' :
                            'bg-yellow-500/20 text-yellow-600'
                          }`}>
                            {order.status === 'completed' ? 'Concluído' :
                             order.status === 'shipped' ? 'Enviado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h1 className="text-3xl font-bold">Produtos</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingProduct(null)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        defaultValue={editingProduct?.name || ''} 
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        defaultValue={editingProduct?.description || ''} 
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Preço</Label>
                        <Input 
                          id="price" 
                          name="price" 
                          type="number" 
                          step="0.01" 
                          defaultValue={editingProduct?.price || ''} 
                          required 
                        />
                      </div>
                      <div>
                        <Label htmlFor="stock">Estoque</Label>
                        <Input 
                          id="stock" 
                          name="stock" 
                          type="number" 
                          defaultValue={editingProduct?.stock || ''} 
                          required 
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select name="category" defaultValue={editingProduct?.category || 'bicicletas'}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bicicletas">Bicicletas</SelectItem>
                          <SelectItem value="pecas">Peças</SelectItem>
                          <SelectItem value="acessorios">Acessórios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="image">URL da Imagem</Label>
                      <Input 
                        id="image" 
                        name="image" 
                        defaultValue={editingProduct?.image || ''} 
                        required 
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Produto</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Categoria</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Preço</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Estoque</th>
                      <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productList.map(product => (
                      <tr key={product.id} className="border-b border-border">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-12 h-12 object-cover"
                            />
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm capitalize">{product.category}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium">{formatPrice(product.price)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-sm ${product.stock < 5 ? 'text-destructive' : ''}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingProduct(product);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div>
            <h1 className="text-3xl font-bold mb-8">Pedidos</h1>
            <div className="bg-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">ID</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Data</th>
                      <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map(order => (
                      <tr key={order.id} className="border-b border-border">
                        <td className="py-4 px-4 text-sm font-medium">#{order.id}</td>
                        <td className="py-4 px-4 text-sm">{order.customer}</td>
                        <td className="py-4 px-4 text-sm font-medium">{formatPrice(order.total)}</td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 ${
                            order.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-600' :
                            'bg-yellow-500/20 text-yellow-600'
                          }`}>
                            {order.status === 'completed' ? 'Concluído' :
                             order.status === 'shipped' ? 'Enviado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{order.date}</td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
