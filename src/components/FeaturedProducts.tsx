import { useFeaturedProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const FeaturedProducts = () => {
  const { data: featuredProducts, isLoading } = useFeaturedProducts();

  if (isLoading) {
    return (
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Destaques</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2">Produtos em Destaque</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredProducts || featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Destaques</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Produtos em Destaque</h2>
          </div>
          <Link to="/produtos">
            <Button variant="ghost" className="gap-2 group">
              Ver todos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProducts.map((product, index) => (
            <div 
              key={product.id}
              className={cn("animate-fade-in")}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
