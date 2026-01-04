let map;
let userLat, userLon;
let meteoTemp = 0;
let meteoWind = 0;
let meteoRain = 0;
let qualiteAir = "Inconnue";

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error("Erreur récupération IP");
        const data = await response.json();

        document.getElementById('user-location').innerHTML = `
            <strong>IP détectée :</strong> ${data.city} (Simulé à Nancy)<br>
        `;

        // Force Nancy
        userLat = 48.68281757087012; 
        userLon = 6.1611022002743425;

        initMap(userLat, userLon);
        
        // Lancement des API
        getVelosNancy();
        getMeteoNancy();
        getPollutionNancy();

    } catch (error) {
        console.error(error);
        // Fallback
        initMap(48.68281757087012, 6.1611022002743425);
        getVelosNancy();
        getMeteoNancy();
        getPollutionNancy();
    }
}

// --- Carte via openstreetmap---
function initMap(lat, lon) {
    if (map) map.remove();

    map = L.map('map').setView([lat, lon], 14);

    // Fond de carte OpenStreetMap classique
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Marqueur utilisateur
    L.marker([lat, lon]).addTo(map)
        .bindPopup("<b>Votre Position</b><br>(Simulée)").openPopup();
}

// --- Vélos ---
async function getVelosNancy() {
    try {
        const urlInfo = "https://api.cyclocity.fr/contracts/nancy/gbfs/station_information.json";
        const urlStatus = "https://api.cyclocity.fr/contracts/nancy/gbfs/station_status.json";

        const [resInfo, resStatus] = await Promise.all([
            fetch(urlInfo),
            fetch(urlStatus)
        ]);

        const dataInfo = await resInfo.json();
        const dataStatus = await resStatus.json();

        const statusMap = {};
        dataStatus.data.stations.forEach(stat => {
            statusMap[stat.station_id] = stat;
        });

        dataInfo.data.stations.forEach(station => {
            const status = statusMap[station.station_id];
            if (status) {
                const popupContent = `
                    <b>${station.name}</b><br>
                    🚲 Vélos: <strong>${status.num_bikes_available}</strong><br>
                    🅿️ Places: <strong>${status.num_docks_available}</strong>
                `;
                L.marker([station.lat, station.lon]).addTo(map).bindPopup(popupContent);
            }
        });
        console.log("Vélos chargés !");
    } catch (error) {
        console.error("Erreur vélos : ", error);
    }
}

// --- Météo ---
async function getMeteoNancy() {
    const weatherContainer = document.getElementById('weather-info');
    try {
        const url = "https://www.infoclimat.fr/public-api/gfs/xml?_ll=48.688135,6.171263&_auth=ARsDFFIsBCZRfFtsD3lSe1Q8ADUPeVRzBHgFZgtuAH1UMQNgUTNcPlU5VClSfVZkUn8AYVxmVW0Eb1I2WylSLgFgA25SNwRuUT1bPw83UnlUeAB9DzFUcwR4BWMLYwBhVCkDb1EzXCBVOFQoUmNWZlJnAH9cfFVsBGRSPVs1UjEBZwNkUjIEYVE6WyYPIFJjVGUAZg9mVD4EbwVhCzMAMFQzA2JRMlw5VThUKFJiVmtSZQBpXGtVbwRlUjVbKVIuARsDFFIsBCZRfFtsD3lSe1QyAD4PZA%3D%3D&_c=19f3aa7d766b6ba91191c8be71dd1ab2";

        const response = await fetch(url);
        if(!response.ok) throw new Error("Erreur HTTP Météo");

        const strXML = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(strXML, "text/xml");

        const echeance = xmlDoc.querySelector('echeance');
        if (!echeance) throw new Error("Pas de données météo");

        const tempK = parseFloat(echeance.querySelector('temperature level[val="sol"]').textContent);
        meteoTemp = (tempK - 273.15).toFixed(1); 
        meteoWind = parseFloat(echeance.querySelector('vent_moyen level[val="10m"]').textContent).toFixed(1);
        meteoRain = parseFloat(echeance.querySelector('pluie').textContent);
        const heure = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

        weatherContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size: 2em;">${meteoTemp}°C</div>
                <div style="text-align:right;">
                    🌬️ Vent: ${meteoWind} km/h<br>
                    ☔ Pluie: ${meteoRain} mm
                </div>
                                    <small style="color:#666">Source: Infoclimat (MàJ : ${heure})</small>

            </div>
            <small style="color:#666">Source: Infoclimat</small>
        `;
        
        console.log("Météo chargée !");
        calculerDecision(); 

    } catch (error) {
        console.error("Erreur Météo:", error);
        weatherContainer.innerHTML = "Météo indisponible.";
    }
}

// --- Pollution ---
async function getPollutionNancy() {
    const pollutionContainer = document.getElementById('pollution-info');
    
    try {
        const url = "https://services3.arcgis.com/Is0UwT37raQYl9Jj/arcgis/rest/services/ind_grandest/FeatureServer/0/query?where=lib_zone%20LIKE%20'%25Nancy%25'&outFields=*&orderByFields=date_ech%20DESC&resultRecordCount=1&f=pjson";

        const response = await fetch(url);
        if (!response.ok) throw new Error("Erreur HTTP Pollution");
        
        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            throw new Error("Aucune donnée trouvée pour Nancy dans l'API");
        }

        const attributes = data.features[0].attributes;
        qualiteAir = attributes.lib_qual;
        const couleur = attributes.couleur;
        
        pollutionContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div>
                    <strong>Qualité de l'air :</strong><br>
                    <span style="font-size: 1.2em; color: ${couleur}; font-weight:bold; text-shadow: 1px 1px 1px #555;">${qualiteAir}</span>
                </div>
            </div>
            <small style="color:#666">Source: ATMO Grand Est</small>
        `;

        console.log("Pollution chargée : " + qualiteAir);
        calculerDecision();

    } catch (error) {
        console.error("Erreur Pollution:", error);
        pollutionContainer.innerHTML = "Pollution indisponible.";
    }
}

// --- Décision ---
function calculerDecision() {
    const container = document.getElementById('decision-result');
    let message = "";
    let color = "";

    if (qualiteAir === "Mauvais" || qualiteAir === "Très mauvais" || qualiteAir === "Extrêmement mauvais") {
        message = "<b>Pic de pollution !</b><br>Évitez l'effort physique. Prenez le Tram ou le Bus.";
        color = "#8e44ad";
    } 
    else if (meteoWind > 50) {
        message = "<b>Vent violent !</b><br>Dangereux en vélo. Privilégiez la marche ou le bus.";
        color = "#e67e22";
    }
    else if (meteoRain > 0.5) {
        message = "<b>Il pleut.</b><br>Ça glisse et ça mouille. Prenez un parapluie mais ne roulez pas.";
        color = "#3498db";
    }
    else if (meteoTemp < 5) {
        message = "<b>Il fait froid.</b><br>Prenez un vélo, mais gants et écharpe obligatoires !";
        color = "#2980b9";
    }
    else {
        message = "<b>Conditions idéales !</b><br>Foncez prendre un Velolib.";
        color = "#2ecc71";
    }

    container.innerHTML = `
        <div style="background-color:${color}; color:white; padding:15px; border-radius:8px; text-align:center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="font-size: 1.2em; margin-bottom: 5px;">${message}</div>
        </div>
    `;
}