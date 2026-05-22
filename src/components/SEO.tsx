import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
}

const BASE = "https://vance.lovable.app";

export const SEO = ({ title, description, path = "/", noIndex, image }: SEOProps) => {
  const fullTitle = title.includes("Advance") ? title : `${title} | Advance`;
  const url = `${BASE}${path}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      {image && <meta property="og:image" content={image} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};

export default SEO;