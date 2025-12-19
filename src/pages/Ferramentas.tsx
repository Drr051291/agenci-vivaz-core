import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Zap, BarChart3, Target } from "lucide-react";
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
