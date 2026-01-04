<?php
// ============================================================
// CONFIGURATION PROXY & SSL & HEADERS
// ============================================================
$opts = array(
    'http' => array( 
        'proxy' => 'tcp://www-cache:3128', 
        'request_fulluri' => true,
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n",
        'ignore_errors' => true
    ),
    'ssl' => array( 'verify_peer' => false, 'verify_peer_name' => false )
);
$context = stream_context_create($opts);

// ============================================================
// 1. GÉOLOCALISATION
// ============================================================
$lat = 48.6822; 
$lon = 6.1611;
$ip = $_SERVER['REMOTE_ADDR'];

$json_geo_content = @file_get_contents("http://ip-api.com/json/" . $ip, false, $context);
$json_geo = json_decode($json_geo_content, true);

if ($json_geo && isset($json_geo['status']) && $json_geo['status'] == 'success') {
    if (strcasecmp($json_geo['city'], 'Nancy') === 0) {
        $lat = $json_geo['lat'];
        $lon = $json_geo['lon'];
    } 
}

// ============================================================
// 2. MÉTÉO (Infoclimat)
// ============================================================
$url_meteo = "https://www.infoclimat.fr/public-api/gfs/xml?_ll=".$lat.",".$lon."&_auth=ARsDFFIsBCZRfFtsD3lSe1Q8ADUPeVRzBHgFZgtuAH1UMQNgUTNcPlU5VClSfVZkUn8AYVxmVW0Eb1I2WylSLgFgA25SNwRuUT1bPw83UnlUeAB9DzFUcwR4BWMLYwBhVCkDb1EzXCBVOFQoUmNWZlJnAH9cfFVsBGRSPVs1UjEBZwNkUjIEYVE6WyYPIFJjVGUAZg9mVD4EbwVhCzMAMFQzA2JRMlw5VThUKFJiVmtSZQBpXGtVbwRlUjVbKVIuARsDFFIsBCZRfFtsD3lSe1QyAD4PZA%3D%3D&_c=19f3aa7d766b6ba91191c8be71dd1ab2";
$xml_string = @file_get_contents($url_meteo, false, $context);
$xml_meteo = $xml_string ? simplexml_load_string($xml_string) : false;

if (!$xml_meteo) {
    $xml_meteo = new SimpleXMLElement('<previsions><echeance timestamp="'.date('Y-m-d').' 12:00:00"></echeance></previsions>');
}

$xslDoc = new DOMDocument();
if (file_exists('Meteo.xsl')) {
    $xslDoc->load('Meteo.xsl');
    $proc = new XSLTProcessor();
    $proc->importStyleSheet($xslDoc);
    $html_meteo = $proc->transformToXML($xml_meteo);
} else {
    $html_meteo = "<html><body><h1>Météo indisponible</h1></body></html>";
}

// ============================================================
// 3. TRAFIC & ADRESSE
// ============================================================
$xmlTraffic = new SimpleXMLElement('<traffic_data/>');
$xmlTraffic->addChild('user_lat', $lat);
$xmlTraffic->addChild('user_lon', $lon);

// API Adresse
$json_addr = @file_get_contents("https://api-adresse.data.gouv.fr/search/?q=2+Ter+Boulevard+Charlemagne+Nancy&limit=1", false, $context);
$data_addr = json_decode($json_addr, true);

if ($data_addr && isset($data_addr['features'][0]['geometry']['coordinates'])) {
    $c = $data_addr['features'][0]['geometry']['coordinates'];
    $poi = $xmlTraffic->addChild('poi');
    $poi->addChild('lat', $c[1]);
    $poi->addChild('lon', $c[0]);
    $poi->addChild('nom', "IUT Nancy-Charlemagne");
}

// API Trafic
$json_trafic = @file_get_contents("https://carto.g-ny.eu/data/cifs/cifs_waze_v2.json", false, $context); 
$data_trafic = json_decode($json_trafic, true);

if ($data_trafic && isset($data_trafic['incidents'])) {
    foreach ($data_trafic['incidents'] as $inc) {
        if (isset($inc['location']['polyline'])) {
            $coords = explode(' ', $inc['location']['polyline']);
            $item = $xmlTraffic->addChild('incident');
            $item->addChild('lat', $coords[0]);
            $item->addChild('lon', $coords[1]);
            $item->addChild('type', htmlspecialchars($inc['type']));
            $item->addChild('description', htmlspecialchars($inc['description']));
            $item->addChild('date_start', date("d/m/Y", strtotime($inc['starttime'])));
            $item->addChild('date_end', date("d/m/Y", strtotime($inc['endtime'])));
        }
    }
}

$xslTrafficDoc = new DOMDocument();
if (file_exists('Traffic.xsl')) {
    $xslTrafficDoc->load('Traffic.xsl');
    $procTraffic = new XSLTProcessor();
    $procTraffic->importStyleSheet($xslTrafficDoc);
    $domTraffic = dom_import_simplexml($xmlTraffic)->ownerDocument;
    $html_traffic = $procTraffic->transformToXML($domTraffic);
} else { $html_traffic = ""; }

// ============================================================
// 4. DONNÉES COVID
// ============================================================
$url_covid = "https://tabular-api.data.gouv.fr/api/resources/2963ccb5-344d-4978-bdd3-08aaf9efe514/data/json/";
$json_covid_content = @file_get_contents($url_covid, false, $context);
$json_covid = json_decode($json_covid_content, true);

$data_to_plot = [];
$station_name = "Grand Nancy";

if ($json_covid && is_array($json_covid)) {
    $data_nancy = array_filter($json_covid, function($item) {
        $n = strtolower($item['nom_station'] ?? $item['ville'] ?? '');
        return strpos($n, 'maxeville') !== false || strpos($n, 'grand nancy') !== false;
    });
    if($data_nancy) {
        $data_to_plot = $data_nancy;
        $station_name = reset($data_nancy)['nom_station'] ?? "Grand Nancy";
    }
}

if(empty($data_to_plot)) {
    for($i=20; $i>0; $i--) $data_to_plot[] = ['date'=>date('Y-m-d', strtotime("-$i weeks")), 'indicateur'=>rand(10,50)];
}

usort($data_to_plot, function($a,$b){ return strtotime($a['date']) - strtotime($b['date']); });
$recent = array_slice($data_to_plot, -26);

$xml_extras = new SimpleXMLElement('<extras></extras>');
$xml_extras->addChild('chart_labels', implode("','", array_map(function($i){return $i['date'];}, $recent)));
$xml_extras->addChild('chart_data', implode(",", array_map(function($i){return $i['indicateur']??0;}, $recent)));
$xml_extras->addChild('station_nom', htmlspecialchars($station_name));

$xslDoc2 = new DOMDocument();
if (file_exists('Covid.xsl')) {
    $xslDoc2->load('Covid.xsl');
    $proc2 = new XSLTProcessor();
    $proc2->importStyleSheet($xslDoc2);
    $html_covid = $proc2->transformToXML($xml_extras);
} else { $html_covid = ""; }



$html_footer = '
<footer class="main-footer">
    <ul>
        <li>Météo : <a href="https://infoclimat.fr" target="_blank">Infoclimat</a></li>
        <li>Trafic : <a href="https://carto.g-ny.eu/data/cifs/cifs_waze_v2.json" target="_blank">Grand Nancy (Waze)</a></li>
        <li>Covid : <a href="https://www.data.gouv.fr/fr/datasets/surveillance-du-sars-cov-2-dans-les-eaux-usees-1/" target="_blank">Data.gouv.fr</a></li>
        <li>Géoloc : <a href="https://ip-api.com" target="_blank">IP-API</a></li>
        <li>Adresse : <a href="https://adresse.data.gouv.fr" target="_blank">Etalab</a></li>
        <li>Git : <a href="https://github.com/Ridzen1/Interop">Projet Git</a></li>

        Réalisé par Clerc Léo et Ryad Haddad
    </ul>
</footer>';

$contenu_complet = $html_traffic . 
                '<hr class="section-separator">' . 
                $html_covid . 
                $html_footer;

echo str_replace('</body>', $contenu_complet . '</body>', $html_meteo);
?>