<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        
        <section id="traffic-section">
            <h3 style="text-align:center; color:#2c3e50; border-bottom: 2px solid #e74c3c; display:inline-block; padding-bottom:5px;">
                Info Trafic Grand Nancy
            </h3>
            
            <div id="map-traffic" style="height: 450px; width: 100%; border-radius: 8px; border: 1px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
        </section>

        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

        <script>
            document.addEventListener("DOMContentLoaded", function() {
                // 1. Récupération des coordonnées (sécurité si vide)
                var userLat = <xsl:choose><xsl:when test="//user_lat"><xsl:value-of select="//user_lat"/></xsl:when><xsl:otherwise>48.692054</xsl:otherwise></xsl:choose>;
                var userLon = <xsl:choose><xsl:when test="//user_lon"><xsl:value-of select="//user_lon"/></xsl:when><xsl:otherwise>6.184417</xsl:otherwise></xsl:choose>;

                // 2. Initialisation de la carte
                var mapTraffic = L.map('map-traffic').setView([userLat, userLon], 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(mapTraffic);

                // Marqueur "Vous êtes ici"
                L.marker([userLat, userLon]).addTo(mapTraffic)
                    .bindPopup("<b>Votre position</b>");

                // 3. Boucle sur les incidents
                // Utilisation des backticks (`) pour supporter les guillemets dans les descriptions
                <xsl:for-each select="traffic_data/incident">
                    L.marker([<xsl:value-of select="lat"/>, <xsl:value-of select="lon"/>])
                        .addTo(mapTraffic)
                        .bindPopup(`
                            <div style="font-family:sans-serif; min-width:200px">
                                <strong style="color:#c0392b;"><xsl:value-of select="type"/></strong><br/>
                                <span style="font-size:0.9em"><xsl:value-of select="description"/></span>
                                <hr style="margin:5px 0; border:0; border-top:1px solid #eee;"/>
                                <small><xsl:value-of select="date_start"/> au <xsl:value-of select="date_end"/></small>
                            </div>
                        `);
                </xsl:for-each>
            });
        </script>

    </xsl:template>
</xsl:stylesheet>