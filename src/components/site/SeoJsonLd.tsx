type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function SeoJsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
