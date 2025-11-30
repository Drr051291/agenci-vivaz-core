import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const COLOR_THEMES = {
  vivaz: ['#DA60F4', '#A419BC', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
  professional: ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#64748b'],
  vibrant: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
  monochrome: ['#1F1821', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
};

interface ChartData {
  name: string;
  value: number;
}

interface ChartNodeAttrs {
  type: 'bar' | 'pie' | 'line' | 'area' | 'horizontalBar';
  data: ChartData[];
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  yAxisUnit: string;
  seriesName: string;
  colorTheme: keyof typeof COLOR_THEMES;
}

const PERIOD_PRESETS = [
  { label: 'Últimos 7 dias', value: 'last7days' },
  { label: 'Últimos 30 dias', value: 'last30days' },
  { label: 'Últimos 12 meses', value: 'last12months' },
  { label: 'Trimestral', value: 'quarterly' },
];

const ChartComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [chartType, setChartType] = useState<ChartNodeAttrs['type']>(node.attrs.type);
  const [chartTitle, setChartTitle] = useState(node.attrs.title);
  const [xAxisLabel, setXAxisLabel] = useState(node.attrs.xAxisLabel || '');
  const [yAxisLabel, setYAxisLabel] = useState(node.attrs.yAxisLabel || '');
  const [yAxisUnit, setYAxisUnit] = useState(node.attrs.yAxisUnit || '');
  const [seriesName, setSeriesName] = useState(node.attrs.seriesName || 'Valor');
  const [colorTheme, setColorTheme] = useState<keyof typeof COLOR_THEMES>(node.attrs.colorTheme || 'vivaz');
  const [dataRows, setDataRows] = useState<ChartData[]>(node.attrs.data || [{ name: '', value: 0 }]);

  const handleSave = () => {
    updateAttributes({
      type: chartType,
      data: dataRows.filter(row => row.name && row.value > 0),
      title: chartTitle,
      xAxisLabel,
      yAxisLabel,
      yAxisUnit,
      seriesName,
      colorTheme,
    });
    setIsEditing(false);
  };

  const applyPeriodPreset = (preset: string) => {
    const today = new Date();
    let newData: ChartData[] = [];

    switch (preset) {
      case 'last7days':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          newData.push({ name: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), value: 0 });
        }
        setXAxisLabel('Últimos 7 dias');
        break;
      case 'last30days':
        for (let i = 3; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - (i * 7));
          newData.push({ name: `Semana ${4 - i}`, value: 0 });
        }
        setXAxisLabel('Últimas 4 semanas');
        break;
      case 'last12months':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          newData.push({ name: date.toLocaleDateString('pt-BR', { month: 'short' }), value: 0 });
        }
        setXAxisLabel('Últimos 12 meses');
        break;
      case 'quarterly':
        newData = [
          { name: 'Q1', value: 0 },
          { name: 'Q2', value: 0 },
          { name: 'Q3', value: 0 },
          { name: 'Q4', value: 0 },
        ];
        setXAxisLabel('Trimestres');
        break;
    }

    setDataRows(newData);
  };

  const addRow = () => {
    setDataRows([...dataRows, { name: '', value: 0 }]);
  };

  const updateRow = (index: number, field: 'name' | 'value', value: string | number) => {
    const newRows = [...dataRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setDataRows(newRows);
  };

  const removeRow = (index: number) => {
    setDataRows(dataRows.filter((_, i) => i !== index));
  };

  const chartData = node.attrs.data || [];
  const colors = COLOR_THEMES[node.attrs.colorTheme || 'vivaz'];

  const renderChart = (data: ChartData[], height: number = 300) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Clique em editar para adicionar dados ao gráfico
        </div>
      );
    }

    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 20 },
    };

    const xAxisProps = {
      dataKey: "name",
      label: node.attrs.xAxisLabel ? { value: node.attrs.xAxisLabel, position: 'insideBottom', offset: -10 } : undefined,
    };

    const yAxisProps = {
      label: node.attrs.yAxisLabel ? { value: node.attrs.yAxisLabel, angle: -90, position: 'insideLeft' } : undefined,
    };

    const tooltipFormatter = (value: number) => {
      return node.attrs.yAxisUnit ? `${value} ${node.attrs.yAxisUnit}` : value;
    };

    switch (node.attrs.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey="value" fill={colors[0]} name={node.attrs.seriesName || 'Valor'} />
          </BarChart>
        );
      case 'horizontalBar':
        return (
          <BarChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey="value" fill={colors[0]} name={node.attrs.seriesName || 'Valor'} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} name={node.attrs.seriesName || 'Valor'} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.6} name={node.attrs.seriesName || 'Valor'} />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <NodeViewWrapper className="my-6">
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{node.attrs.title || 'Gráfico'}</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={deleteNode}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {renderChart(chartData)}
        </ResponsiveContainer>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Gráfico</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Configurações</TabsTrigger>
              <TabsTrigger value="data">Dados</TabsTrigger>
              <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h3 className="font-semibold text-sm mb-3">📊 Configurações Gerais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Título do Gráfico</Label>
                      <Input
                        value={chartTitle}
                        onChange={(e) => setChartTitle(e.target.value)}
                        placeholder="Ex: Faturamento Mensal"
                      />
                    </div>
                    <div>
                      <Label>Tipo de Gráfico</Label>
                      <Select value={chartType} onValueChange={(value: ChartNodeAttrs['type']) => setChartType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Barras Verticais</SelectItem>
                          <SelectItem value="horizontalBar">Barras Horizontais</SelectItem>
                          <SelectItem value="line">Linhas</SelectItem>
                          <SelectItem value="area">Área</SelectItem>
                          <SelectItem value="pie">Pizza</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <h3 className="font-semibold text-sm mb-3">📐 Configuração dos Eixos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Label Eixo X</Label>
                      <Input
                        value={xAxisLabel}
                        onChange={(e) => setXAxisLabel(e.target.value)}
                        placeholder="Ex: Período, Meses, Categorias"
                      />
                    </div>
                    <div>
                      <Label>Label Eixo Y</Label>
                      <Input
                        value={yAxisLabel}
                        onChange={(e) => setYAxisLabel(e.target.value)}
                        placeholder="Ex: Vendas, Faturamento, Leads"
                      />
                    </div>
                    <div>
                      <Label>Nome da Série</Label>
                      <Input
                        value={seriesName}
                        onChange={(e) => setSeriesName(e.target.value)}
                        placeholder="Ex: Faturamento, Receita"
                      />
                    </div>
                    <div>
                      <Label>Unidade Y (opcional)</Label>
                      <Input
                        value={yAxisUnit}
                        onChange={(e) => setYAxisUnit(e.target.value)}
                        placeholder="Ex: R$, %, un, mil"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <h3 className="font-semibold text-sm mb-3">🎨 Paleta de Cores</h3>
                  <Select value={colorTheme} onValueChange={(value: keyof typeof COLOR_THEMES) => setColorTheme(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vivaz">Vivaz (Roxo/Azul/Verde)</SelectItem>
                      <SelectItem value="professional">Profissional (Azul/Cinza)</SelectItem>
                      <SelectItem value="vibrant">Vibrante (Colorido)</SelectItem>
                      <SelectItem value="monochrome">Monocromático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-3">📅 Período Pré-definido (opcional)</h3>
                  <div className="flex gap-2 flex-wrap">
                    {PERIOD_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyPeriodPreset(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Preenche automaticamente os dados com categorias pré-definidas. Você pode editar os valores na aba "Dados".
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4 mt-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">📊 Dados do Gráfico</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_120px_40px] gap-2 font-medium text-sm text-muted-foreground mb-1">
                    <div>Categoria (Eixo X)</div>
                    <div>Valor (Eixo Y)</div>
                    <div></div>
                  </div>
                  {dataRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-[1fr_120px_40px] gap-2">
                      <Input
                        placeholder="Nome da categoria"
                        value={row.name}
                        onChange={(e) => updateRow(index, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.value || ''}
                        onChange={(e) => updateRow(index, 'value', parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(index)}
                        disabled={dataRows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="mt-3"
                >
                  + Adicionar Linha
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">👁️ Pré-visualização</h3>
                <div className="border border-border rounded-lg p-4 bg-muted/30">
                  <ResponsiveContainer width="100%" height={350}>
                    {renderChart(dataRows.filter(row => row.name && row.value > 0), 350)}
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Esta é uma prévia de como seu gráfico ficará. Ajuste as configurações e dados nas outras abas.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Gráfico
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  );
};

export const ChartExtension = Node.create({
  name: 'chart',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'bar',
      },
      data: {
        default: [],
      },
      title: {
        default: 'Gráfico',
      },
      xAxisLabel: {
        default: '',
      },
      yAxisLabel: {
        default: '',
      },
      yAxisUnit: {
        default: '',
      },
      seriesName: {
        default: 'Valor',
      },
      colorTheme: {
        default: 'vivaz',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartComponent);
  },
});
