/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "@/providers/trpc";
import type { PublicPageKey, SiteBuilderDocument, SitePage } from "./schema";

type SiteBuilderContextValue = {
  document: SiteBuilderDocument | null;
  revision: number;
  isLoading: boolean;
};

const SiteBuilderContext = createContext<SiteBuilderContextValue>({ document: null, revision: 0, isLoading: true });

export function SiteBuilderProvider({ children }: { children: ReactNode }) {
  const query = trpc.siteBuilder.published.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  return (
    <SiteBuilderContext.Provider value={{
      document: query.data?.document ?? null,
      revision: query.data?.revision ?? 0,
      isLoading: query.isLoading,
    }}>
      {children}
    </SiteBuilderContext.Provider>
  );
}

export function usePublishedSiteBuilder() {
  return useContext(SiteBuilderContext);
}

export function usePublishedSitePage(pageKey?: PublicPageKey): SitePage | null {
  const { document } = usePublishedSiteBuilder();
  if (!pageKey || !document) return null;
  return document.pages[pageKey] ?? null;
}
