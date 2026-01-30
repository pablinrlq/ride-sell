import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  FolderTree, 
  AlertTriangle, 
  TrendingUp,
  Box,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminDashboardPage: React.FC = () => {
  // Fetch products count
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      
      const totalProducts = count || 0;
      const activeProducts = data?.filter(p => p.is_active).length || 0;
      const inactiveProducts = totalProducts - activeProducts;
      const lowStock = data?.filter(p => p.stock_quantity <= p.low_stock_threshold).length || 0;
      const featuredProducts = data?.filter(p => p.is_featured).length || 0;
      const totalStock = data?.reduce((acc, p) => acc + (p.stock_quantity || 0), 0) || 0;
      
      return { 
        totalProducts, 
        activeProducts, 
        inactiveProducts, 
        lowStock, 
        featuredProducts,
        totalStock,
      };
    },
  });

  // Fetch categories count
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-categories-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('categories')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      return { totalCategories: count || 0 };
    },
  });

  // Fetch products by category for chart
  const { data: productsByCategory, isLoading: chartLoading } = useQuery({
    queryKey: ['admin-products-by-category'],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category_id');
      
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');
      
      if (productsError || categoriesError) throw productsError || categoriesError;
      
      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);
      const countByCategory = new Map<string, number>();
      
      products?.forEach(p => {
        const categoryName = p.category_id ? categoryMap.get(p.category_id) || 'Sem Categoria' : 'Sem Categoria';
        countByCategory.set(categoryName, (countByCategory.get(categoryName) || 0) + 1);
      });
      
      return Array.from(countByCategory.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Fetch banners count
  const { data: bannersData, isLoading: bannersLoading } = useQuery({
    queryKey: ['admin-banners-count'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('banners')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      
      const activeBanners = data?.filter(b => b.is_active).length || 0;
      
      return { totalBanners: count || 0, activeBanners };
    },
  });

  const statsCards = [
    {
      title: 'Total de Produtos',
      value: productsData?.totalProducts || 0,
      description: `${productsData?.activeProducts || 0} ativos`,
      icon: Package,
      loading: productsLoading,
    },
    {
      title: 'Estoque Total',
      value: productsData?.totalStock || 0,
      description: 'unidades em estoque',
      icon: Box,
      loading: productsLoading,
    },
    {
      title: 'Estoque Baixo',
      value: productsData?.lowStock || 0,
      description: 'produtos precisam reposição',
      icon: AlertTriangle,
      loading: productsLoading,
      variant: (productsData?.lowStock || 0) > 0 ? 'destructive' : 'default',
    },
    {
      title: 'Categorias',
      value: categoriesData?.totalCategories || 0,
      description: 'categorias cadastradas',
      icon: FolderTree,
      loading: categoriesLoading,
    },
    {
      title: 'Em Destaque',
      value: productsData?.featuredProducts || 0,
      description: 'produtos destacados',
      icon: TrendingUp,
      loading: productsLoading,
    },
    {
      title: 'Banners',
      value: bannersData?.totalBanners || 0,
      description: `${bannersData?.activeBanners || 0} ativos`,
      icon: ImageIcon,
      loading: bannersLoading,
    },
  ];

  const pieChartData = productsData ? [
    { name: 'Ativos', value: productsData.activeProducts },
    { name: 'Inativos', value: productsData.inactiveProducts },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua loja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              {card.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${card.variant === 'destructive' ? 'text-destructive' : ''}`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Products by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos por Categoria</CardTitle>
            <CardDescription>Distribuição de produtos</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : productsByCategory && productsByCategory.length > 0 ? (
              <ChartContainer
                config={{
                  value: {
                    label: 'Produtos',
                    color: 'hsl(var(--primary))',
                  },
                }}
                className="h-[300px]"
              >
                <BarChart data={productsByCategory}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum produto cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active vs Inactive Products */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Produtos</CardTitle>
            <CardDescription>Ativos vs Inativos</CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : pieChartData.some(d => d.value > 0) ? (
              <ChartContainer
                config={{
                  Ativos: {
                    label: 'Ativos',
                    color: 'hsl(var(--primary))',
                  },
                  Inativos: {
                    label: 'Inativos',
                    color: 'hsl(var(--muted))',
                  },
                }}
                className="h-[300px]"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum produto cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
