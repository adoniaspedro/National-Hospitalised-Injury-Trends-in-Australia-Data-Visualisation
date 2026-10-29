// Using Promise to load both CSV files simultaneously, then parsing and visualising the data once both are loaded
Promise.all([
    fetch("data/male_motorcyclist.csv").then(r => r.text()),
    fetch("data/female_motorcyclist.csv").then(r => r.text())
])
// Once both CSV files are loaded, parse the data and draw the bar chart
.then(([csv1, csv2]) => {
    const parseCSV = (csv) => {
        return csv.trim().split('\n').slice(1).map(line => {
            const [year, value] = line.split(',');
            return {
                year: year.replace(/"/g, '').trim(),
                value: +value
            };
        }).filter(d => d.year && Number.isFinite(d.value));
    };

    // Parse both CSV datasets separately and tag with gender
    const maleData   = parseCSV(csv1);
    const femaleData = parseCSV(csv2);

    drawMotorcyclistChart(maleData, femaleData); // Draw the bar chart with both datasets
})

// Catch any errors that occur during the loading or parsing of the CSV files
.catch(err => console.error("Failed to load motorcyclist data:", err));

// Function to draw the motorcyclist bar chart using D3.js
function drawMotorcyclistChart(maleData, femaleData) {
    const years  = maleData.map(d => d.year);
    const male   = maleData.map(d => d.value);
    const female = femaleData.map(d => d.value);

    // Combine the data into a single array of objects for easier binding in D3
    const data = years.map((y, i) => ({ year: y, male: male[i], female: female[i] }));

    // Set up the chart container and dimensions
    const container = d3.select('#motorcyclist-bar-chart');

    container.append('h3')
        .attr('class', 'mc-chart-title')
        .text('Motorcyclist Hospitalisations — Age 40–64 (2011–2021)');

    // Create a legend for the bar chart
    const legend = container.append('div').attr('class', 'motorcyclist-legend');

    // Defining legend items for both male and female with corresponding colors
    const maleItem = legend.append('span').attr('class', 'mc-legend-item');
    maleItem.append('span').attr('class', 'mc-legend-swatch').style('background', '#cc5500');
    maleItem.append('span').text('Male');

    const femaleItem = legend.append('span').attr('class', 'mc-legend-item');
    femaleItem.append('span').attr('class', 'mc-legend-swatch').style('background', '#add8e6');
    femaleItem.append('span').text('Female');

    // Create a tooltip div that will be used to display information on hover
    const tooltip = d3.select('body').append('div')
        .attr('id', 'motorcyclist-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background-color', 'rgba(0,0,0,0.75)')
        .style('color', '#fff')
        .style('padding', '6px 10px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('opacity', 0);

    // Set up the dimensions and margins for the SVG container
    const margin = { top: 20, right: 30, bottom: 50, left: 120 };
    const containerEl = document.getElementById('motorcyclist-bar-chart');
    const totalW = Math.max(360, containerEl ? containerEl.clientWidth : 500);
    const totalH = Math.max(300, Math.round(totalW * 0.55));
    const W = totalW - margin.left - margin.right;
    const H = totalH - margin.top - margin.bottom;
    
    // Clear any existing SVG content before drawing
    const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '90%')
        .style('height', 'auto')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up x and y scales based on the data
    const x0 = d3.scaleBand()
        .domain(years)
        .range([0, W])
        .paddingInner(0.2)
        .paddingOuter(0.08);

    // Create a secondary scale for the grouped
    const x1 = d3.scaleBand()
        .domain(['male', 'female'])
        .range([0, x0.bandwidth()])
        .padding(0.06);

    // Set up the y scale based on the maximum
    const y = d3.scaleLinear()
        .domain([0, d3.max(male) * 1.1])
        .nice()
        .range([H, 0]);
    const xAxis = svg.append('g')
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .style('font-size', '15px')
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('text').attr('dy', '1.2em'));

    // X-axis label
    xAxis.append('text')
        .attr('class', 'axis-label')
        .attr('x', W / 2)
        .attr('y', 50)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .style('font-size', '25px')
        .style("fill", "#ea7d00")
        .style('font-weight', 'bold')
        .text('Years');

    const yAxis = svg.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d >= 1000 ? d / 1000 + 'k' : d))
        .style('font-size', '15px')
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('line').attr('stroke', '#ffb300').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4').attr('x2', W));

    // Y-axis label
    yAxis.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -H / 2)
        .attr('y', -52)
        .attr('fill', '#000')
        .attr('text-anchor', 'middle')
        .style('font-size', '25px')
        .style("fill", "#ea7d00")
        .style('font-weight', 'bold')
        .text('Hospitalised  Injuries');

    // Create groups for each year and append rectangles for male and female
    const grp = svg.selectAll('.mc-grp')
        .data(data)
        .join('g')
        .attr('class', 'mc-grp')
        .attr('transform', d => `translate(${x0(d.year)},0)`);

    grp.append('rect')
        .attr('class', 'bar-male')
        .attr('x', x1('male'))
        .attr('width', x1.bandwidth())
        .attr('y', d => y(d.male))
        .attr('height', d => H - y(d.male))
        .attr('rx', 2)
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`Year: ${d.year}<br/>Gender: Male<br/>Hospitalised: ${d.male.toLocaleString()}`);
        })
        .on('mousemove', event => {
            tooltip
                .style('left', `${event.pageX + 12}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0));

    grp.append('rect')
        .attr('class', 'bar-female')
        .attr('x', x1('female'))
        .attr('width', x1.bandwidth())
        .attr('y', d => y(d.female))
        .attr('height', d => H - y(d.female))
        .attr('rx', 2)
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`Year: ${d.year}<br/>Gender: Female<br/>Hospitalised: ${d.female.toLocaleString()}`);
        })
        .on('mousemove', event => {
            tooltip
                .style('left', `${event.pageX + 12}px`)
                .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0));
}