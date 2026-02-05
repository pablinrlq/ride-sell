import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bike } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const HeroSection = () => {
  const { data: mainBanner, isLoading } = useQuery({
    queryKey: ['main-banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .eq('is_main', true)
        .order('display_order')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <Skeleton className="absolute inset-0" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        {mainBanner?.image_url ? (
          <img
            src={mainBanner.image_url}
            alt={mainBanner.title || 'Hero Background'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Bike className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider">Daniel Bike Shop</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            {mainBanner?.title || (
              <>
                Sua jornada sobre
                <span className="block text-primary">duas rodas</span>
                começa aqui
              </>
            )}
          </h1>
          {mainBanner?.subtitle && (
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              {mainBanner.subtitle}
            </p>
          )}
          {!mainBanner?.subtitle && (
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Encontre as melhores bicicletas e peças para todas as suas aventuras. 
              Qualidade, performance e preço justo.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to={mainBanner?.link_url || '/produtos'}>
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Ver Produtos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/produtos?categoria=bicicletas">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Bicicletas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
