import React from 'react';
import { RouteObject } from 'react-router-dom';
import { getPagesAppPagesInfo } from '../auth_module/pagesManager';
import ProtectedRoute from '../auth_module/ProtectedRoute';
import Skeleton from '../page_structure/Skeleton';
 
// helper function to be moved
function camelToSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}
 
// Import contenuto cartella pages
const pagesModules = import.meta.glob('../pages/*.tsx', { eager: true });
 
const componentMapping: Record<string, React.ComponentType<any>> = {};
Object.keys(pagesModules).forEach((filePath) => {
  const match = filePath.match(/\/([^/]+)\.tsx$/);
  if (match) {
    const fileName = match[1];
    const routeKey = '/' + camelToSnake(fileName);
    componentMapping[routeKey] = (pagesModules[filePath] as any).default;
  }
});
 
/**
 * Restituisce le rotte dinamiche create dal database,
 * includendo sempre la prop `pageName` su ogni componente di pagina.
 */
export async function getDatabaseRoutes(appState: string = 'init'): Promise<RouteObject[]> {
  try {
    const response = await getPagesAppPagesInfo(appState);
    if (response.response.success) {
      const routes: RouteObject[] = response.response.data.pages.map((page: any) => {
        const pageAppState = page.appState || 'init';
        const routePath = page.path; // es. "/procedures/procedure/:id"
 
        // Estrai il segmento chiave ignorando eventuali parametri
        const segments = routePath.split('/').filter((seg: string) => seg.trim() !== '');
        const last = segments[segments.length - 1];
        const keySegment = last.startsWith(':') && segments.length > 1
          ? segments[segments.length - 2]
          : last;
 
        // Deriva la chiave per mappare il componente
        const baseKey = page.pageCodeName ? camelToSnake(page.pageCodeName) : camelToSnake(keySegment);
        const Component = componentMapping[`/${baseKey}`];
 
        // Costruiamo l'elemento con ProtectedRoute e Skeleton
        const element = (
          <ProtectedRoute>
            <Skeleton def_appState={pageAppState}>
              {Component ? <Component pageName={page.name} /> : <div>{page.name}</div>}
            </Skeleton>
          </ProtectedRoute>
        );
 
        return {
          path: routePath,
          element,
        };
      });
      return routes;
    }
    return [];
  } catch (error) {
    console.error('Errore nel caricamento delle rotte DB:', error);
    return [];
  }
}