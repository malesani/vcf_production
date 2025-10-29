<?php

$srcPath = $_SERVER["DOCUMENT_ROOT"];
if ($srcPath == "") $srcPath = "/var/www/html";

require_once "$srcPath/vendor/autoload.php";
require_once "$srcPath/lang/lang_obj.php";

$authPath = $srcPath . '/auth';


foreach (glob("$authPath/exceptions/*.php") as $filename) {
    require_once $filename;
}

foreach (glob("$authPath/obj/*.php") as $filename) {
    require_once $filename;
}

foreach (glob("$authPath/funtions/*.php") as $filename) {
    require_once $filename;
}


?>