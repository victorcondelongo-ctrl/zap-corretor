import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/contexts/SessionContext";
import { Loader2, Zap, Clock, Target, CheckCircle, ArrowRight, XCircle, TrendingUp } from "lucide-react";
import React from "react";

// --- Helper Components ---

interface PainPointCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
}

const PainPointCard: React.FC<PainPointCardProps> = ({ title, description, icon: Icon }) => (
    <Card className="text-center p-4 border-destructive/50 bg-destructive/5 dark:bg-destructive/10">
        <Icon className="w-8 h-8 text-destructive mx-auto mb-3" />
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            {description}
        </CardContent>
    </Card>
);

interface PricingCardProps {
    title: string;
    price: string;
    per: string;
    features: string[];
    isPrimary: boolean;
    ctaText: string;
    link: string;
}

const PricingCard: React.FC<PricingCardProps> = ({ title, price, per, features, isPrimary, ctaText, link }) => (
    <Card className={`flex flex-col h-full ${isPrimary ? 'border-primary ring-2 ring-primary shadow-lg' : ''}`}>
        <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="text-5xl font-bold mt-2">{price}</p>
            <p className="text-sm text-muted-foreground">{per}</p>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
            <Separator />
            <ul className="space-y-2 text-sm">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-success mt-1 flex-shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
        <div className="p-6 pt-0">
            <Link to={link} className="block">
                <Button className="w-full" size="lg" variant={isPrimary ? 'default' : 'outline'}>
                    {ctaText}
                </Button>
            </Link>
        </div>
    </Card>
);


const Index = () => {
  const { profile, loading, user } = useSession();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Verificando sessão...</p>
        </div>
      );
    }

    if (user && profile) {
      let dashboardLink = "/";
      let dashboardText = "Ir para o Dashboard";

      switch (profile.role) {
        case "SUPERADMIN":
          dashboardLink = "/superadmin/dashboard";
          dashboardText = "Ir para o Dashboard Superadmin";
          break;
        case "ADMIN_TENANT":
          dashboardLink = "/admin/dashboard";
          dashboardText = "Ir para o Dashboard da Corretora";
          break;
        case "AGENT":
          dashboardLink = "/agent/dashboard";
          dashboardText = "Ir para o Dashboard do Agente";
          break;
      }

      // If logged in, show redirection message
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    Bem-vindo(a) de volta, {profile.full_name}!
                </h1>
                <p className="text-xl text-gray-600 mb-8 dark:text-gray-400">
                    Você está logado como {profile.role}.
                </p>
                <Link to={dashboardLink}>
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        {dashboardText}
                    </Button>
                </Link>
            </div>
        </div>
      );
    }

    // Default view for logged-out users (The Landing Page)
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header/Nav */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">ZapCorretor</h1>
                <Link to="/login">
                    <Button variant="outline">
                        Login <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </div>
        </header>

        <main className="flex-grow">
            {/* 1. Hero Section */}
            <section className="py-20 md:py-32 bg-gray-50 dark:bg-gray-900 text-center">
                <div className="container max-w-4xl mx-auto px-4">
                    <Badge variant="default" className="mb-4 text-sm">
                        Aumente suas Vendas em 40%
                    </Badge>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-gray-100">
                        Pare de Perder Leads no WhatsApp. Qualifique 10x Mais Rápido com a IA.
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        O ZapCorretor automatiza a coleta de Nome, CPF, CEP e Placa, fazendo o follow-up de abandonos e entregando ao seu corretor apenas leads prontos para orçar.
                    </p>
                    <Link to="/login">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg">
                            Comece Seu Teste Gratuito Agora
                        </Button>
                    </Link>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Configuração em menos de 5 minutos.
                    </p>
                </div>
            </section>
            
            {/* 2. Pain Points / The Problem */}
            <section className="py-16 container">
                <h2 className="text-3xl font-bold text-center mb-12">Onde Seus Leads Estão Morrendo?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PainPointCard 
                        title="O Abandono Silencioso"
                        description="Leads que clicam no anúncio, mas nunca respondem à primeira mensagem ou param de interagir após 5 minutos."
                        icon={XCircle}
                    />
                    <PainPointCard 
                        title="Tempo Perdido com Curiosos"
                        description="Seus corretores gastam horas respondendo perguntas básicas em vez de focar em fechar vendas."
                        icon={Clock}
                    />
                    <PainPointCard 
                        title="Falta de Dados para Orçar"
                        description="O lead some antes de fornecer Nome, CPF, CEP ou Placa, tornando o lead inútil para o orçamento."
                        icon={Target}
                    />
                </div>
            </section>
            
            <Separator className="container" />

            {/* 3. Solution Flow */}
            <section className="py-16 container max-w-5xl">
                <h2 className="text-3xl font-bold text-center mb-12">A Solução ZapCorretor em 4 Passos</h2>
                
                <div className="space-y-10">
                    <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-secondary/50 rounded-lg">
                        <Zap className="w-10 h-10 text-primary flex-shrink-0" />
                        <div>
                            <h3 className="text-xl font-semibold mb-1">1. Resposta Imediata e Coleta de Dados</h3>
                            <p className="text-muted-foreground">A IA assume a conversa no WhatsApp 24/7, focando em obter os dados essenciais (Nome, CPF, CEP, Placa) para o orçamento do seguro.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-secondary/50 rounded-lg">
                        <Clock className="w-10 h-10 text-yellow-600 flex-shrink-0" />
                        <div>
                            <h3 className="text-xl font-semibold mb-1">2. Follow-up Inteligente de Abandono</h3>
                            <p className="text-muted-foreground">Se o lead parar de responder, a IA envia automaticamente mensagens de follow-up (30 min e 24h) para reengajá-lo e completar a qualificação.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-secondary/50 rounded-lg">
                        <CheckCircle className="w-10 h-10 text-success flex-shrink-0" />
                        <div>
                            <h3 className="text-xl font-semibold mb-1">3. Notificação de Lead Qualificado</h3>
                            <p className="text-muted-foreground">Apenas quando todos os dados necessários são coletados, o corretor recebe um alerta no WhatsApp para assumir a conversa e fechar a venda.</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-8 p-6 bg-secondary/50 rounded-lg">
                        <TrendingUp className="w-10 h-10 text-green-600 flex-shrink-0" />
                        <div>
                            <h3 className="text-xl font-semibold mb-1">4. Dashboard e Remarketing</h3>
                            <p className="text-muted-foreground">Todos os leads (qualificados ou não) são salvos no dashboard com telefone e dados coletados, prontos para filtros, relatórios e exportação para campanhas de remarketing.</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <Separator className="container" />

            {/* 4. Pricing */}
            <section className="py-16 container">
                <h2 className="text-3xl font-bold text-center mb-12">Planos e Preços</h2>
                <p className="text-center text-muted-foreground mb-10">Todos os planos são faturados semestralmente.</p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <PricingCard
                        title="Corretor Individual"
                        price="R$ 297"
                        per="por mês (Faturamento Semestral)"
                        features={[
                            "Acesso total aos recursos de IA",
                            "Dashboard Pessoal de Leads",
                            "Follow-up Automático de Abandono",
                            "Notificações de Qualificação",
                            "Exportação de Leads (se permitido pela Corretora)",
                        ]}
                        isPrimary={false}
                        ctaText="Começar Agora"
                        link="/login"
                    />
                    <PricingCard
                        title="Corretora (Multi-Agente)"
                        price="R$ 197"
                        per="por corretor/mês (Mínimo 3 Corretores)"
                        features={[
                            "Tudo do Plano Individual",
                            "Painel Admin Centralizado",
                            "Gestão de Corretores (Criação/Ativação)",
                            "Configuração de Distribuição de Leads",
                            "Relatórios e Permissões de Exportação",
                        ]}
                        isPrimary={true}
                        ctaText="Fale com um Consultor"
                        link="/login" // Placeholder, ideally a contact form
                    />
                </div>
            </section>
            
            {/* Footer CTA */}
            <section className="py-12 bg-primary dark:bg-primary/90 text-primary-foreground text-center">
                <div className="container">
                    <h2 className="text-3xl font-bold mb-4">Pronto para Transformar Seus Leads?</h2>
                    <p className="text-lg mb-6">Comece a focar no que realmente importa: fechar vendas.</p>
                    <Link to="/login">
                        <Button size="lg" variant="secondary" className="text-lg">
                            Quero Começar Meu Teste Gratuito
                        </Button>
                    </Link>
                </div>
            </section>
        </main>
      </div>
    );
  };

  return <>{renderContent()}</>;
};

export default Index;