import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProducts, Product } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
  onClose?: () => void;
}

const SearchBar = ({ className, onClose }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: products } = useProducts();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products?.filter(product => {
    const searchLower = query.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.brand?.toLowerCase().includes(searchLower) ||
      product.model?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductClick = (slug: string) => {
    navigate(`/produto/${slug}`);
    setQuery('');
    setIsOpen(false);
    onClose?.();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/produtos?busca=${encodeURIComponent(query)}`);
      setQuery('');
      setIsOpen(false);
      onClose?.();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar produtos..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length > 0);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10 bg-background"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Search Results Dropdown */}
      {isOpen && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-lg z-50 max-h-96 overflow-y-auto">
          {filteredProducts && filteredProducts.length > 0 ? (
            <>
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.slug)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-muted">
                    {product.primaryImage ? (
                      <img
                        src={product.primaryImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Search className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-sm text-primary font-bold">
                      {formatPrice(product.promotionalPrice || product.price)}
                    </p>
                  </div>
                </button>
              ))}
              <button
                onClick={handleSearch}
                className="w-full p-3 text-center text-sm text-primary hover:bg-accent/50 transition-colors border-t border-border"
              >
                Ver todos os resultados para "{query}"
              </button>
            </>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>Nenhum produto encontrado</p>
              <p className="text-sm mt-1">Tente outros termos de busca</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
