interface MeetingViewerProps {
  content: string;
}

export function MeetingViewer({ content }: MeetingViewerProps) {
  return (
    <div
      className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}