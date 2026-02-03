import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/useProducts';
import { Bike, Wrench, ShoppingBag, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, typeof Bike> = {
  bicicletas: Bike,
  pecas: Wrench,
  acessorios: ShoppingBag,
};

const categoryImages: Record<string, string> = {
  bicicletas: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600',
  pecas: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=600',
  acessorios: 'https://images.unsplash.com/photo-1557803175-2f8c4f56c34c?w=600',
};

const CategorySection = () => {
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Categorias</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Navegue por Categoria</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Categorias</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Navegue por Categoria</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(category => {
            const IconComponent = categoryIcons[category.slug] || Package;
            const image = categoryImages[category.slug] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600';
            
            return (
              <Link 
                key={category.id} 
                to={`/produtos?categoria=${category.slug}`}
                className="group relative h-72 overflow-hidden border border-border hover:border-primary/50 transition-all"
              >
                <img
                  src={image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <IconComponent className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="text-xl font-bold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
