// map.js — D3.js world map with NaturalEarth projection
window.mapModule = (() => {
    let svg, projection, path, g;
    let countriesData = [];
    let countryIsoMap = {};

    const init = async () => {
        const wrapper = document.getElementById('map-svg-wrapper');
        const width = wrapper.clientWidth;
        const height = wrapper.clientHeight;

        svg = d3.select('#map-svg-wrapper')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        projection = d3.geoNaturalEarth1()
            .scale(width / 5.5)
            .translate([width / 2, height / 2]);

        path = d3.geoPath().projection(projection);

        g = svg.append('g');

        // Zoom with click protection
        let dragStartPos = null;
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('start', (event) => {
                if (event.sourceEvent) {
                    dragStartPos = { x: event.sourceEvent.clientX, y: event.sourceEvent.clientY };
                }
            })
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Load world topology
        try {
            const world = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            const countries = topojson.feature(world, world.objects.countries);

            g.selectAll('path.country')
                .data(countries.features)
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', path)
                .attr('fill', d => getCountryColor(+d.id))
                .attr('stroke', '#1a1a2e')
                .attr('stroke-width', 0.5)
                .style('cursor', 'pointer')
                .style('transition', 'fill 0.2s')
                .on('mouseover', function (event, d) {
                    d3.select(this).attr('fill', getCountryHoverColor(+d.id));
                    showTooltip(event, d);
                })
                .on('mousemove', (event) => {
                    moveTooltip(event);
                })
                .on('mouseout', function (event, d) {
                    d3.select(this).attr('fill', getCountryColor(+d.id));
                    hideTooltip();
                })
                .on('click', async (event, d) => {
                    // Prevent click during drag/zoom
                    if (dragStartPos && event.sourceEvent) {
                        const dx = Math.abs(event.sourceEvent.clientX - dragStartPos.x);
                        const dy = Math.abs(event.sourceEvent.clientY - dragStartPos.y);
                        if (dx > 5 || dy > 5) return;
                    }

                    const isoId = +d.id;
                    const country = countryIsoMap[isoId];

                    if (country) {
                        // Country exists in DB → go to detail
                        window.detailModule.showCountry(country.id);
                    } else {
                        // Country not in DB → auto-create it from country-data
                        const countryInfo = window.countryData?.[isoId];
                        if (countryInfo) {
                            await window.appModule.autoCreateCountry({
                                name: countryInfo.name,
                                flag: countryInfo.flag,
                                isoNumeric: isoId,
                                continent: countryInfo.continent
                            });
                        } else {
                            window.appModule.showToast('Bu bölge için veri bulunamadı.', 'warning');
                        }
                    }
                });
        } catch (err) {
            console.error('Map load error:', err);
        }

        // Handle resize
        window.addEventListener('resize', () => {
            const w = wrapper.clientWidth;
            const h = wrapper.clientHeight;
            svg.attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`);
            projection.scale(w / 5.5).translate([w / 2, h / 2]);
            g.selectAll('path.country').attr('d', path);
        });
    };

    const getCountryColor = (isoNumeric) => {
        const country = countryIsoMap[isoNumeric];
        if (country && country.cardCount > 0) return '#4ade80';
        if (country) return '#2d5a3d';
        return '#2a2a2e';
    };

    const getCountryHoverColor = (isoNumeric) => {
        const country = countryIsoMap[isoNumeric];
        if (country && country.cardCount > 0) return '#86efac';
        if (country) return '#3d7a5d';
        return '#3a3a50';
    };

    const getCountryName = (isoId) => {
        // Show Turkish name from country-data
        const info = window.countryData?.[isoId];
        return info?.nameTr || info?.name || null;
    };

    const showTooltip = (event, d) => {
        const tooltip = document.getElementById('map-tooltip');
        const isoId = +d.id;
        const country = countryIsoMap[isoId];
        const countryInfo = window.countryData?.[isoId];

        let name, count;
        if (country) {
            name = `${country.flag} ${country.name}`;
            count = country.cardCount;
        } else if (countryInfo) {
            name = `${countryInfo.flag} ${countryInfo.nameTr}`;
            count = 0;
        } else {
            name = null;
            count = 0;
        }

        if (!name) {
            tooltip.classList.remove('visible');
            return;
        }

        tooltip.innerHTML = `
            <span class="tooltip-name">${name}</span>
            ${count > 0 ? `<span class="tooltip-count">${count} not</span>` : ''}
            ${!country ? '<span class="tooltip-hint">Tıkla → not ekle</span>' : ''}
        `;
        tooltip.classList.add('visible');
        moveTooltip(event);
    };

    const moveTooltip = (event) => {
        const tooltip = document.getElementById('map-tooltip');
        const container = document.getElementById('map-container');
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
    };

    const hideTooltip = () => {
        document.getElementById('map-tooltip').classList.remove('visible');
    };

    const updateData = (countries) => {
        countriesData = countries;
        countryIsoMap = {};
        countries.forEach(c => {
            if (c.isoNumeric) {
                countryIsoMap[c.isoNumeric] = c;
            }
        });

        if (g) {
            g.selectAll('path.country')
                .attr('fill', d => getCountryColor(+d.id));
        }
    };

    return { init, updateData };
})();
