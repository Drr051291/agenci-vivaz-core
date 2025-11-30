import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
  keywords?: string;
}

/**
 * Hook customizado para gerenciar títulos de página e meta tags SEO
 * Define document.title e atualiza meta tags dinamicamente
 */
export const usePageMeta = ({ title, description, keywords }: PageMetaProps) => {
  useEffect(() => {
    // Define o título da página com prefixo HUB Vivaz
    document.title = `${title} | HUB Vivaz`;

    // Atualiza meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    // Atualiza meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", keywords);
    }

    // Define og:title para redes sociais
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", `${title} | HUB Vivaz`);

    // Define og:description
    if (description) {
      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }
      ogDescription.setAttribute("content", description);
    }

    // Cleanup: restaura título padrão ao desmontar
    return () => {
      document.title = "HUB Vivaz";
    };
  }, [title, description, keywords]);
};
