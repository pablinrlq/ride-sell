import { Link } from 'react-router-dom';
import { Bike, Wrench, ShoppingBag } from 'lucide-react';

const categories = [
  {
    name: 'Bicicletas',
    description: 'Mountain bikes, speed, urbanas e mais',
    icon: Bike,
    path: '/produtos?categoria=bicicletas',
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600'
  },
  {
    name: 'Peças',
    description: 'Câmbios, freios, pneus e componentes',
    icon: Wrench,
    path: '/produtos?categoria=pecas',
    image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=600'
  },
  {
    name: 'Acessórios',
    description: 'Capacetes, luvas, garrafas e mais',
    icon: ShoppingBag,
    path: '/produtos?categoria=acessorios',
    image: 'https://images.unsplash.com/photo-1557803175-2f8c4f56c34c?w=600'
  }
];

const CategorySection = () => {
  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">Categorias</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2">Navegue por Categoria</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(category => (
            <Link 
              key={category.name} 
              to={category.path}
              className="group relative h-72 overflow-hidden border border-border hover:border-primary/50 transition-all"
            >
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <category.icon className="h-8 w-8 mb-3 text-primary" />
                <h3 className="text-xl font-bold">{category.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
