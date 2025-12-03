import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/contexts/SessionContext";
import { Loader2, Zap, Clock, Target, CheckCircle, ArrowRight, XCircle, TrendingUp, ShieldCheck, MessageSquareText } from "lucide-react";
import React from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/CustomButton";
import { cn } from "@/lib/utils";

// --- Helper Components ---

interface PainPointCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
}

const PainPointCard: React.FC<PainPointCardProps> = ({ title, description, icon: Icon }) => (
    <Card className="text-center p-6 border-destructive/50 bg-destructive/5 dark:bg-destructive/10 rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
        <Icon className="w-8 h-8 text-destructive mx-auto mb-3" />
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardContent className="p-0 pt-2 text-sm text-muted-foreground">
            {description}
        </CardContent>
    </Card>
);

interface FeatureCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, color }) => (
    <Card className="flex flex-col md:flex-row items-start gap-6 p-6 bg-card rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.01] border border-border/50">
        <div className={cn("p-3 rounded-full flex-shrink-0", color)}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <h3 className="text-xl font-semibold mb-1">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
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
    <Card className={cn(
        "flex flex-col h-full rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]",
        isPrimary ? 'border-brand ring-4 ring-brand/50 bg-brand-soft/30' : 'border-border'
    )}>
        <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <p className="text-6xl font-extrabold mt-2 text-primary">{price}</p>
            <p className="text-sm text-muted-foreground">{per}</p>
        </CardHeader>
        <CardContent className="flex-grow space-y-3">
            <Separator />
            <ul className="space-y-3 text-base">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
        <div className="p-6 pt-0">
            <Link to={link} className="block">
                {isPrimary ? (
                    <PrimaryButton size="lg" className="w-full">
                        {ctaText}
                    </PrimaryButton>
                ) : (
                    <SecondaryButton size="lg" className="w-full">
                        {ctaText}
                    </SecondaryButton>
                )}
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-soft dark:bg-gray-900">
            <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
                <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                    Bem-vindo(a) de volta, {profile.full_name}!
                </h1>
                <p className="text-xl text-gray-600 mb-8 dark:text-gray-400">
                    Você está logado como {profile.role}.
                </p>
                <Link to={dashboardLink}>
                    <PrimaryButton size="lg">
                        {dashboardText}
                    </PrimaryButton>
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
            <div className="container flex h-20 items-center justify-between">
                <h1 className="text-3xl font-extrabold text-brand">ZapCorretor</h1>
                <Link to="/login">
                    <SecondaryButton>
                        Login <ArrowRight className="w-4 h-4 ml-2" />
                    </SecondaryButton>
                </Link>
            </div>
        </header>

        <main className="flex-grow">
            {/* 1. Hero Section */}
            <section className="py-24 md:py-36 bg-brand-soft dark:bg-gray-900 text-center">
                <div className="container max-w-5xl mx-auto px-4">
                    <Badge variant="default" className="mb-4 text-sm bg-brand hover:bg-brand/90">
                        Aumente suas Vendas em 40%
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-gray-100 leading-tight">
                        Qualificação de Leads <span className="text-brand">10x Mais Rápida</span> com IA.
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto">
                        O ZapCorretor automatiza a coleta de dados essenciais (Nome, CPF, CEP e Placa), faz o follow-up de abandonos e entrega ao seu corretor apenas leads prontos para orçar.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link to="/login">
                            <PrimaryButton size="lg" className="text-lg px-8 py-6">
                                Comece Seu Teste Gratuito Agora
                            </PrimaryButton>
                        </Link>
                        <Link to="/login">
                            <SecondaryButton size="lg" className="text-lg px-8 py-6">
                                Falar com Vendas
                            </SecondaryButton>
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-muted-foreground">
                        Configuração em menos de 5 minutos. Sem cartão de crédito.
                    </p>
                </div>
            </section>
            
            {/* 2. Pain Points / The Problem */}
            <section className="py-20 container">
                <h2 className="text-4xl font-bold text-center mb-16">Onde Seus Leads Estão Morrendo?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

            {/* 3. Solution Features */}
            <section className="py-20 container max-w-6xl">
                <h2 className="text-4xl font-bold text-center mb-16">Recursos que Transformam Vendas</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FeatureCard 
                        title="IA de Qualificação 24/7"
                        description="Respostas imediatas e focadas na coleta de dados essenciais para o orçamento, garantindo que nenhum lead esfrie."
                        icon={Zap}
                        color="bg-brand"
                    />
                    <FeatureCard 
                        title="Follow-up Automático Inteligente"
                        description="Reengajamento automático de leads que abandonam a conversa, com mensagens estratégicas em 30 minutos e 24 horas."
                        icon={Clock}
                        color="bg-yellow-600"
                    />
                    <FeatureCard 
                        title="Notificação de Lead Pronto"
                        description="Seu corretor só é acionado no WhatsApp quando o lead está 100% qualificado e pronto para receber a proposta."
                        icon={CheckCircle}
                        color="bg-green-600"
                    />
                    <FeatureCard 
                        title="Dashboard Completo e Exportação"
                        description="Visualize o funil de vendas, performance dos agentes e exporte leads qualificados para campanhas de remarketing."
                        icon={TrendingUp}
                        color="bg-purple-600"
                    />
                    <FeatureCard 
                        title="Gestão de Corretores e Permissões"
                        description="Administre sua equipe, defina escalas de atendimento e controle as permissões de exportação de leads."
                        icon={ShieldCheck}
                        color="bg-red-600"
                    />
                    <FeatureCard 
                        title="WhatsApp Central Integrado"
                        description="Conecte seu número central para gerenciar todas as interações e alertas de um único painel."
                        icon={MessageSquareText}
                        color="bg-orange-600"
                    />
                </div>
            </section>
            
            <Separator className="container" />

            {/* 4. Pricing */}
            <section className="py-20 container">
                <h2 className="text-4xl font-bold text-center mb-12">Planos e Preços</h2>
                <p className="text-center text-muted-foreground mb-10">Todos os planos são faturados semestralmente. Teste gratuito por 7 dias.</p>
                
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
            <section className="py-16 bg-brand dark:bg-brand/90 text-brand-foreground text-center">
                <div className="container">
                    <h2 className="text-4xl font-bold mb-4">Pronto para Transformar Seus Leads?</h2>
                    <p className="text-xl mb-8">Comece a focar no que realmente importa: fechar vendas.</p>
                    <Link to="/login">
                        <Button size="lg" variant="secondary" className="text-lg bg-white text-brand hover:bg-gray-100 shadow-xl hover:scale-[1.05] transition-all duration-300">
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