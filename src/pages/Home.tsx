import Layout from "@/components/layout/Layout";
import SitePageRenderer from "@/site-builder/SitePageRenderer";
import { usePublishedSitePage } from "@/site-builder/SiteBuilderProvider";
import { createDefaultSiteBuilderDocument } from "@/site-builder/default-document";

const defaultHomePage = createDefaultSiteBuilderDocument().pages.home;

export default function Home() {
  const publishedHomePage = usePublishedSitePage("home");
  return (
    <Layout>
      <SitePageRenderer page={publishedHomePage ?? defaultHomePage} />
    </Layout>
  );
}
