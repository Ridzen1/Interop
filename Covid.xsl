<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:output method="html" encoding="UTF-8" indent="yes" />

    <xsl:template match="/extras">
        
        <h2 class="section-title">Suivi Sanitaire (Eaux Usées)</h2>

        <div class="covid-wrapper">
            
            <div class="card-covid">
                <h3>Covid-19 : Charge Virale</h3>
                <p>Station : <strong><xsl:value-of select="station_nom"/></strong></p>
                
                <div class="chart-box">
                    <canvas id="covidChart"></canvas>
                </div>
                
                <p class="source-text">
                    Source : Obepine / data.gouv.fr
                </p>
            </div>

        </div>

        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
            document.addEventListener("DOMContentLoaded", function() {
                const ctx = document.getElementById('covidChart');
                const labels = ['<xsl:value-of select="chart_labels" disable-output-escaping="yes"/>'];
                const dataValues = [<xsl:value-of select="chart_data"/>];

                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Indicateur',
                            data: dataValues,
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.2)',
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: { intersect: false, mode: 'index' }
                        },
                        scales: { 
                            x: { display: false }, 
                            y: { beginAtZero: true, grid: { color: '#f0f0f0' } } 
                        }
                    }
                });
            });
        </script>

    </xsl:template>
</xsl:stylesheet>