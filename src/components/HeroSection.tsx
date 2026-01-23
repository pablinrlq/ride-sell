import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bike } from 'lucide-react';
import heroBike from '@/assets/hero-bike.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBike}
          alt="Hero Background"
          className="w-full h-full object-cover"
        />
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
            Sua jornada sobre
            <span className="block text-primary">duas rodas</span>
            começa aqui
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg">
            Encontre as melhores bicicletas e peças para todas as suas aventuras. 
            Qualidade, performance e preço justo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/produtos">
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
