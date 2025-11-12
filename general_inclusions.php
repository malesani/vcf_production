<?php
    $srcPath = $_SERVER["DOCUMENT_ROOT"];
    if ($srcPath == "") $srcPath = "/var/www/html";

    require_once "$srcPath/auth/obj/authManager.php";
    require_once "$srcPath/auth/obj/permsManager.php";

    require_once "$srcPath/lang/lang_obj.php";


?>