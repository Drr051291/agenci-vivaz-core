interface MeetingViewerProps {
  content: string;
}

export function MeetingViewer({ content }: MeetingViewerProps) {
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}