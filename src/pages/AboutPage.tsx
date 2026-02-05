import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Bike, Users, Award, Heart, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AboutPage = () => {
  const { data: settings, isLoading } = useStoreSettings();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 bg-card overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Sobre Nós</span>
              <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-6">
                {settings?.store_name || 'Daniel Bike Shop'}
              </h1>
              <p className="text-lg text-muted-foreground">
                Sua loja de confiança para bicicletas, peças e acessórios. 
                Oferecemos qualidade, variedade e o melhor atendimento.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Bike, title: 'Qualidade', description: 'Produtos selecionados das melhores marcas do mercado' },
                { icon: Users, title: 'Atendimento', description: 'Equipe especializada pronta para te ajudar' },
                { icon: Award, title: 'Experiência', description: 'Anos de experiência no mercado de ciclismo' },
                { icon: Heart, title: 'Paixão', description: 'Amamos o que fazemos e isso reflete em tudo' },
              ].map((value, index) => (
                <div 
                  key={value.title} 
                  className="text-center p-6 bg-card border border-border hover:border-primary/50 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 mb-4">
                    <value.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">Nossa História</h2>
              <div className="prose prose-lg mx-auto text-muted-foreground">
                <p className="mb-4">
                  A {settings?.store_name || 'Daniel Bike Shop'} nasceu da paixão pelo ciclismo e do desejo de 
                  oferecer aos ciclistas produtos de qualidade com preço justo.
                </p>
                <p className="mb-4">
                  Ao longo dos anos, construímos uma reputação sólida baseada na confiança, 
                  qualidade dos produtos e atendimento personalizado. Nossa equipe é formada por 
                  entusiastas do ciclismo que entendem as necessidades de cada cliente.
                </p>
                <p>
                  Hoje, oferecemos uma ampla variedade de bicicletas, peças e acessórios para 
                  todos os tipos de ciclistas - do iniciante ao profissional. Venha nos conhecer!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Entre em Contato</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {settings?.address && (
                  <div className="flex items-start gap-4 p-4 bg-card border border-border">
                    <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Endereço</h4>
                      <p className="text-sm text-muted-foreground">
                        {settings.address}
                        {settings.city && `, ${settings.city}`}
                        {settings.state && ` - ${settings.state}`}
                      </p>
                    </div>
                  </div>
                )}
                {settings?.contact_phone && (
                  <div className="flex items-start gap-4 p-4 bg-card border border-border">
                    <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Telefone</h4>
                      <p className="text-sm text-muted-foreground">{settings.contact_phone}</p>
                    </div>
                  </div>
                )}
                {settings?.contact_email && (
                  <div className="flex items-start gap-4 p-4 bg-card border border-border">
                    <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">E-mail</h4>
                      <p className="text-sm text-muted-foreground">{settings.contact_email}</p>
                    </div>
                  </div>
                )}
                {settings?.working_hours && (
                  <div className="flex items-start gap-4 p-4 bg-card border border-border">
                    <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Horário</h4>
                      <p className="text-sm text-muted-foreground">{settings.working_hours}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
