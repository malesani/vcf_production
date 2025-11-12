<?php

require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/authManager.php");
require_once("{$_SERVER['DOCUMENT_ROOT']}/auth/obj/permsManager.php");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

class pagesManager
{
    private $authManager;
    private $permsManager;
    private $conn;

    private $user_uid = "";

    private $pages_info;


    public function __construct(authManager $authManager, permsManager $permsManager, $appState = "init")
    {
        $this->authManager = $authManager;
        $this->permsManager = $permsManager;
        $this->conn = $this->authManager->get_dbConn();

        $permGroups_info = $permsManager->get_permGroupsInfo();

        $this->pages_info = $this->set_pagesInfo($permGroups_info, $appState);
    }

    public function set_pagesInfo($permGroups_info, $appState = "init")
    {
        // Se non ho gruppi, niente pagine
        if (empty($permGroups_info)) {
            return [];
        }

        // Prendo solo le chiavi (i permGroup_uid)
        $permGroupUids = array_keys($permGroups_info);
        $placeholders  = rtrim(str_repeat('?,', count($permGroupUids)), ',');

        $sql = "
            SELECT p.*
            FROM acl_map_permGroups_pages AS m
            JOIN acl_pages AS p
            ON p.page_uid = m.page_uid
            WHERE m.permGroup_uid IN ($placeholders)
            AND (p.appState = ? OR p.appState = 'always')
            AND p.active <> 0
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([...$permGroupUids, $appState]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $pagesInfo = [];
        foreach ($rows as $row) {
            $pagesInfo[$row['page_uid']] = $row;
        }

        return $pagesInfo;
    }

    public function compute_navBar_menuItems()
    {
        $navBar_menuItems = [];

        // FILTER isNavbar Pages and setup 
        $navBar_pages = [];
        foreach ($this->pages_info as $page_uid => $page_info) {
            if (isset($page_info['isNavbar']) && $page_info['isNavbar'] == 1) {
                $navBar_pages[$page_uid] = $page_info;
                $navBar_pages[$page_uid]['baseSlug'] = $this->slugify($page_info['baseSlug'] ?? '');
                $navBar_pages[$page_uid]['slug'] = $this->slugify($page_info['slug']);
                $navBar_pages[$page_uid]['children'] = [];     // setup children as empty
            }
        }
        // end

        // Setup nodes hierarchy
        $nodes = $navBar_pages;
        $tree = [];
        foreach ($nodes as $uid => &$node) {
            if (!empty($node['parent']) && isset($nodes[$node['parent']])) {
                $nodes[$node['parent']]['children'][] = &$node;
            } else {
                $tree[] = &$node;
            }
        }
        unset($node);
        // end

        // Sort top-level nodes by displayOrder
        usort($tree, function ($a, $b) {
            return $a['displayOrder'] <=> $b['displayOrder'];
        });

        // Function : Assign path to page
        $assignPath = function (&$node, $basePath = '') use (&$assignPath) {
            // IF top-level => "/" + slug; ELSE => basePath + "/" + slug
            if (!empty($node['baseSlug'])) {
                $node['path'] = $basePath . '/' . $node['baseSlug'] . '/' . $node['slug'];
            } else {
                $node['path'] = $basePath . '/' . $node['slug'];
            }
            // Order children by displayOrder
            if (!empty($node['children'])) {
                usort($node['children'], function ($a, $b) {
                    return $a['displayOrder'] <=> $b['displayOrder'];
                });
                foreach ($node['children'] as &$child) {
                    $assignPath($child, $node['path']);
                }
            }
        };
        // end

        // Assign path to page for each node in tree
        foreach ($tree as &$node) {
            $assignPath($node);
        }
        unset($node);
        // end

        // FUNCTION : Cleanup node recursively from unused key and setup childrens tree
        $cleanupNode = function (&$node) use (&$cleanupNode) {
            unset($node['slug'], $node['displayOrder'], $node['parent'], $node['page_uid']); // rimuoviamo campi non necessari nel menu
            if (isset($node['children']) && count($node['children']) > 0) {
                $node['childrens'] = $node['children'];
                unset($node['children']);
                foreach ($node['childrens'] as &$child) {
                    $cleanupNode($child);
                }
            } else {
                // Se non ci sono figli, impostiamo "childrens" a un array vuoto
                $node['childrens'] = [];
                unset($node['children']);
            }
        };
        // end

        // Cleanup node recursively from unused key and setup childrens tree
        foreach ($tree as &$node) {
            $cleanupNode($node);
        }
        unset($node);
        // end

        $navBar_menuItems = $tree;

        return $navBar_menuItems;
    }

    public function compute_sideBar_menuItems()
    {
        $sideBar_menuItems = [];

        // FILTER isSidebar Pages and setup 
        $sideBar_pages = [];
        foreach ($this->pages_info as $page_uid => $page_info) {
            if (isset($page_info['isSidebar']) && $page_info['isSidebar'] == 1) {
                $sideBar_pages[$page_uid] = $page_info;
                $sideBar_pages[$page_uid]['baseSlug'] = $this->slugify($page_info['baseSlug'] ?? '');
                $sideBar_pages[$page_uid]['slug'] = $this->slugify($page_info['slug']);
                $sideBar_pages[$page_uid]['children'] = [];     // setup children as empty
            }
        }
        // end

        // Setup nodes hierarchy
        $nodes = $sideBar_pages;
        $tree = [];
        foreach ($nodes as $uid => &$node) {
            if (!empty($node['parent']) && isset($nodes[$node['parent']])) {
                $nodes[$node['parent']]['children'][] = &$node;
            } else {
                $tree[] = &$node;
            }
        }
        unset($node);
        // end

        // Sort top-level nodes by displayOrder
        usort($tree, function ($a, $b) {
            return $a['displayOrder'] <=> $b['displayOrder'];
        });

        // Function : Assign path to page
        $assignPath = function (&$node, $basePath = '') use (&$assignPath) {
            // IF top-level => "/" + slug; ELSE => basePath + "/" + slug
            if (!empty($node['baseSlug'])) {
                $node['path'] = $basePath . '/' . $node['baseSlug'] . '/' . $node['slug'];
            } else {
                $node['path'] = $basePath . '/' . $node['slug'];
            }
            // Order children by displayOrder
            if (!empty($node['children'])) {
                usort($node['children'], function ($a, $b) {
                    return $a['displayOrder'] <=> $b['displayOrder'];
                });
                foreach ($node['children'] as &$child) {
                    $assignPath($child, $node['path']);
                }
            }
        };
        // end

        // Assign path to page for each node in tree
        foreach ($tree as &$node) {
            $assignPath($node);
        }
        unset($node);
        // end

        // FUNCTION : Cleanup node recursively from unused key and setup childrens tree
        $cleanupNode = function (&$node) use (&$cleanupNode) {
            unset($node['slug'], $node['displayOrder'], $node['parent'], $node['page_uid']); // rimuoviamo campi non necessari nel menu
            if (isset($node['children']) && count($node['children']) > 0) {
                $node['childrens'] = $node['children'];
                unset($node['children']);
                foreach ($node['childrens'] as &$child) {
                    $cleanupNode($child);
                }
            } else {
                // Se non ci sono figli, impostiamo "childrens" a un array vuoto
                $node['childrens'] = [];
                unset($node['children']);
            }
        };
        // end

        // Cleanup node recursively from unused key and setup childrens tree
        foreach ($tree as &$node) {
            $cleanupNode($node);
        }
        unset($node);
        // end

        $sideBar_menuItems = $tree;

        return $sideBar_menuItems;
    }

    // GET ALL INFO OF THE PAGES FOR ROUTING FUNCTION
    public function compute_appPagesInfo(bool $extractToIndex = true): array
    {
        // 1) prendo tutte le pagine attive nella sidebar
        $sql = "SELECT * FROM acl_pages WHERE active <> 0";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2) preparo l’array flat, slugifico e preparo campo children
        $nodes = [];
        foreach ($rows as $row) {
            // Verifica se la pagina ha un url_param per il parametro dinamico
            $url_param = isset($row['url_param']) ? $row['url_param'] : '';

            // Costruisci l'URL dinamico
            $url = $this->slugify($row['slug']);
            if ($url_param) {
                // Aggiungi il parametro dinamico
                $url = rtrim($url, '/') . '/:' . $url_param;
            }

            $nodes[$row['page_uid']] = array_merge(
                $row,
                [
                    'baseSlug' => $this->slugify($row['baseSlug'] ?? ''),
                    'slug'     => $url,  // Assegna l'URL dinamico qui
                    'children' => [],
                ]
            );
        }

        // 3) costruisco l’albero
        $tree = $this->buildTree($nodes);

        // 4) assegno i path
        $this->assignPaths($tree);

        // 5) pulisco i nodi
        $this->cleanupNodes($tree);

        if ($extractToIndex) {
            // qui puoi decidere se salvare su un indice esterno o restituire l'array
            return $this->extractToIndex($tree);
        }

        // altrimenti ritorno l'intero albero strutturato
        return $tree;
    }


    // GETTERS:
    public function get_pagesInfo()
    {
        return $this->pages_info;
    }
    // end


    // UTIL FUNCTIONS
    private function slugify($text)
    {

        $text = strtolower($text);  // TO LOWERCASE

        $text = preg_replace('/[^a-z0-9\s\/_-]/', '', $text); // KEEP ONLY ALPHANUMERIC CHARS

        $text = preg_replace('/[\s-]+/', ' ', $text);   // multiple spaces as single space
        $text = trim($text);
        $text = str_replace(' ', '-', $text);   // SPACES TO '-'

        return $text;
    }

    private function buildTree(array &$nodes): array
    {
        $tree = [];
        foreach ($nodes as $uid => &$node) {
            if (!empty($node['parent']) && isset($nodes[$node['parent']])) {
                $nodes[$node['parent']]['children'][] = &$node;
            } else {
                $tree[] = &$node;
            }
        }
        unset($node);

        // ordina i nodi di primo livello per displayOrder
        usort($tree, function ($a, $b) {
            return $a['displayOrder'] <=> $b['displayOrder'];
        });

        return $tree;
    }

    private function assignPaths(array &$nodes, string $basePath = ''): void
    {
        foreach ($nodes as &$node) {
            if (!empty($node['baseSlug'])) {
                $node['path'] = $basePath . '/' . $node['baseSlug'] . '/' . $node['slug'];
            } else {
                $node['path'] = $basePath . '/' . $node['slug'];
            }
            if (!empty($node['children'])) {
                usort($node['children'], function ($a, $b) {
                    return $a['displayOrder'] <=> $b['displayOrder'];
                });
                // ricorsione
                $this->assignPaths($node['children'], $node['path']);
            }
        }
        unset($node);
    }

    private function cleanupNodes(array &$nodes): void
    {
        foreach ($nodes as &$node) {
            unset($node['slug'], $node['displayOrder'], $node['parent'], $node['page_uid']);
            if (!empty($node['children'])) {
                $node['childrens'] = $node['children'];
                unset($node['children']);
                // ricorsione
                $this->cleanupNodes($node['childrens']);
            } else {
                $node['childrens'] = [];
                unset($node['children']);
            }
        }
        unset($node);
    }

    private function extractToIndex(array $nodes): array
    {
        $toIndex = [];
        foreach ($nodes as $node) {
            if (!empty($node['indexed'])) {
                $toIndex[] = $node;
            }
            // se ha figli, scendi ricorsivamente
            if (!empty($node['childrens'])) {
                $toIndex = array_merge($toIndex, $this->extractToIndex($node['childrens']));
            }
        }
        return $toIndex;
    }
    // end

}
