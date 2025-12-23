import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Zap, BarChart3, Target, Users, Tag, ShoppingBag, FileSpreadsheet, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'active' | 'development';
  path?: string;
}

const tools: Tool[] = [
  {
    id: 'projecao',
    name: 'Projeção de Faturamento',
    description: 'Calcule projeções de receita, investimento e KPIs para E-commerce e WhatsApp.',
    icon: Calculator,
    status: 'active',
    path: '/ferramentas/projecao',
  },
  {
    id: 'dre-projetado',
    name: 'DRE Projetado',
    description: 'Acompanhe margem, EBITDA e projete crescimento com base em receita, pedidos e custos.',
    icon: FileSpreadsheet,
    status: 'active',
    path: '/ferramentas/dre-projetado',
  },
  {
    id: 'matriz-ecommerce',
    name: 'Matriz de Performance — E-commerce',
    description: 'Diagnóstico de funil com taxas de conversão, gargalos e ações recomendadas.',
    icon: ShoppingCart,
    status: 'active',
    path: '/ferramentas/matriz-ecommerce',
  },
  {
    id: 'matriz-inside-sales',
    name: 'Matriz de Performance — Inside Sales',
    description: 'Diagnóstico por etapa do funil com metas e ações recomendadas.',
    icon: Users,
    status: 'active',
    path: '/ferramentas/matriz-inside-sales',
  },
  {
    id: 'precificacao-ml',
    name: 'Calculadora de Precificação — Mercado Livre',
    description: 'Simule taxas, frete e margem para definir o preço ideal por anúncio.',
    icon: Tag,
    status: 'active',
    path: '/ferramentas/precificacao-mercado-livre',
  },
  {
    id: 'precificacao-produto',
    name: 'Calculadora de Precificação — Geral',
    description: 'Calcule margem de contribuição para e-commerce, WhatsApp e venda direta.',
    icon: ShoppingBag,
    status: 'active',
    path: '/ferramentas/precificacao-produto',
  },
  {
    id: 'performance',
    name: 'Análise de Performance',
    description: 'Compare o desempenho entre períodos e canais.',
    icon: BarChart3,
    status: 'development',
  },
  {
    id: 'metas',
    name: 'Planejador de Metas',
    description: 'Defina e acompanhe metas mensais de performance.',
    icon: Target,
    status: 'development',
  },
  {
    id: 'automacoes',
    name: 'Automações',
    description: 'Configure alertas e relatórios automáticos.',
    icon: Zap,
    status: 'development',
  },
];

export default function Ferramentas() {
  usePageMeta({
    title: "Ferramentas | HUB Vivaz",
    description: "Ferramentas de análise e projeção para gestão de performance.",
  });

  const navigate = useNavigate();

  const handleToolClick = (tool: Tool) => {
    if (tool.status === 'active' && tool.path) {
      navigate(tool.path);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ferramentas</h1>
          <p className="text-muted-foreground mt-1">
            Ferramentas de análise e projeção para otimizar sua operação.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isActive = tool.status === 'active';

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'hover:shadow-md hover:border-primary/30'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => handleToolClick(tool)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <Badge 
                        variant={isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {isActive ? 'Ativo' : 'Em desenvolvimento'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-3">{tool.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
