import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

interface ChartData {
  name: string;
  value: number;
}

interface ChartNodeAttrs {
  type: 'bar' | 'pie';
  data: ChartData[];
  title: string;
}

const ChartComponent = ({ node, updateAttributes, deleteNode }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>(node.attrs.type);
  const [chartTitle, setChartTitle] = useState(node.attrs.title);
  const [dataRows, setDataRows] = useState<ChartData[]>(node.attrs.data || [{ name: '', value: 0 }]);

  const handleSave = () => {
    updateAttributes({
      type: chartType,
      data: dataRows.filter(row => row.name && row.value > 0),
      title: chartTitle,
    });
    setIsEditing(false);
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

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            {node.attrs.type === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Clique em editar para adicionar dados ao gráfico
          </div>
        )}
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Gráfico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título do Gráfico</Label>
              <Input
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                placeholder="Digite o título do gráfico"
              />
            </div>

            <div>
              <Label>Tipo de Gráfico</Label>
              <Select value={chartType} onValueChange={(value: 'bar' | 'pie') => setChartType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dados do Gráfico</Label>
              <div className="space-y-2 mt-2">
                {dataRows.map((row, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Nome"
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={row.value || ''}
                      onChange={(e) => updateRow(index, 'value', parseFloat(e.target.value) || 0)}
                      className="w-32"
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
                className="mt-2"
              >
                Adicionar Linha
              </Button>
            </div>

            <Button onClick={handleSave} className="w-full">
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
