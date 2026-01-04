<?xml version='1.0' encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:output method="html" encoding="UTF-8" indent="yes" />
    <xsl:strip-space elements="*" />

    <xsl:param name="userLat" />
    <xsl:param name="userLon" />
    
    <xsl:variable name="date_du_jour" select="substring(/previsions/echeance[1]/@timestamp, 1, 10)" />

    <xsl:template match="/">
        <html>
            <head>
                <title>Météo du jour : <xsl:value-of select="$date_du_jour"/></title>
                <link rel="stylesheet" type="text/css" href="atmosphere.css"></link>
            </head>
            <body>
                <h2>Prévisions pour le <xsl:value-of select="$date_du_jour"/></h2>
                <table>
                    <tr>
                        <th>Moment</th>
                        <th>Heure</th>
                        <th>Température</th>
                        <th>Vent (Rafales)</th>
                        <th>Pluie</th>
                    </tr>
                    
                    <xsl:apply-templates select="previsions/echeance[
                        contains(@timestamp, $date_du_jour) and
                        (
                            contains(@timestamp, '07:00:00') or 
                            contains(@timestamp, '13:00:00') or 
                            contains(@timestamp, '22:00:00')
                        )
                    ]" />
                </table>
            </body>
        </html>
    </xsl:template>

    <xsl:template match="echeance">
        <tr>
            <td>
                <xsl:choose>
                    <xsl:when test="contains(@timestamp, '07:00:00')">Matin</xsl:when>
                    <xsl:when test="contains(@timestamp, '13:00:00')">Midi</xsl:when>
                    <xsl:when test="contains(@timestamp, '22:00:00')">Soir</xsl:when>
                    <xsl:otherwise>-</xsl:otherwise>
                </xsl:choose>
            </td>
            
            <td><xsl:value-of select="substring(substring-after(@timestamp, ' '), 1, 5)"/></td>

            <td>
                <b><xsl:value-of select="format-number(temperature/level[@val='2m'] - 273.15, '0.0')"/> °C</b>
            </td>

            <td>
                <xsl:value-of select="vent_rafales/level[@val='10m']"/> km/h
            </td>

            <td>
                <xsl:value-of select="pluie"/> mm
            </td>
        </tr>
    </xsl:template>

</xsl:stylesheet>