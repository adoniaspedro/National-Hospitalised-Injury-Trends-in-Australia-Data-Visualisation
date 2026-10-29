// Using Promise.all to load both CSV files in parallel, then parsing and drawing the line chart once both datasets are ready
Promise.all([
    fetch("data/male_car_driver.csv").then(r => r.text()),
    fetch("data/female_car_driver.csv").then(r => r.text())
])  // load both CSV files in parallel
    .then(([csv1, csv2]) => {
        const parseCSV = (csv) => {
            return csv.trim().split('\n').slice(1).map(line => {
                const [year, value] = line.split(',');
                return {
                    year: +year,
                    hospitalisedInjuries: +value
                };
            }).filter(d => Number.isFinite(d.year) && Number.isFinite(d.hospitalisedInjuries));
        };

        // parse both CSV datasets separately and tag with gender
        let maleData = parseCSV(csv1).sort((a, b) => a.year - b.year).map(d => ({ ...d, gender: 'Male' }));
        let femaleData = parseCSV(csv2).sort((a, b) => a.year - b.year).map(d => ({ ...d, gender: 'Female' }));

        drawLineChart(maleData, femaleData); // draw the line chart with both datasets
    })
    // catch any errors that occur during the loading or parsing of the CSV files
    .catch(error => {
        console.error("Error loading CSV data:", error);
    });

// Function to draw the line chart using D3.js
function drawLineChart(maleData, femaleData) {
    const margin = { top: 50, right: 40, bottom: 60, left: 70 };
    const container = document.getElementById('line-chart');
    const containerWidth = container ? container.clientWidth : 300;
    const totalWidth = Math.max(760, containerWidth);
    const totalHeight = Math.max(420, Math.round(totalWidth * 0.55));
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    // Clear any existing SVG content before drawing
    const svg = d3.select("#line-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Combine both datasets to determine the overall x and y domains
    const allData = maleData.concat(femaleData);

    // Set up x and y scales based on the combined dataset
    const x = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.year))
        .range([0, width]);

    // Set y domain to start at 0 and extend to the maximum hospitalised injuries across both datasets, with some padding
    const y = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.hospitalisedInjuries)])
        .nice()
        .range([height, 0]);

    // Create x and y axes based on the scales
    const years = Array.from(new Set(allData.map(d => d.year)));
    const xAxis = d3.axisBottom(x).ticks(years.length).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y);

    // Add x and y axes to the SVG
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .style("font-size", "15px");

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .style("fill", "#ea7d00")
        .text("Years");

    // Add y-axis to the SVG
    svg.append("g")
        .call(yAxis)
        .style("font-size", "15px");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + -10)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .style("font-size", "25px")
        .style("font-weight", "500")
        .style("font-weight", "bold")
        .style("fill", "#ea7d00")
        .text("Hospitalised Injuries");

    // Add horizontal grid lines (y-axis)
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        )
        // Remove the default axis line and style the grid lines
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line")
            .style("stroke", "#ffb300")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "4,4")
            .style("opacity", 0.7)
        );

    // Add vertical grid lines (x-axis)
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat("")
        )
        // Remove the default axis line and style the grid lines
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll("line")
            .style("stroke", "#ffb300")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "4,4")
            .style("opacity", 0.7)
        );
    
    // Define the line generator function for both datasets
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.hospitalisedInjuries))
        .curve(d3.curveMonotoneX);

    // draw male line
    svg.append("path")
        .datum(maleData)
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);

    // draw female line
    svg.append("path")
        .datum(femaleData)
        .attr("fill", "none")
        .attr("stroke", "lightblue")
        .attr("stroke-width", 2)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", line);

    // Create a tooltip div that will be used to display information on hover
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background-color", "rgba(0, 0, 0, 0.75)")
        .style("color", "#fff")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("opacity", 0);

    // draw circles for male points
    svg.selectAll(".dot-male")
        .data(maleData)
        .enter().append("circle")
        .attr("class", "dot dot-male")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.hospitalisedInjuries))
        .attr("r", 5)
        .attr("fill", "orange")
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`Year: ${d.year}<br/>Gender: ${d.gender}<br/>Hospitalised: ${d.hospitalisedInjuries}`);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    // draw circles for female points
    svg.selectAll(".dot-female")
        .data(femaleData)
        .enter().append("circle")
        .attr("class", "dot dot-female")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.hospitalisedInjuries))
        .attr("r", 3)
        .attr("fill", "lightblue")
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`Year: ${d.year}<br/>Gender: ${d.gender}<br/>Hospitalised: ${d.hospitalisedInjuries}`);
        })
        .on("mousemove", event => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
    
    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-weight", "600")
        .style("fill", "#ea7d00")
        .text("Car Drivers Hospital Injuries Between the Ages of 40-64 (2011–2021)");

    // Add legend
    const legendContainer = d3.select("#line-chart-legend");
    legendContainer.html("");
    legendContainer.append("h3").text("Line Graph Legend");
    
    // Define legend items with labels and corresponding colors
    const legendItems = [
        { label: "Male Drivers", color: "orange" },
        { label: "Female Drivers", color: "lightblue" }
    ];

    // Create legend items
    legendItems.forEach(item => {
    const row = legendContainer.append("div")
        .attr("class", "legend-item");
    
    // Add a colored box for the legend item
    row.append("div")
        .attr("class", "legend-color")
        .style("background-color", item.color);
    
    // Add the label text for the legend item
    row.append("span")
        .text(item.label);
});



}

