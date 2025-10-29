import { requestFunction, requestResponse } from '../hooks/RequestFunction';

export interface MenuItem {
  path: string;
  name: string;
  icon?: string;
  childrens?: MenuItem[];
  newAppState?: string;       // Se valorizzata, il link non naviga ma aggiorna lo state appState
  url_param?: string;
}

export interface SideBarMenuItemsResponse {
  response: requestResponse;
  menuItems?: MenuItem[];
}

export async function getSideBarMenuItems(appState: string): Promise<SideBarMenuItemsResponse> {

  const response = await requestFunction('/auth/api/pages.php', 'GET', 'sideBar_menuItems', { appState });
  
  let menuItems: MenuItem[] = [];
  if (response.success && response.data && response.data.sideBar_menuItems) {
    menuItems = response.data.sideBar_menuItems as MenuItem[];

    return { response, menuItems };
  }
  throw new Error(response.error || response.message || 'Failed to load sidebar menu items');
}


export interface NavBarMenuItemsResponse {
  response: requestResponse;
  menuItems?: MenuItem[];
}


export async function getNavBarMenuItems(appState: string): Promise<NavBarMenuItemsResponse> {
  const response = await requestFunction('/auth/api/pages.php', 'GET', 'navBar_menuItems', { appState });
  
  let menuItems: MenuItem[] = [];
  if (response.success && response.data && response.data.navBar_menuItems) {
    menuItems = response.data.navBar_menuItems as MenuItem[];
    return { response, menuItems };
  }
  throw new Error(response.error || response.message || 'Failed to load navbar menu items');
}

export async function getPagesAppPagesInfo(appState: string = 'init'): Promise<any> {
  const response = await requestFunction('/auth/api/pages.php', 'GET', 'pages_appPagesInfo', { appState });

  let pages: any[] = [];
  
  if (response.success && response.data && response.data.pages) {
    pages = response.data.pages as any[];
    
    return { response, pages };
  }

  throw new Error(response.error || response.message || 'Failed to load page information');
}

export default {
  getSideBarMenuItems,
  getNavBarMenuItems,
  getPagesAppPagesInfo,
};