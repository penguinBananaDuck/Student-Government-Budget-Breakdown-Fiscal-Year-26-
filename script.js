// Helper for totals
function getTotal(dataArray, key) {return dataArray.reduce((sum, item) => sum + (item[key] || 0), 0)}

am5.ready(function() {

    // ============================================================
    // Fiscal Year 2026 Graph Builder
    // ============================================================

    // divID = HTML Label, datasetKey = which dataset to use, isExpense = bool to determine key name (revenueAmount vs expenseAmount)
    function buildFY26Graphs(divID, datasetKey, isExpense) {
        
        // 1. Create a Root for THIS specific div
        var root = am5.Root.new(divID);
        
        // Set graph to animate on hover
        root.setThemes([ am5themes_Animated.new(root) ]);  

        // 2. Setup Container
        var mainContainer = root.container.children.push(am5.Container.new(root, {
            layout: root.horizontalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        // 3. Define Keys based on type
        var amountKey = isExpense ? "expenseAmount" : "revenueAmount";
        var typeKey   = isExpense ? "expenseType"   : "revenueType";
        var labelTitle = isExpense ? "TOTAL EXPENSE" : "TOTAL REVENUE";

        // Applies custom colors to bars placed in their color key in the struct
        const applyColor = (graphics, target) => {
            return target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : graphics;
        };

        // --- Bar Chart Setup ---
        var barChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            width: am5.percent(50), 
            layout: root.verticalLayout, 
            paddingRight: 20
        }));
        
        var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: typeKey,
            renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
        }));
        
        yAxis.get("renderer").labels.template.setAll({
            fontSize: 11, 
            fontWeight: "500", 
            maxWidth: 100, 
            oversizedBehavior: "wrap", 
            textAlign: "right", 
            centerY: am5.p50
        });

        var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
            min: 0, extraMax: 0.1, numberFormat: "$#.#a"
        }));

        var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis,
            valueXField: amountKey,
            categoryYField: typeKey,
            sequencedInterpolation: true
        }));
        
        barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });
        barSeries.columns.template.adapters.add("fill", applyColor);
        barSeries.columns.template.adapters.add("stroke", applyColor);

        // --- Bar Graph Bar number Labels ---
        // 1. Allow bullets to bleed outside the chart area
        barSeries.set("maskBullets", false);

        // 2. Add the Text Labels
        barSeries.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationX: 1, // Place it at 100% of the bar's width (the end)
                sprite: am5.Label.new(root, {
                    text: "{valueX.formatNumber('$#.#a')}", // Format: $12.5M
                    centerY: am5.p50,   // Center vertically
                    centerX: am5.p0,    // Anchor to the left (so it grows to the right)
                    populateText: true, // Required to fill in the {} variables
                    paddingLeft: 5,     // Add a little space between bar and text
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: am5.color(0x000000) // Ensure text is black
                })
            });
        });

        // --- Pie Chart Setup ---
        var pieChart = mainContainer.children.push(am5percent.PieChart.new(root, {
            layout: root.verticalLayout, innerRadius: am5.percent(60), width: am5.percent(50)
        }));

        var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
            categoryField: typeKey,
            valueField: amountKey,
            alignLabels: false
        }));
        
        pieSeries.slices.template.setAll({ stroke: am5.color(0xffffff), strokeWidth: 2 });
        pieSeries.slices.template.adapters.add("fill", applyColor);
        pieSeries.slices.template.adapters.add("stroke", applyColor);

        // ----------------------
        //Format pie slice labels
        // ----------------------

        // 1. HIDE THE TICKS (lines pointing to the slice)
        pieSeries.ticks.template.set("forceHidden", true);
        
        // 2. FORMAT LABELS (Only show Percentage)
        pieSeries.labels.template.setAll({
            text: "{valuePercentTotal.formatNumber('#.0')}%", // <--- This removes the category name
            fontSize: 14,         // Make the number nice and readable
            fontWeight: "bold",
            radius: 5,           // Pushes the number slightly away from the slice
            inside: false         // Keeps them on the outside (like your picture)
        });

        // 3. Hide slices < 1.5% of total
        pieSeries.labels.template.adapters.add("forceHidden", function(forceHidden, target) {
            if (target.dataItem.get("valuePercentTotal") < 1.5) {
                return true; 
            }
            return forceHidden;
        });

        // --- FETCH DATA ---
        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {
            
            let currentData = fullData[datasetKey];
            if(!currentData) { console.error("Missing data:", datasetKey); return; }

            // Sort data and thus bars
            currentData.sort((a, b) => a[amountKey] - b[amountKey]);

            // Create Label with calculated total
            let totalVal = getTotal(currentData, amountKey);
            
            pieChart.seriesContainer.children.push(am5.Label.new(root, {
                textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                text: `[fontSize:10px]${labelTitle}[/]\n[bold fontSize:16px]${root.numberFormatter.format(totalVal, "$#.0a")}[/]`
            }));

            // Set Data
            pieSeries.data.setAll(currentData);
            barSeries.data.setAll(currentData);
            yAxis.data.setAll(currentData);

            // Animate
            pieSeries.appear(1000, 100);
            barSeries.appear(1000, 100);
        });

    } 

    // ============================================================
    // Fiscal Year 25 vs Fiscal Year 26 Budget Cuts Graph Builder
    // ============================================================

    // divID25 = HTML Label 1, divID26 = HTML Label 2, datasetKey25 = which 2025 dataset to use,
    // datasetKey26 = which 2026 dataset to use, isExpense = bool to determine key name (revenueAmount vs expenseAmount)
    function buildComparison(divId25, divId26, datasetKey25, datasetKey26, isExpense) {
        
        // 1. Define Dynamic Variable Names
        var amountKey = isExpense ? "expenseAmount" : "revenueAmount";
        var categoryKey = isExpense ? "expenseType" : "revenueType"; // or just expenseType if your JSON uses that for everything
        var labelBase = isExpense ? "EXPENSE" : "REVENUE";

        // 2. Fetch Data
        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {
            
            let data25 = fullData[datasetKey25];
            let data26 = fullData[datasetKey26];

            if (!data25 || !data26) { console.error(`Missing data: ${datasetKey25} or ${datasetKey26}`); return; }

            // 3. Sort Data (High to Low)
            data25.sort((a, b) => a[amountKey] - b[amountKey]);
            data26.sort((a, b) => a[amountKey] - b[amountKey]);

            // 4. Calculate Grand Totals for the Center Label Math
            let total25 = getTotal(data25, amountKey);
            let total26 = getTotal(data26, amountKey);
            
            // Calculate % Change: ((New - Old) / Old) * 100
            let diffRaw = ((total26 - total25) / total25) * 100;
            let diffPct = diffRaw.toFixed(1);
            let diffColor = diffRaw >= 0 ? "[#109618]" : "[#e31a1c]"; // Green or Red
            let diffSign = diffRaw >= 0 ? "+" : ""; // Add plus sign for positives
            
            // ====================================================
            // INTERNAL HELPER: Builds one chart (25 or 26)
            // ====================================================
            function createSubChart(divID, data, year, showChange) {
                
                var root = am5.Root.new(divID);
                root.setThemes([am5themes_Animated.new(root)]);

                var container = root.container.children.push(am5.Container.new(root, {
                    layout: root.horizontalLayout, width: am5.percent(100), height: am5.percent(100)
                }));

                // --- 1. BAR CHART ---
                var barChart = container.children.push(am5xy.XYChart.new(root, {
                    width: am5.percent(60), layout: root.verticalLayout, paddingRight: 50, paddingLeft: 10
                }));

                var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
                    categoryField: categoryKey,
                    renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
                }));

                yAxis.get("renderer").labels.template.setAll({
                    fontSize: 11, fontWeight: "500", maxWidth: 140, oversizedBehavior: "wrap", textAlign: "right", centerY: am5.p50, paddingRight: 5
                });

                var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
                    renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
                    min: 0, extraMax: 0.2, numberFormat: "#.#a"
                }));

                var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
                    xAxis: xAxis, yAxis: yAxis, valueXField: amountKey, categoryYField: categoryKey, sequencedInterpolation: true
                }));

                // Color Adapter
                barSeries.columns.template.adapters.add("fill", (fill, target) => target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : fill);
                barSeries.columns.template.adapters.add("stroke", (stroke, target) => target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : stroke);
                barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });

                // ---  BAR BULLETS SECTION ---
                barSeries.set("maskBullets", false);
                barSeries.bullets.push(function() {
                    // Create the Label
                    var label = am5.Label.new(root, {
                        text: "{valueX.formatNumber('$#.#a')}", // Default text
                        centerY: am5.p50, 
                        centerX: am5.p0, 
                        paddingLeft: 5, 
                        fontSize: 12, 
                        fontWeight: "bold",                         
                        populateText: true
                    });

                    // Add the Adapter 
                    label.adapters.add("text", function(text, target) {
                        if (!target.dataItem?.dataContext) return text;
                        
                        let val = target.dataItem.dataContext[amountKey];
                        let formatted = root.numberFormatter.format(val, "$#.0a");
                            
                        // Check if we need to show change (only for 2026)
                        let change = target.dataItem.dataContext.percentChange; 

                        if (showChange && change !== undefined) {
                            let cColor = change >= 0 ? "[#109618]" : "[#e31a1c]";
                            let cSign = change >= 0 ? "+" : "";

                            return `${formatted}  ${cColor}(${cSign}${change}%)[/]`;
                        }

                            return formatted;
                        });

                    return am5.Bullet.new(root, {
                        locationX: 1,
                        sprite: label
                    });
                });

                // --- 2. PIE CHART ---
                var pieChart = container.children.push(am5percent.PieChart.new(root, {
                    layout: root.verticalLayout, innerRadius: am5.percent(60), width: am5.percent(40), radius: am5.percent(80)
                }));

                var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
                    categoryField: categoryKey, valueField: amountKey, alignLabels: false
                }));

                // Show Pie Slice Cattegory on hover
                pieSeries.slices.template.setAll({ 
                    stroke: am5.color(0xffffff), 
                    strokeWidth: 2, 
                // This string tells the chart: "Show Category Name: Show Percentage%"
                tooltipText: "{category}: {valuePercentTotal.formatNumber('#.00')}%" 
                });

                pieSeries.slices.template.adapters.add("fill", (fill, target) => target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : fill);
                pieSeries.slices.template.adapters.add("stroke", (stroke, target) => target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : stroke);
                
                // Labels (Only % around the ring)
                pieSeries.labels.template.setAll({ text: "{valuePercentTotal.formatNumber('#.0')}%", fontSize: 11, fontWeight: "bold", radius: 5, inside: false });
                pieSeries.ticks.template.set("forceHidden", true);
                // Hide small slices
                pieSeries.labels.template.adapters.add("forceHidden", (forceHidden, target) => target.dataItem.get("valuePercentTotal") < 3 ? true : forceHidden);

                // --- PIE CENTER LABEL ---
                let centerText = "";
                let totalFormatted = root.numberFormatter.format(year === 2025 ? total25 : total26, "$#.0a");
                
                if (showChange) {
                    // FY26 Label with Comparison
                    centerText = `[fontSize:10px]TOTAL ${year}\n${labelBase}[/]\n[bold fontSize:18px]${totalFormatted}[/]\n${diffColor}${diffSign}${diffPct}% vs 2025[/]`;
                } else {
                    // FY25 Label Standard
                    centerText = `[fontSize:10px]TOTAL ${year}\n${labelBase}[/]\n[bold fontSize:18px]${totalFormatted}[/]`;
                }

                pieChart.seriesContainer.children.push(am5.Label.new(root, {
                    textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                    text: centerText
                }));

                // --- SET DATA ---
                yAxis.data.setAll(data);
                barSeries.data.setAll(data);
                pieSeries.data.setAll(data);

                barSeries.appear(1000, 100);
                pieSeries.appear(1000, 100);

            } // end createSubChart

            // 5. CALL THE BUILDERS
            // Build 2025 (No change indicators)
            createSubChart(divId25, data25, 2025, false);

            // Build 2026 (With change indicators)
            createSubChart(divId26, data26, 2026, true);
        });
    }

    // ============================================================
    // Student Fees Graph Builders
    // ============================================================

    function buildStudentFeesTotals(divID, datasetKey) {

        var root = am5.Root.new(divID);
        root.setThemes([am5themes_Animated.new(root)]);

        const applyColor = (fill, target) => target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : fill;

        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            layout: root.verticalLayout,
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 20
        }));

        var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 })
        }));

        xAxis.get("renderer").labels.template.setAll({
            fontSize: 12,
            fontWeight: "500",
            maxWidth: 160,
            oversizedBehavior: "wrap",
            textAlign: "center",
            centerX: am5.p50,
            paddingTop: 8
        });

        var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            min: 0,
            extraMax: 0.2,
            numberFormat: "$#.0a"
        }));

        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "amount",
            categoryXField: "category",
            sequencedInterpolation: true
        }));

        series.columns.template.setAll({
            cornerRadiusTL: 6,
            cornerRadiusTR: 6,
            strokeOpacity: 0
        });

        series.columns.template.adapters.add("fill", applyColor);
        series.columns.template.adapters.add("stroke", applyColor);

        series.set("maskBullets", false);
        series.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationY: 1,
                sprite: am5.Label.new(root, {
                    text: "{valueY.formatNumber('$#.0a')}",
                    populateText: true,
                    centerX: am5.p50,
                    centerY: am5.p100,
                    dy: -10,
                    fontSize: 14,
                    fontWeight: "bold",
                    fill: am5.color(0x000000)
                })
            });
        });

        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {

            let currentData = fullData[datasetKey];
            if(!currentData) { console.error("Missing data:", datasetKey); return; }

            series.data.setAll(currentData);
            xAxis.data.setAll(currentData);

            series.appear(1000, 100);
        });

    }

    function buildFeesBreakdown(divID, datasetKey, labelTitle) {

        var root = am5.Root.new(divID);
        root.setThemes([ am5themes_Animated.new(root) ]);

        var mainContainer = root.container.children.push(am5.Container.new(root, {
            layout: root.horizontalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        const applyColor = (graphics, target) => {
            return target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : graphics;
        };

        var barChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            width: am5.percent(70),
            layout: root.verticalLayout,
            paddingRight: 90,
            paddingLeft: 10
        }));

        var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
        }));

        yAxis.get("renderer").labels.template.setAll({
            fontSize: 11,
            fontWeight: "500",
            maxWidth: 170,
            oversizedBehavior: "wrap",
            textAlign: "right",
            centerY: am5.p50,
            paddingRight: 5
        });

        var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
            min: 0, extraMax: 0.25, numberFormat: "$#.0a"
        }));

        var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis,
            valueXField: "amount",
            categoryYField: "category",
            sequencedInterpolation: true
        }));

        barSeries.columns.template.adapters.add("fill", applyColor);
        barSeries.columns.template.adapters.add("stroke", applyColor);
        barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });

        barSeries.set("maskBullets", false);
        barSeries.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationX: 1,
                sprite: am5.Label.new(root, {
                    text: "{valueX.formatNumber('$#.0a')}",
                    centerY: am5.p50,
                    centerX: am5.p0,
                    populateText: true,
                    paddingLeft: 5,
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: am5.color(0x000000)
                })
            });
        });

        var pieChart = mainContainer.children.push(am5percent.PieChart.new(root, {
            layout: root.verticalLayout, innerRadius: am5.percent(60), width: am5.percent(30), radius: am5.percent(85)
        }));

        var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
            categoryField: "category",
            valueField: "amount",
            alignLabels: false
        }));

        pieSeries.slices.template.setAll({
            stroke: am5.color(0xffffff),
            strokeWidth: 2,
            tooltipText: "{category}: {valuePercentTotal.formatNumber('#.00')}%"
        });

        pieSeries.slices.template.adapters.add("fill", applyColor);
        pieSeries.slices.template.adapters.add("stroke", applyColor);

        pieSeries.labels.template.setAll({ text: "{valuePercentTotal.formatNumber('#.0')}%", fontSize: 11, fontWeight: "bold", radius: 5, inside: false });
        pieSeries.ticks.template.set("forceHidden", true);
        pieSeries.labels.template.adapters.add("forceHidden", (forceHidden, target) => target.dataItem.get("valuePercentTotal") < 1.5 ? true : forceHidden);

        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {

            let currentData = fullData[datasetKey];
            if(!currentData) { console.error("Missing data:", datasetKey); return; }

            currentData.sort((a, b) => a.amount - b.amount);
            let totalVal = getTotal(currentData, "amount");

            pieChart.seriesContainer.children.push(am5.Label.new(root, {
                textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                text: `[fontSize:10px]${labelTitle}[/]\n[bold fontSize:16px]${root.numberFormatter.format(totalVal, "$#.0a")}[/]`
            }));

            pieSeries.data.setAll(currentData);
            barSeries.data.setAll(currentData);
            yAxis.data.setAll(currentData);

            pieSeries.appear(1000, 100);
            barSeries.appear(1000, 100);
        });

    }

    function buildStudentFeesTable(containerId, totalsKey, mandatoryKey, programKey) {

        var el = document.getElementById(containerId);
        if (!el) return;

        const fmtMoney = (n) => {
            let num = Number(n || 0);
            return "$ " + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const byOrder = (order) => {
            let pos = new Map(order.map((x, i) => [x, i]));
            return (a, b) => (pos.has(a.category) ? pos.get(a.category) : 999) - (pos.has(b.category) ? pos.get(b.category) : 999);
        };

        const mandatoryOrder = [
            "Advising Fee",
            "Athletic Program Fee",
            "Green Fee",
            "Information Technology Fee",
            "Infrastructure Fee",
            "Library Acquisition Fee",
            "Medical Services Fee",
            "Recreation Fee",
            "Student Business Services Fee",
            "Student Services Fee",
            "Student Services Building Fee",
            "Student Union Fee",
            "Transportation Fee",
            "Exemption"
        ];

        const programOrder = [
            "Application Fee",
            "Bursar Fees, Late Fees",
            "Chec Collin County",
            "CPT Fee Sharing",
            "Credit Card Services Fee",
            "EIPP Fee - Indust Practice Pgm",
            "Faculty Led Student Fee",
            "Ftrip Fee - Geosciences",
            "Ftrip Fee - JSOM Study Abroad",
            "General Studies Distance Education Fee",
            "Global MBA Distance Fee",
            "International Education Fee",
            "International Student Special Serv Fee",
            "International Travel Ins Fee",
            "Library Fines/Lost Book Fund",
            "Online Services Fee",
            "Physical Instruction Fee",
            "Practice Training Fee",
            "Record Late/Reinstatement Fee",
            "Records Processing Fee",
            "SA Fee - Application",
            "Student Teaching Fee"
        ];

        fetch("data.json")
        .then(r => r.json())
        .then(fullData => {

            let totals = fullData[totalsKey] || [];
            let mandatory = (fullData[mandatoryKey] || []).slice().sort(byOrder(mandatoryOrder));
            let program = (fullData[programKey] || []).slice().sort(byOrder(programOrder));

            let totalsMap = new Map(totals.map(x => [x.category, x.amount]));

            let netTuition = totalsMap.get("Net Tuition") || 0;
            let labSupp = totalsMap.get("Laboratory & Supplemental Fees") || 0;
            let mandatoryTotal = totalsMap.get("Mandatory Fee") || 0;
            let programTotal = totalsMap.get("Program, Course Related & Other Fees") || 0;
            let grandTotal = netTuition + labSupp + mandatoryTotal + programTotal;

            let html = "";
            html += `<div class="fees-row fees-head"><div>Division</div><div class="fees-num">Total</div></div>`;

            html += `<div class="fees-row fees-section"><div>Net Tuition</div><div class="fees-num">${fmtMoney(netTuition)}</div></div>`;
            html += `<div class="fees-row"><div>Laboratory & Supplemental Fees</div><div class="fees-num">${fmtMoney(labSupp)}</div></div>`;

            html += `<div class="fees-row fees-section"><div>Mandatory Fee</div><div class="fees-num">${fmtMoney(mandatoryTotal)}</div></div>`;
            for (let item of mandatory) {
                html += `<div class="fees-row fees-sub"><div>${item.category}</div><div class="fees-num">${fmtMoney(item.amount)}</div></div>`;
            }

            html += `<div class="fees-row fees-section"><div>Program, Course Related & Other Fees</div><div class="fees-num">${fmtMoney(programTotal)}</div></div>`;
            for (let item of program) {
                html += `<div class="fees-row fees-sub"><div>${item.category}</div><div class="fees-num">${fmtMoney(item.amount)}</div></div>`;
            }

            html += `<div class="fees-row fees-total"><div>Total Tuition and Student Fees</div><div class="fees-num">${fmtMoney(grandTotal)}</div></div>`;

            el.innerHTML = html;
        });

    }

    // ============================================================
    // EXECUTE (Only if elements exist)
    // ============================================================
    

    // ============================================================
    // Page: Fall 25 - Spring 26 Budget 
    // ============================================================

    //FY26 Operating Revenue
    if (document.getElementById("chart_Operating_Revenue26")) {
        // Graph 1: -> goes into <div id="chart_Operating_Revenue26">
        buildFY26Graphs("chart_Operating_Revenue26", "FY26_Operating_Revenue", false);
    }

    //FY26 Non-operating Revenue
    if (document.getElementById("chart_Non-operating_Revenue26")) {
        // Graph 2: -> goes into <div id="Operating_Revenue26">
        buildFY26Graphs("chart_Non-operating_Revenue26", "FY26_Non-operating_Revenue", false);
    }

    //FY26 Expense
    if (document.getElementById("chart_Expense26")) {
        buildFY26Graphs("chart_Expense26", "FY26_Expense", true);
    }


    // ============================================================
    // Page: Budget Cuts
    // ============================================================

    // 1. Operating Revenue Comparison
    if (document.getElementById("chart_Operating_Revenue25") && document.getElementById("chart_Operating_RevenueChange26")) {
        buildComparison("chart_Operating_Revenue25", "chart_Operating_RevenueChange26", "FY25_Operating_Revenue", "FY26_Operating_Revenue", false);
    }

    // 2. Non-Operating Revenue Comparison
    if (document.getElementById("chart_Non-operating_Revenue25") && document.getElementById("chart_Non-operating_RevenueChange26")) {
        buildComparison("chart_Non-operating_Revenue25", "chart_Non-operating_RevenueChange26", "FY25_Non-operating_Revenue", "FY26_Non-operating_Revenue", false);
    }

    // 3. Expense Comparison
    if (document.getElementById("chart_Expense25") && document.getElementById("chart_ExpenseChange26")) {
        buildComparison("chart_Expense25", "chart_ExpenseChange26", "FY25_Expense", "FY26_Expense", true);
    }

    // ============================================================
    // Page: Student Fees
    // ============================================================

    if (document.getElementById("chart_StudentFeesTotals")) {
        buildStudentFeesTotals("chart_StudentFeesTotals", "FY26_TuitionAndStudentFees_Totals");
    }

    if (document.getElementById("chart_StudentFeesOverview")) {
        buildFeesBreakdown("chart_StudentFeesOverview", "FY26_TuitionAndStudentFees_Totals", "TOTAL REVENUE");
    }

    if (document.getElementById("chart_MandatoryFeeBreakdown")) {
        buildFeesBreakdown("chart_MandatoryFeeBreakdown", "FY26_MandatoryFees", "TOTAL MANDATORY");
    }

    if (document.getElementById("chart_ProgramFeesBreakdown")) {
        buildFeesBreakdown("chart_ProgramFeesBreakdown", "FY26_ProgramCourseOtherFees", "TOTAL PROGRAM");
    }

    if (document.getElementById("studentFeesTable")) {
        buildStudentFeesTable("studentFeesTable", "FY26_TuitionAndStudentFees_Totals", "FY26_MandatoryFees", "FY26_ProgramCourseOtherFees");
    }

});
