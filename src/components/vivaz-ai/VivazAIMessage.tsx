import { Bot, User, Copy, Check, ExternalLink, FileText, Table, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface Source {
  type: string;
  name: string;
  url?: string;
}

interface VivazAIMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export function VivazAIMessage({ role, content, sources, isStreaming }: VivazAIMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <BarChart3 className="h-3 w-3" />;
      case 'meeting':
        return <FileText className="h-3 w-3" />;
      case 'knowledge':
        return <ExternalLink className="h-3 w-3" />;
      default:
        return <Table className="h-3 w-3" />;
    }
  };

  if (role === 'user') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3 border border-border/50">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm">{children}</li>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-border">
                      <table className="min-w-full divide-y divide-border">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-sm whitespace-nowrap">{children}</td>
                  ),
                  tr: ({ children }) => (
                    <tr className="even:bg-muted/30">{children}</tr>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
                        <code className="text-xs font-mono">{children}</code>
                      </pre>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/50 pl-4 italic my-2">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {children}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            
            {isStreaming && (
              <div className="flex items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          {/* Sources */}
          {sources && sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Fontes:</span>
              {sources.map((source, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs py-0 h-5 gap-1 cursor-pointer hover:bg-muted/50"
                >
                  {getSourceIcon(source.type)}
                  {source.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          {!isStreaming && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
