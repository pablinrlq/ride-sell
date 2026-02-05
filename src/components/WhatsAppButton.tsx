import { MessageCircle } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { cn } from '@/lib/utils';

const WhatsAppButton = () => {
  const { data: settings } = useStoreSettings();
  
  const whatsappNumber = settings?.whatsapp?.replace(/\D/g, '') || '5531995326386';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Olá! Vim pelo site e gostaria de mais informações.`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex items-center justify-center",
        "w-14 h-14 rounded-full",
        "bg-[#25D366] hover:bg-[#20BA5A]",
        "text-white shadow-lg",
        "transition-all duration-300",
        "hover:scale-110 hover:shadow-xl",
        "animate-fade-in"
      )}
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
      
      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
    </a>
  );
};

export default WhatsAppButton;
