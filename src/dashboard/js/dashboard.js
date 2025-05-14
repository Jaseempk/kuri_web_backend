class Dashboard {
    constructor() {
        this.ws = null;
        this.charts = {};
        this.currentMarket = null;
        this.activityLog = [];
        this.maxLogEntries = 100;

        this.initializeWebSocket();
        this.setupEventListeners();
        this.initializeCharts();
    }

    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => {
            console.log('Connected to server');
            this.requestInitialData();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            setTimeout(() => this.initializeWebSocket(), 5000);
        };
    }

    requestInitialData() {
        this.ws.send(JSON.stringify({ type: 'getHealth' }));
    }

    setupEventListeners() {
        const marketSelector = document.getElementById('market-selector');
        marketSelector.addEventListener('change', (e) => {
            this.currentMarket = e.target.value;
            if (this.currentMarket) {
                this.ws.send(JSON.stringify({
                    type: 'subscribe',
                    market: this.currentMarket
                }));
                this.updateCharts();
            }
        });
    }

    initializeCharts() {
        // Market Metrics Chart
        this.charts.marketMetrics = new Chart(
            document.getElementById('market-metrics-chart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Confirmation Time',
                            data: [],
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );

        // Transaction History Chart
        this.charts.transactionHistory = new Chart(
            document.getElementById('transaction-history-chart'),
            {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Transactions',
                            data: [],
                            backgroundColor: 'rgb(54, 162, 235)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );

        // Gas Usage Chart
        this.charts.gasUsage = new Chart(
            document.getElementById('gas-usage-chart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Gas Used',
                            data: [],
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            }
        );

        // Success Rate Chart
        this.charts.successRate = new Chart(
            document.getElementById('success-rate-chart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Success Rate',
                            data: [],
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            min: 0,
                            max: 1
                        }
                    }
                }
            }
        );
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'initial':
                this.handleInitialData(data.data);
                break;
            case 'healthUpdate':
                this.updateSystemHealth(data.data);
                break;
            case 'metricsUpdate':
                this.updateMetrics(data.market, data.data);
                break;
            case 'marketMetrics':
                this.updateMarketMetrics(data.market, data.data);
                break;
        }
    }

    handleInitialData(data) {
        this.updateSystemHealth(data.health);
        this.updateMarketList(data.markets);

        // Initialize metrics for all markets
        for (const [market, metrics] of Object.entries(data.metrics)) {
            this.updateMetrics(market, metrics);
        }
    }

    updateSystemHealth(health) {
        document.getElementById('cpu-usage').textContent = `${(health.cpuUsage * 100).toFixed(1)}%`;
        document.getElementById('memory-usage').textContent = `${health.memoryUsage.toFixed(1)} MB`;
        document.getElementById('network-latency').textContent = `${health.networkLatency}ms`;

        const statusElement = document.getElementById('node-status');
        statusElement.textContent = health.nodeStatus;
        statusElement.className = `text-lg font-bold ${this.getStatusColor(health.nodeStatus)}`;
    }

    getStatusColor(status) {
        switch (status) {
            case 'healthy':
                return 'text-green-600';
            case 'degraded':
                return 'text-yellow-600';
            case 'error':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    }

    updateMarketList(markets) {
        const selector = document.getElementById('market-selector');
        selector.innerHTML = '<option value="">Select a market</option>';

        markets.forEach(market => {
            const option = document.createElement('option');
            option.value = market;
            option.textContent = `Market ${market.slice(0, 6)}...${market.slice(-4)}`;
            selector.appendChild(option);
        });
    }

    updateMetrics(market, metrics) {
        if (market !== this.currentMarket) return;

        const labels = metrics.gasUsage.map(m => moment(m.timestamp).format('HH:mm:ss'));

        // Update Market Metrics Chart
        this.updateChart(this.charts.marketMetrics, {
            labels,
            datasets: [{
                label: 'Confirmation Time',
                data: metrics.confirmationTime.map(m => m.value),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        });

        // Update Transaction History Chart
        this.updateChart(this.charts.transactionHistory, {
            labels,
            datasets: [{
                label: 'Transactions',
                data: metrics.transactionCount.map(m => m.value),
                backgroundColor: 'rgb(54, 162, 235)'
            }]
        });

        // Update Gas Usage Chart
        this.updateChart(this.charts.gasUsage, {
            labels,
            datasets: [{
                label: 'Gas Used',
                data: metrics.gasUsage.map(m => m.value),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        });

        // Update Success Rate Chart
        this.updateChart(this.charts.successRate, {
            labels,
            datasets: [{
                label: 'Success Rate',
                data: metrics.successRate.map(m => m.value),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        });
    }

    updateChart(chart, newData) {
        chart.data.labels = newData.labels;
        chart.data.datasets = newData.datasets;
        chart.update();
    }

    addActivityLogEntry(entry) {
        const tbody = document.getElementById('activity-log-body');
        const row = document.createElement('tr');

        const time = document.createElement('td');
        time.className = 'py-2';
        time.textContent = moment(entry.timestamp).format('HH:mm:ss');

        const market = document.createElement('td');
        market.className = 'py-2';
        market.textContent = `${entry.market.slice(0, 6)}...${entry.market.slice(-4)}`;

        const event = document.createElement('td');
        event.className = 'py-2';
        event.textContent = entry.event;

        const status = document.createElement('td');
        status.className = `py-2 ${this.getStatusColor(entry.status)}`;
        status.textContent = entry.status;

        row.appendChild(time);
        row.appendChild(market);
        row.appendChild(event);
        row.appendChild(status);

        tbody.insertBefore(row, tbody.firstChild);

        // Remove old entries if exceeding max
        while (tbody.children.length > this.maxLogEntries) {
            tbody.removeChild(tbody.lastChild);
        }
    }
}

// Initialize dashboard when the page loads
window.addEventListener('load', () => {
    window.dashboard = new Dashboard();
}); 